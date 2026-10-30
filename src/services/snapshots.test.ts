import { afterEach, describe, expect, it, vi } from 'vitest'
import index from '../../public/snapshots/index.json'
import { listRecentDebates } from './snapshots'

const report = index.reports.q4T7plSBdJE
afterEach(() => vi.unstubAllGlobals())

describe('debates recentes do acervo', () => {
  it('ordena por data de checagem, preserva todo o acervo e a cobertura', async () => {
    const reports = Object.fromEntries(Array.from({ length: 8 }, (_, position) => {
      const id = `video00000${position}`
      return [id, { ...report, video: { ...report.video, id }, analyzedAt: `2026-01-${String(position + 1).padStart(2, '0')}T00:00:00.000Z` }]
    }))
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ reports }) })
    vi.stubGlobal('fetch', fetch)
    const recent = await listRecentDebates(new AbortController().signal)
    expect(recent.map((debate) => debate.video.id)).toEqual(['video000007', 'video000006', 'video000005', 'video000004', 'video000003', 'video000002', 'video000001', 'video000000'])
    expect(recent[0].claimCount).toBe(48)
    expect(recent[0].coverageKind).toBe('selected-claims')
    expect(recent[0]).not.toHaveProperty('claims')
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('snapshots/index.json'), expect.objectContaining({ headers: { Accept: 'application/json' } }))
  })

  it('retorna lista vazia quando ainda não há análises publicadas', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ reports: {} }) }))
    expect(await listRecentDebates(new AbortController().signal)).toEqual([])
  })

  it.each([
    { ...report, analyzedAt: 'data inválida' },
    { ...report, status: 'queued' },
    { ...report, video: { ...report.video, id: 'dQw4w9WgXcQ' } },
  ])('rejeita dados inválidos ou um relatório ainda não publicado', async (invalid) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ reports: { [report.video.id]: invalid } }) }))
    await expect(listRecentDebates(new AbortController().signal)).rejects.toThrow(/inválid/)
  })

  it('distingue falha HTTP de acervo vazio', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))
    await expect(listRecentDebates(new AbortController().signal)).rejects.toThrow(/Não foi possível carregar/)
  })

  it('não devolve dados quando a consulta foi cancelada', async () => {
    const controller = new AbortController()
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => { controller.abort(); return { ok: true, json: async () => index } }))
    await expect(listRecentDebates(controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
  })
})
