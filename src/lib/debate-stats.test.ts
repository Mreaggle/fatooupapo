import { describe, expect, it } from 'vitest'
import { debateStats } from './debate-stats'
import type { AnalysisReport, Claim } from '../types'

const claim = (id: string, verdict: Claim['verdict'], speaker = 'Lula'): Claim => ({ id, quote: id, timestampSeconds: 0, verdict, explanation: 'Revisão', evidence: [], speaker, speakerOrigin: 'fact-check-source' })
const report = (claims: Claim[]): AnalysisReport => ({ schemaVersion: 1, video: { id: 'RugVB17uRVM', url: 'https://youtu.be/RugVB17uRVM', title: 'Debate', channel: 'Band', thumbnailUrl: 'https://i.ytimg.com/vi/RugVB17uRVM/hqdefault.jpg' }, analyzedAt: '2026-10-29T00:00:00Z', status: 'completed', summary: 'Relatório', participants: [{ id: 'lula', name: 'Lula', aliases: [], role: 'guest', source: 'video-title' }, { id: 'flavio', name: 'Flávio Bolsonaro', aliases: [], role: 'guest', source: 'video-title' }], claims })

describe('distribuição e medidor por debatedor', () => {
  it('separa inconclusivos e imprecisos do denominador e conta cada afirmação uma vez', () => {
    const value = report([claim('1', 'Verdadeiro'), claim('2', 'Majoritariamente verdadeiro'), claim('3', 'Falso'), claim('4', 'Majoritariamente falso'), claim('5', 'Inconclusivo'), claim('6', 'Impreciso ou fora de contexto')])
    value.claims[0].evidence = [{ title: 'Fonte 1', publisher: 'Veículo', url: 'https://example.org/1', position: 'supports' }, { title: 'Fonte 2', publisher: 'Outro', url: 'https://example.org/2', position: 'supports' }]
    expect(debateStats(value).speakers[0]).toMatchObject({ total: 6, facts: 2, talk: 2, factPercent: 50 })
    expect(debateStats(value).speakers[1]).toMatchObject({ total: 0, factPercent: null })
  })

  it('exclui sugestões heurísticas e aplica correção ou remoção local de autoria', () => {
    const uncertain = { ...claim('1', 'Falso'), speakerOrigin: undefined }
    const value = report([uncertain, claim('2', 'Verdadeiro')])
    expect(debateStats(value).unattributed).toBe(1)
    const corrected = debateStats(value, { '1': 'Flávio Bolsonaro', '2': null })
    expect(corrected.unattributed).toBe(1)
    expect(corrected.speakers[1]).toMatchObject({ total: 1, talk: 1, factPercent: 0 })
    expect(corrected.speakers[0].factPercent).toBeNull()
  })

  it('não mistura moderadores ou nomes desconhecidos com os debatedores', () => {
    const value = report([claim('1', 'Verdadeiro', 'Moderador')])
    expect(debateStats(value).unattributed).toBe(1)
    expect(debateStats(value).speakers.every((speaker) => speaker.total === 0)).toBe(true)
  })
})
