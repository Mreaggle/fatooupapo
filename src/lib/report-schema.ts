import { z } from 'zod'

const webUrl = z.string().url().refine((value) => new URL(value).protocol === 'https:', 'URL deve usar HTTPS')

export const verdicts = [
  'Verdadeiro',
  'Majoritariamente verdadeiro',
  'Impreciso ou fora de contexto',
  'Majoritariamente falso',
  'Falso',
  'Inconclusivo',
] as const

export const reportSchema = z.object({
  schemaVersion: z.literal(1),
  video: z.object({
    id: z.string().regex(/^[a-zA-Z0-9_-]{11}$/),
    url: webUrl,
    title: z.string().min(1),
    channel: z.string().min(1),
    thumbnailUrl: webUrl,
  }),
  analyzedAt: z.string().datetime(),
  status: z.literal('completed'),
  summary: z.string().min(1),
  coverage: z.object({
    kind: z.enum(['selected-claims', 'all-identified-claims']),
    description: z.string().min(1),
    transcriptPath: z.string().regex(/^transcripts\/[\w-]{11}\.md$/),
    firstTimestamp: z.number().nonnegative(),
    lastTimestamp: z.number().nonnegative(),
    cueCount: z.number().int().positive(),
  }).optional(),
  claims: z.array(z.object({
    id: z.string().min(1),
    title: z.string().optional(),
    topic: z.string().optional(),
    quote: z.string().min(1),
    speaker: z.string().optional(),
    timestampSeconds: z.number().nonnegative(),
    cueStart: z.number().int().positive().optional(),
    cueEnd: z.number().int().positive().optional(),
    verdict: z.enum(verdicts),
    explanation: z.string().min(1),
    evidence: z.array(z.object({
      title: z.string().min(1),
      url: webUrl,
      publisher: z.string().min(1),
      publishedAt: z.string().refine((value) => Number.isFinite(Date.parse(value)), 'Data de publicação inválida').optional(),
      position: z.enum(['supports', 'contradicts', 'context']),
    })),
    limitations: z.string().optional(),
  }).superRefine((claim, context) => {
    if (claim.verdict !== 'Inconclusivo' && claim.evidence.length === 0) {
      context.addIssue({ code: 'custom', path: ['evidence'], message: 'Uma conclusão exige fontes' })
    }
  })),
  limitations: z.array(z.string()).optional(),
})

export type ValidatedReport = z.infer<typeof reportSchema>
