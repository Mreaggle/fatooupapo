// @vitest-environment node
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseTranscript } from '../../src/lib/subtitles.ts'
import { buildEditorialDebate } from './editorial.ts'

const readJson = (path: string) => JSON.parse(readFileSync(path, 'utf8'))
const manifest = ['batch-2026-10-30', 'batch-2026-10-30-extra'].flatMap((batch) =>
  readJson(`reviews/${batch}/manifest.json`).map((entry: { videoId: string }) => ({ ...entry, batch })),
) as Array<{
  videoId: string
  sha256: string
  cueCount: number
  batch: string
}>
const sources = {
  ...readJson('reviews/sources-2025.json'),
  ...readJson('reviews/sources-2026-10-30.json'),
  ...readJson('reviews/sources-2026-10-30-extra.json'),
}
const load = (id: string) => {
  const review = readJson(`reviews/${id}.json`)
  return buildEditorialDebate(review, readFileSync(`requests/${id}.srt`, 'utf8'), sources)
}

describe('acervo dos lotes fornecidos em outubro de 2026', () => {
  it.each(manifest)('publica a íntegra fornecida e decisões reproduzíveis de $videoId', ({ videoId, sha256, cueCount, batch }) => {
    const srt = readFileSync(`requests/${videoId}.srt`, 'utf8')
    const cues = parseTranscript(srt)
    const review = readJson(`reviews/${videoId}.json`)
    const result = load(videoId)
    const metadata = readJson(`reviews/${batch}/${videoId}.metadata.json`)
    expect(createHash('sha256').update(srt).digest('hex')).toBe(sha256)
    expect(cues).toHaveLength(cueCount)
    expect(review.scannedThrough).toBe(cueCount)
    expect(review.referenceDate).toBe(metadata.microformat.playerMicroformatRenderer.publishDate.slice(0, 10))
    if (batch === 'batch-2026-10-30-extra') {
      expect(Math.abs(Number(metadata.videoDetails.lengthSeconds) - cues.at(-1)!.end)).toBeLessThan(21)
    }
    expect(result.report.coverage).toMatchObject({
      kind: 'all-identified-claims', cueCount,
      firstTimestamp: cues[0].start, lastTimestamp: cues.at(-1)!.start,
    })
    expect(result.markdown).toBe(readFileSync(`snapshots/${videoId}.md`, 'utf8'))
    expect(result.auditMarkdown).toBe(readFileSync(`reviews/${videoId}.md`, 'utf8'))
    expect(result.transcriptMarkdown).toBe(readFileSync(`transcripts/${videoId}.md`, 'utf8'))
    expect(result.report.claims.length).toBeGreaterThan(20)
    for (const claim of result.report.claims) {
      expect(claim.quote).toBe(cues.slice(claim.cueStart! - 1, claim.cueEnd).map((cue) => cue.text).join(' '))
      expect(claim.timestampSeconds).toBe(cues[claim.cueStart! - 1].start)
      if (claim.verdict !== 'Inconclusivo') expect(claim.evidence.length).toBeGreaterThan(0)
    }
    for (const [position, claim] of review.claims.entries()) {
      if (['opinion', 'repetition'].includes(claim.verdict)) {
        expect(result.report.claims.some((item) => item.id === `editorial-${position + 1}`)).toBe(false)
      }
    }
  })

  it('expõe a ausência do começo do SRT de MC Smith, sem inventar transcrição', () => {
    const { report } = load('HhWQCedS81g')
    expect(report.coverage?.firstTimestamp).toBeGreaterThanOrEqual(192)
    expect(report.coverage?.description).toContain('00:03:12,799')
    expect(report.coverage?.description).toContain('sem reconstrução do intervalo ausente')
  })

  it('distingue crença de comprovação documental no debate cristão e ateu', () => {
    const { report } = load('l6g0GOCiWVs')
    expect(report.coverage?.description).toContain('não decide a existência de Deus')
    const sacredText = report.claims.find((claim) => claim.title?.includes('lei escrita nos corações'))!
    expect(sacredText.explanation).toContain('documental')
    expect(sacredText.explanation).toContain('não comprova')
  })

  it('preserva incertezas médicas e distingue liminar individual da norma geral', () => {
    const { report } = load('xejucP41-P8')
    const treatment = report.claims.find((claim) => claim.title?.startsWith('Risco de esterilidade'))!
    expect(treatment.explanation).toContain('não comprova segurança absoluta nem esterilidade inevitável')
    const injunction = report.claims.find((claim) => claim.title?.startsWith('Justiça autorizou'))!
    expect(injunction.explanation).toContain('caso concreto')
    const athlete = report.claims.find((claim) => claim.title?.startsWith('Medalha de Imane'))!
    expect(athlete.verdict).toBe('Inconclusivo')
  })

  it('confirma o teor do relatório aéreo sem transformar parecer em prova extraterrestre', () => {
    const { report } = load('FDeAWt5m3Mw')
    const document = report.claims.find((claim) => claim.cueStart === 3073)!
    expect(document.verdict).toBe('Verdadeiro')
    expect(document.explanation).toContain('não o transforma em prova científica')
    expect(report.claims.find((claim) => claim.cueStart === 2131)?.verdict).toBe('Inconclusivo')
  })

  it('distingue privatização de ativos públicos de expropriação judaica', () => {
    const { report } = load('MJEYLvrZJV0')
    expect(report.claims.find((claim) => claim.cueStart === 979)?.explanation).toContain('maioria e controle')
    const denial = report.claims.find((claim) => claim.cueStart === 1081)!
    expect(denial.verdict).toBe('Falso')
    expect(denial.explanation).toContain('processos diferentes')
  })

  it('preserva denominadores e não confunde presos provisórios com todos os presos', () => {
    const { report } = load('zqmYUQJz17k')
    const share = report.claims.find((claim) => claim.cueStart === 2971)!
    expect(share.verdict).toBe('Falso')
    expect(share.explanation).toContain('205.892')
    expect(share.explanation).toContain('727.301')
    expect(share.explanation).toContain('28,3%')
  })

  it('não multiplica taxa mundial de parceiros por mortes brasileiras de outro universo', () => {
    const { report } = load('foDB0XU9XQM')
    const deaths = report.claims.find((claim) => claim.cueStart === 1141)!
    expect(deaths.verdict).toBe('Falso')
    expect(deaths.explanation).toContain('90,2%')
    expect(deaths.explanation).toContain('99,3% é o recorte de mortes por intervenção policial')
    expect(report.claims.find((claim) => claim.cueStart === 1183)?.verdict).toBe('Falso')
    expect(report.claims.find((claim) => claim.cueStart === 5335)?.speaker).toBeUndefined()
  })

  it('considera a decisão anterior à gravação e separa absolvição de denúncia falsa', () => {
    const { report } = load('foDB0XU9XQM')
    const police = report.claims.find((claim) => claim.cueStart === 3049)!
    expect(police.explanation).toContain('24 de junho de 2025')
    expect(police.explanation).toContain('anulado a absolvição')
    expect(report.claims.find((claim) => claim.cueStart === 3535)?.explanation).toContain('não comprova automaticamente denunciação caluniosa')
    expect(report.claims.find((claim) => claim.cueStart === 2029)?.verdict).toBe('Falso')
  })
})
