// @vitest-environment node
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseTranscript } from '../../src/lib/subtitles.ts'
import { buildEditorialDebate } from './editorial.ts'

const readJson = (path: string) => JSON.parse(readFileSync(path, 'utf8'))
const manifest = readJson('reviews/batch-2026-10-30/manifest.json') as Array<{
  videoId: string
  sha256: string
  cueCount: number
}>
const sources = {
  ...readJson('reviews/sources-2025.json'),
  ...readJson('reviews/sources-2026-10-30.json'),
}
const load = (id: string) => {
  const review = readJson(`reviews/${id}.json`)
  return buildEditorialDebate(review, readFileSync(`requests/${id}.srt`, 'utf8'), sources)
}

describe('acervo dos dez vídeos fornecidos em outubro de 2026', () => {
  it.each(manifest)('publica a íntegra fornecida e decisões reproduzíveis de $videoId', ({ videoId, sha256, cueCount }) => {
    const srt = readFileSync(`requests/${videoId}.srt`, 'utf8')
    const cues = parseTranscript(srt)
    const review = readJson(`reviews/${videoId}.json`)
    const result = load(videoId)
    const metadata = readJson(`reviews/batch-2026-10-30/${videoId}.metadata.json`)
    expect(createHash('sha256').update(srt).digest('hex')).toBe(sha256)
    expect(cues).toHaveLength(cueCount)
    expect(review.scannedThrough).toBe(cueCount)
    expect(review.referenceDate).toBe(metadata.microformat.playerMicroformatRenderer.publishDate.slice(0, 10))
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
})
