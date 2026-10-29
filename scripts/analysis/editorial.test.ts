// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { debateStats } from '../../src/lib/debate-stats.ts'
import { parseTranscript } from '../../src/lib/subtitles.ts'
import { buildEditorialDebate } from './editorial.ts'

const sources = JSON.parse(readFileSync('reviews/sources-2025.json', 'utf8'))
const metadata = JSON.parse(readFileSync('reviews/video-metadata.json', 'utf8')).videos
const load = (id: string) => ({
  review: JSON.parse(readFileSync(`reviews/${id}.json`, 'utf8')),
  srt: readFileSync(`requests/${id}.srt`, 'utf8'),
})

describe('publicação dos debates com revisão textual integral', () => {
  it.each([
    ['C0ucX3GZo-c', 135, 3803],
    ['l78NZP7riOA', 92, 3173],
    ['nPLJs6xPNWU', 156, 5710],
  ] as const)('preserva a íntegra e todas as decisões do inventário %s', (id, count, cueCount) => {
    const { review, srt } = load(id)
    const result = buildEditorialDebate(review, srt, sources)
    const cues = parseTranscript(srt)
    expect(metadata[id].lengthSeconds - cues.at(-1)!.end).toBeGreaterThanOrEqual(0)
    expect(metadata[id].lengthSeconds - cues.at(-1)!.end).toBeLessThan(10)
    expect(review.referenceDate).toBe(metadata[id].publishDate.slice(0, 10))
    expect(result.report.claims).toHaveLength(count)
    expect(result.report.coverage).toMatchObject({ kind: 'all-identified-claims', cueCount, lastTimestamp: cues.at(-1)!.start })
    expect(result.transcriptMarkdown).toBe(readFileSync(`transcripts/${id}.md`, 'utf8'))
    expect(result.markdown).toBe(readFileSync(`snapshots/${id}.md`, 'utf8'))
    expect(result.auditMarkdown).toBe(readFileSync(`reviews/${id}.md`, 'utf8'))
    expect(result.transcriptMarkdown).toContain(`bloco ${cueCount}`)
    expect(result.report.claims.at(-1)!.timestampSeconds).toBeGreaterThan(cues.at(-1)!.end * 0.9)
    expect(result.report.claims[0].timestampSeconds).toBeLessThan(cues.at(-1)!.end * 0.1)
    const stats = debateStats(result.report)
    expect(stats.speakers.every((speaker) => speaker.total > 20)).toBe(true)
    expect(stats.speakers.every((speaker) => speaker.attributionScoreAverage === null)).toBe(true)
    expect(stats.speakers.reduce((sum, speaker) => sum + speaker.total, stats.unattributed)).toBe(count)
    for (const claim of result.report.claims) {
      expect(claim.quote).toBe(cues.slice(claim.cueStart! - 1, claim.cueEnd).map((cue) => cue.text).join(' '))
      expect(claim.speakerOrigin).toBeUndefined()
      if (claim.verdict !== 'Inconclusivo') expect(claim.evidence.length).toBeGreaterThan(0)
    }
  })

  it('recusa rascunho, legenda alterada, varredura incompleta e fonte pendente', () => {
    const { review, srt } = load('C0ucX3GZo-c')
    expect(() => buildEditorialDebate({ ...review, reviewStatus: 'draft' }, srt, sources)).toThrow()
    expect(() => buildEditorialDebate(review, `${srt}\n`, sources)).toThrow(/transcrição integral/)
    expect(() => buildEditorialDebate({ ...review, scannedThrough: 8 }, srt, sources)).toThrow(/transcrição integral/)
    const pending = structuredClone(review)
    pending.claims[0].needsSource = 'pendente'
    expect(() => buildEditorialDebate(pending, srt, sources)).toThrow()
  })

  it('recusa repetição sem referência, intervalo inexistente e conclusão sem fonte', () => {
    const { review, srt } = load('C0ucX3GZo-c')
    const duplicate = structuredClone(review)
    duplicate.claims[0].verdict = 'repetition'
    duplicate.claims[0].duplicateOf = 999
    expect(() => buildEditorialDebate(duplicate, srt, sources)).toThrow(/Repetição/)
    const badRange = structuredClone(review)
    badRange.claims[0].cueEnd = 99999
    expect(() => buildEditorialDebate(badRange, srt, sources)).toThrow(/Intervalo inválido/)
    const unsupported = structuredClone(review)
    unsupported.claims[0].verdict = 'Falso'
    expect(() => buildEditorialDebate(unsupported, srt, sources)).toThrow(/Uma conclusão exige fontes/)
  })

  it('não duplica opiniões, repetições ou autoria ambígua no placar', () => {
    const flow = load('C0ucX3GZo-c')
    const { report } = buildEditorialDebate(flow.review, flow.srt, sources)
    expect(report.claims.find((claim) => claim.id === 'editorial-20')).toBeUndefined()
    expect(report.claims.find((claim) => claim.id === 'editorial-128')?.speaker).toBeUndefined()
    expect(report.claims.find((claim) => claim.id === 'editorial-107')?.verdict).toBe('Inconclusivo')
    expect(report.claims.find((claim) => claim.id === 'editorial-24')?.explanation).toContain('suspensos por liminar')
    const red = load('l78NZP7riOA')
    const other = buildEditorialDebate(red.review, red.srt, sources).report
    expect(other.claims.find((claim) => claim.id === 'editorial-101')).toBeUndefined()
    expect(other.claims.find((claim) => claim.id === 'editorial-72')).toBeUndefined()
    expect(other.claims.find((claim) => claim.id === 'editorial-1')?.verdict).toBe('Inconclusivo')
    expect(other.claims.find((claim) => claim.id === 'editorial-59')).toBeUndefined()
  })

  it('preserva ressalvas da legenda e não conta novamente as repetições no debate Jabbour × Marçal', () => {
    const { review, srt } = load('nPLJs6xPNWU')
    const { report } = buildEditorialDebate(review, srt, sources)
    const claim = (number: number) => report.claims.find((item) => item.id === `editorial-${number}`)
    expect(claim(63)?.verdict).toBe('Inconclusivo')
    expect(claim(88)?.verdict).toBe('Inconclusivo')
    expect(claim(101)?.verdict).toBe('Inconclusivo')
    expect(claim(96)?.speaker).toBeUndefined()
    expect(claim(147)?.quote).toContain('580 bilhões')
    expect(claim(157)?.verdict).toBe('Impreciso ou fora de contexto')
    for (const number of [50, 59, 137, 144, 146, 172, 174, 180, 183]) expect(claim(number)).toBeUndefined()
  })
})
