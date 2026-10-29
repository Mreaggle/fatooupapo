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

export const speakerAttributionSchema = z.object({
  participantId: z.string().min(1),
  name: z.string().min(1).max(80),
  score: z.number().int().min(0).max(100),
  scoreKind: z.literal('uncalibrated-text-evidence'),
  method: z.literal('text-rules-v1'),
  needsReview: z.literal(true),
  anchor: z.object({
    kind: z.enum(['self-introduction', 'named-handoff', 'reply-transition']),
    cueStart: z.number().int().positive(),
    cueEnd: z.number().int().positive(),
    text: z.string().min(1),
  }),
})

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
  participants: z.array(z.object({
    id: z.string().min(1),
    name: z.string().min(1).max(80),
    aliases: z.array(z.string()),
    role: z.enum(['guest', 'host']),
    source: z.enum(['video-title', 'self-introduction']),
  })).optional(),
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
    speakerOrigin: z.literal('fact-check-source').optional(),
    speakerAttribution: speakerAttributionSchema.optional(),
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
    importedChecks: z.array(z.object({
      publisher: z.string().min(1),
      url: webUrl,
      label: z.string().min(1),
      automated: z.boolean(),
    })).optional(),
  }).superRefine((claim, context) => {
    if (claim.verdict !== 'Inconclusivo' && claim.evidence.length === 0) {
      context.addIssue({ code: 'custom', path: ['evidence'], message: 'Uma conclusão exige fontes' })
    }
  })),
  limitations: z.array(z.string()).optional(),
}).superRefine((report, context) => {
  for (const [index, claim] of report.claims.entries()) {
    const attribution = claim.speakerAttribution
    if (!attribution) continue
    const participant = report.participants?.find((item) => item.id === attribution.participantId)
    if (!participant || participant.name !== attribution.name || attribution.anchor.cueEnd < attribution.anchor.cueStart || (claim.cueStart !== undefined && attribution.anchor.cueEnd >= claim.cueStart)) {
      context.addIssue({ code: 'custom', path: ['claims', index, 'speakerAttribution'], message: 'Atribuição sem participante ou pista anterior válida' })
    }
  }
})

export type ValidatedReport = z.infer<typeof reportSchema>
