import { describe, expect, it } from 'vitest'
import { debateStats } from './debate-stats'
import type { AnalysisReport, Claim } from '../types'
import snapshots from '../../public/snapshots/index.json'

const claim = (id: string, verdict: Claim['verdict'], speaker = 'Lula'): Claim => ({ id, quote: id, timestampSeconds: 0, verdict, explanation: 'Revisão', evidence: [], speaker, speakerOrigin: 'fact-check-source' })
const report = (claims: Claim[]): AnalysisReport => ({ schemaVersion: 1, video: { id: 'RugVB17uRVM', url: 'https://youtu.be/RugVB17uRVM', title: 'Debate', channel: 'Band', thumbnailUrl: 'https://i.ytimg.com/vi/RugVB17uRVM/hqdefault.jpg' }, analyzedAt: '2026-10-29T00:00:00Z', status: 'completed', summary: 'Relatório', participants: [{ id: 'lula', name: 'Lula', aliases: [], role: 'guest', source: 'video-title' }, { id: 'flavio', name: 'Flávio Bolsonaro', aliases: [], role: 'guest', source: 'video-title' }], claims })

describe('distribuição e medidor por debatedor', () => {
  it('separa inconclusivos e imprecisos do denominador e conta cada afirmação uma vez', () => {
    const value = report([claim('1', 'Verdadeiro'), claim('2', 'Majoritariamente verdadeiro'), claim('3', 'Falso'), claim('4', 'Majoritariamente falso'), claim('5', 'Inconclusivo'), claim('6', 'Impreciso ou fora de contexto')])
    value.claims[0].evidence = [{ title: 'Fonte 1', publisher: 'Veículo', url: 'https://example.org/1', position: 'supports' }, { title: 'Fonte 2', publisher: 'Outro', url: 'https://example.org/2', position: 'supports' }]
    expect(debateStats(value).speakers[0]).toMatchObject({ total: 6, facts: 2, talk: 2, factPercent: 50 })
    expect(debateStats(value).speakers[1]).toMatchObject({ total: 0, factPercent: null })
  })

  it('contabiliza locutores nomeados sem inventar um índice e aplica revisão local', () => {
    const uncertain = { ...claim('1', 'Falso'), speakerOrigin: undefined }
    const value = report([uncertain, claim('2', 'Verdadeiro')])
    expect(debateStats(value).unattributed).toBe(0)
    expect(debateStats(value).speakers[0]).toMatchObject({ total: 2, attributionScoreAverage: null })
    const corrected = debateStats(value, { '1': 'Flávio Bolsonaro', '2': null })
    expect(corrected.unattributed).toBe(1)
    expect(corrected.speakers[1]).toMatchObject({ total: 1, talk: 1, factPercent: 0 })
    expect(corrected.speakers[0].factPercent).toBeNull()
  })

  it('contabiliza todas as detecções do Jones × Kim e calcula a média de todos os índices por pessoa', () => {
    const result = debateStats(snapshots.reports.q4T7plSBdJE as AnalysisReport)
    expect(result.unattributed).toBe(20)
    const jones = result.speakers.find((speaker) => speaker.name === 'Jones Manoel')!
    const kim = result.speakers.find((speaker) => speaker.name === 'Kim Kataguiri')!
    expect(jones).toMatchObject({ total: 17, scoredAttributions: 17, facts: 3, talk: 0, factPercent: 100 })
    expect(jones.attributionScoreAverage).toBeCloseTo(1453 / 17)
    expect(kim).toMatchObject({ total: 11, scoredAttributions: 11, facts: 1, talk: 3, factPercent: 25 })
    expect(kim.attributionScoreAverage).toBeCloseTo(876 / 11)
  })

  it('atualiza as contagens sem transferir o índice da detecção para um locutor corrigido', () => {
    const value = snapshots.reports.q4T7plSBdJE as AnalysisReport
    const moved = debateStats(value, { 'afirmacao-01': 'Kim Kataguiri' })
    expect(moved.speakers.find((speaker) => speaker.name === 'Jones Manoel')).toMatchObject({ total: 16, scoredAttributions: 16, attributionScoreAverage: (1453 - 88) / 16 })
    expect(moved.speakers.find((speaker) => speaker.name === 'Kim Kataguiri')).toMatchObject({ total: 12, scoredAttributions: 11, attributionScoreAverage: 876 / 11 })
    const confirmed = debateStats(value, { 'afirmacao-01': 'Jones Manoel' })
    expect(confirmed.speakers.find((speaker) => speaker.name === 'Jones Manoel')).toMatchObject({ total: 17, scoredAttributions: 17, attributionScoreAverage: 1453 / 17 })
    expect(debateStats(value, { 'afirmacao-01': null }).unattributed).toBe(21)
  })

  it('inclui detecção com índice zero e não usa o índice como peso das classificações', () => {
    const value = structuredClone(snapshots.reports.q4T7plSBdJE) as AnalysisReport
    const detected = value.claims.filter((item) => item.speakerAttribution?.name === 'Kim Kataguiri').slice(0, 2)
    detected[0].speakerAttribution!.score = 0
    detected[1].speakerAttribution!.score = 95
    value.claims = detected
    expect(debateStats(value).speakers.find((speaker) => speaker.name === 'Kim Kataguiri')).toMatchObject({ total: 2, scoredAttributions: 2, attributionScoreAverage: 47.5 })
  })

  it('não mistura moderadores ou nomes desconhecidos com os debatedores', () => {
    const value = report([claim('1', 'Verdadeiro', 'Moderador')])
    expect(debateStats(value).unattributed).toBe(1)
    expect(debateStats(value).speakers.every((speaker) => speaker.total === 0)).toBe(true)
  })
})
