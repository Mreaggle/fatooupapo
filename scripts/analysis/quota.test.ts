// @vitest-environment node
import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { creditWindowMs, estimateCredits, mvpCalibration } from '../../src/lib/analysis-credits.ts'
import { parseTranscript } from './transcript.ts'
import { chargeRequest, ledgerSchema } from './quota.ts'

const input = { issueNumber: 1, userId: 123, login: 'teste', videoId: 'dQw4w9WgXcQ', transcriptHash: 'a'.repeat(64), referenceDate: '2024-10-01', durationSeconds: 10800, textCharacters: 196216, fileBytes: 390242, now: 1_000_000 }

describe('calibração e custo determinístico', () => {
  it('confere a referência com o arquivo original do MVP', () => {
    const source = readFileSync(`mvp/${readdirSync('mvp').find((file) => file.endsWith('.srt'))}`, 'utf8')
    const cues = parseTranscript(source)
    expect(Buffer.byteLength(source)).toBe(mvpCalibration.fileBytes)
    expect(cues.map((cue) => cue.text).join(' ').length).toBe(mvpCalibration.textCharacters)
    expect(cues.at(-1)!.end).toBe(mvpCalibration.durationSeconds)
    expect(estimateCredits({ durationSeconds: mvpCalibration.durationSeconds, textCharacters: mvpCalibration.textCharacters, fileBytes: mvpCalibration.fileBytes }).credits).toBe(100)
  })

  it('cobra a cota inteira a partir de 3h e recusa mais de 4h', () => {
    expect(estimateCredits({ durationSeconds: 10800 }).credits).toBe(100)
    expect(estimateCredits({ durationSeconds: 14400 }).credits).toBe(100)
    expect(() => estimateCredits({ durationSeconds: 14401 })).toThrow()
  })

  it('mantém custo previsível e aumenta com a duração, texto ou peso', () => {
    expect(estimateCredits({ durationSeconds: 1800 }).credits).toBe(20)
    expect(estimateCredits({ durationSeconds: 3600 }).credits).toBe(40)
    expect(estimateCredits({ durationSeconds: 7200 }).credits).toBe(70)
    const short = { durationSeconds: 600, textCharacters: 100, fileBytes: 200 }
    expect(estimateCredits(short).credits).toBe(10)
    expect(estimateCredits({ ...short, textCharacters: 196216 }).credits).toBe(100)
    expect(estimateCredits({ ...short, fileBytes: 390242 }).credits).toBe(100)
    expect(estimateCredits(short)).toEqual(estimateCredits(short))
  })
})

describe('cota por identidade autenticada no GitHub', () => {
  it('debita uma única vez e permite retomar o mesmo pedido sem cobrar', () => {
    const first = chargeRequest(ledgerSchema.parse({ version: 1, users: {}, requests: {} }), input)
    expect(first.receipt.credits).toBe(100)
    expect(first.ledger.users['123'].spent).toBe(100)
    const resumed = chargeRequest(first.ledger, { ...input, now: input.now + 1000 })
    expect(resumed.changed).toBe(false)
    expect(resumed.ledger.users['123'].spent).toBe(100)
  })

  it('nega um segundo vídeo e só renova após 24 horas completas', () => {
    const first = chargeRequest(ledgerSchema.parse({ version: 1, users: {}, requests: {} }), input)
    const second = { ...input, videoId: 'q4T7plSBdJE', issueNumber: 2 }
    expect(() => chargeRequest(first.ledger, { ...second, now: input.now + creditWindowMs - 1 })).toThrow(/Créditos insuficientes/)
    const renewed = chargeRequest(first.ledger, { ...second, now: input.now + creditWindowMs })
    expect(renewed.changed).toBe(true)
    expect(renewed.ledger.users['123'].spent).toBe(100)
    expect(renewed.ledger.users['123'].windowStartedAt).toBe(input.now + creditWindowMs)
  })

  it('soma vídeos curtos e mantém contas independentes', () => {
    const short = { ...input, durationSeconds: 1800, textCharacters: 200, fileBytes: 1000 }
    const first = chargeRequest(ledgerSchema.parse({ version: 1, users: {}, requests: {} }), short)
    const second = chargeRequest(first.ledger, { ...short, issueNumber: 2, videoId: 'q4T7plSBdJE' })
    expect(second.ledger.users['123'].spent).toBe(40)
    const third = chargeRequest(second.ledger, { ...short, userId: 456, login: 'outra-conta', issueNumber: 3, videoId: 'aaaaaaaaaaa' })
    expect(third.ledger.users['456'].spent).toBe(20)
  })

  it('não contorna a cota trocando o login, a legenda ou a duração de um pedido', () => {
    const first = chargeRequest(ledgerSchema.parse({ version: 1, users: {}, requests: {} }), input)
    expect(() => chargeRequest(first.ledger, { ...input, issueNumber: 2, videoId: 'q4T7plSBdJE', login: 'novo-login' })).toThrow(/Créditos insuficientes/)
    expect(() => chargeRequest(first.ledger, { ...input, transcriptHash: 'b'.repeat(64) })).toThrow(/mudou após o débito/)
    expect(() => chargeRequest(first.ledger, { ...input, durationSeconds: 1000 })).toThrow(/mudou após o débito/)
    expect(() => chargeRequest(first.ledger, { ...input, userId: 456 })).toThrow(/mudou após o débito/)
  })

  it('não duplica o trabalho de outro pedido para o mesmo vídeo', () => {
    const first = chargeRequest(ledgerSchema.parse({ version: 1, users: {}, requests: {} }), input)
    expect(() => chargeRequest(first.ledger, { ...input, issueNumber: 2, userId: 456 })).toThrow(/issue #1/)
  })
})
