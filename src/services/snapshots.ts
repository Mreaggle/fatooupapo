import { z } from 'zod'
import { reportSchema } from '../lib/report-schema'
import type { RecentDebate } from '../types'

const recentIndexSchema = z.object({
  reports: z.record(z.string().regex(/^[\w-]{11}$/), z.object({
    video: reportSchema.shape.video,
    analyzedAt: reportSchema.shape.analyzedAt,
    status: z.literal('completed'),
    claims: z.array(z.unknown()),
    coverage: z.object({ kind: z.enum(['selected-claims', 'all-identified-claims']) }).optional(),
  })),
})

export async function listRecentDebates(signal: AbortSignal): Promise<RecentDebate[]> {
  const response = await fetch(`${import.meta.env.BASE_URL}snapshots/index.json`, {
    signal,
    headers: { Accept: 'application/json' },
  })
  signal.throwIfAborted()
  if (!response.ok) throw new Error('Não foi possível carregar os debates do acervo.')
  const parsed = recentIndexSchema.safeParse(await response.json())
  if (!parsed.success) throw new Error('O acervo retornou dados inválidos.')
  const reports = Object.entries(parsed.data.reports).map(([id, report]) => {
    if (report.video.id !== id) throw new Error('O acervo retornou um vídeo com identificação inválida.')
    return { video: report.video, analyzedAt: report.analyzedAt, claimCount: report.claims.length, coverageKind: report.coverage?.kind }
  })
  return reports.sort((a, b) => Date.parse(b.analyzedAt) - Date.parse(a.analyzedAt) || a.video.id.localeCompare(b.video.id)).slice(0, 6)
}
