import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { analyzeVideo } from './analysis'
import { parseYouTubeUrl } from '../lib/youtube'

const snapshotMarkdown = readFileSync('snapshots/q4T7plSBdJE.md', 'utf8')
const report = JSON.parse(snapshotMarkdown.match(/fato-ou-papo:json\n([\s\S]*?)\n-->/)![1])
const video = parseYouTubeUrl('https://www.youtube.com/watch?v=q4T7plSBdJE')!
const index = { generatedAt: report.analyzedAt, reports: { [video.videoId]: report } }

afterEach(() => vi.unstubAllGlobals())

describe('consulta ao acervo', () => {
  it('reaproveita o snapshot por ID com apenas uma requisição estática', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => index })
    vi.stubGlobal('fetch', fetch)
    const result = await analyzeVideo(video, new AbortController().signal, vi.fn())
    expect(result.source).toBe('snapshot')
    expect(result.report.video.id).toBe(video.videoId)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0][1]).not.toHaveProperty('method', 'POST')
  })

  it('rejeita um relatório que não corresponde ao vídeo solicitado', async () => {
    const badIndex = { ...index, reports: { [video.videoId]: { ...report, video: { ...report.video, id: 'dQw4w9WgXcQ' } } } }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => badIndex }))
    await expect(analyzeVideo(video, new AbortController().signal, vi.fn())).rejects.toMatchObject({ code: 'invalid_response' })
  })

  it('rejeita conclusões sem fontes e URLs de fonte não HTTPS', async () => {
    for (const evidence of [[], [{ title: 'Fonte', publisher: 'Fonte', url: 'javascript:alert(1)', position: 'supports' }]]) {
      const invalid = { ...report, claims: [{ ...report.claims[0], verdict: 'Verdadeiro', evidence }] }
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ...index, reports: { [video.videoId]: invalid } }) }))
      await expect(analyzeVideo(video, new AbortController().signal, vi.fn())).rejects.toMatchObject({ code: 'invalid_response' })
    }
  })

  it('distingue falha do acervo de vídeo sem análise', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Network error')))
    await expect(analyzeVideo(video, new AbortController().signal, vi.fn())).rejects.toMatchObject({ code: 'service_failure' })
  })
})
