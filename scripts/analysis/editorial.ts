import { createHash } from 'node:crypto'
import { z } from 'zod'
import { reportSchema, verdicts } from '../../src/lib/report-schema.ts'
import { parseTranscript, timestamp } from '../../src/lib/subtitles.ts'
import type { AnalysisReport } from '../../src/types.ts'

const reviewSchema = z.object({
  videoId: z.string(),
  video: reportSchema.shape.video,
  participants: reportSchema.shape.participants.unwrap(),
  referenceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reviewedAt: z.string().datetime(),
  reviewStatus: z.literal('reviewed'),
  reviewMethod: z.literal('text-and-document-review'),
  transcriptSha256: z.string().regex(/^[a-f0-9]{64}$/),
  scannedThrough: z.number().int().positive(),
  claims: z.array(z.object({
    cueStart: z.number().int().positive(),
    cueEnd: z.number().int().positive(),
    title: z.string().min(1),
    speaker: z.string().nullable(),
    verdict: z.enum([...verdicts, 'opinion', 'repetition']),
    explanation: z.string().min(1),
    sources: z.array(z.string()),
    duplicateOf: z.number().int().positive().optional(),
    alsoAt: z.array(z.object({ cueStart: z.number().int().positive(), cueEnd: z.number().int().positive() })).optional(),
    needsSource: z.never().optional(),
  })).min(1),
})

const sourcesSchema = z.record(z.string(), z.object({
  title: z.string().min(1),
  url: z.string().url().refine((url) => new URL(url).protocol === 'https:'),
  publisher: z.string().min(1),
}))

export function buildEditorialDebate(input: unknown, transcript: string, sourceCatalog: unknown) {
  const review = reviewSchema.parse(input)
  const sources = sourcesSchema.parse(sourceCatalog)
  const cues = parseTranscript(transcript)
  const hash = createHash('sha256').update(transcript).digest('hex')
  if (review.videoId !== review.video.id || review.transcriptSha256 !== hash || review.scannedThrough !== cues.length) {
    throw new Error('A revisão não corresponde à transcrição integral ou ao vídeo informado.')
  }
  if (review.referenceDate > review.reviewedAt.slice(0, 10)) throw new Error('Data da revisão anterior ao debate.')
  const names = new Set(review.participants.map((person) => person.name))
  const claims: AnalysisReport['claims'] = []
  const audit = [`# Inventário revisado — ${review.video.title}`, '',
    `Referência histórica: ${review.referenceDate}. Revisão documental: ${review.reviewedAt}.`,
    `Leitura integral: blocos 1–${cues.length}. SHA-256: \`${hash}\`.`,
    'Revisão assistida por IA a partir do texto e das fontes indicadas; sem validação acústica de locutores ou de erros da legenda.',
    'Opiniões e repetições ficam documentadas abaixo e não acrescentam votos aos gráficos.', '',
  ]
  for (const [index, item] of review.claims.entries()) {
    for (const range of [item, ...(item.alsoAt ?? [])]) {
      if (range.cueStart > range.cueEnd || range.cueEnd > cues.length) throw new Error(`Intervalo inválido no item ${index + 1}.`)
    }
    if (item.speaker && !names.has(item.speaker)) throw new Error(`Locutor fora da lista de participantes no item ${index + 1}.`)
    for (const key of item.sources) if (!sources[key]) throw new Error(`Fonte desconhecida: ${key}.`)
    const quote = cues.slice(item.cueStart - 1, item.cueEnd).map((cue) => cue.text).join(' ')
    const excluded = item.verdict === 'opinion' || item.verdict === 'repetition'
    if (item.verdict === 'repetition') {
      const target = review.claims[(item.duplicateOf ?? 0) - 1]
      if (!target || target === item || target.verdict === 'repetition' || target.verdict === 'opinion') {
        throw new Error(`Repetição sem item factual de destino: ${index + 1}.`)
      }
    }
    audit.push(`## ${index + 1}. ${item.title}`, '',
      `Blocos ${item.cueStart}–${item.cueEnd} · ${timestamp(cues[item.cueStart - 1].start)} · ${item.speaker ?? 'Autoria não atribuída'}.`,
      `Decisão: ${item.verdict === 'opinion' ? 'opinião — sem voto' : item.verdict === 'repetition' ? `repetição do item ${item.duplicateOf} — sem voto` : item.verdict}.`, '',
      `> ${quote}`, '', item.explanation, '',
      ...item.sources.map((key) => `- [${sources[key].title}](${sources[key].url}) — ${sources[key].publisher}.`), '',
    )
    if (excluded) continue
    const repeated = item.alsoAt?.length
      ? ` Repetições reunidas neste item: ${item.alsoAt.map((range) => `blocos ${range.cueStart}–${range.cueEnd}`).join('; ')}.` : ''
    claims.push({
      id: `editorial-${index + 1}`,
      title: item.title,
      quote,
      ...(item.speaker ? { speaker: item.speaker } : {}),
      timestampSeconds: cues[item.cueStart - 1].start,
      cueStart: item.cueStart,
      cueEnd: item.cueEnd,
      verdict: item.verdict as AnalysisReport['claims'][number]['verdict'],
      explanation: item.explanation,
      evidence: item.sources.map((key) => ({ ...sources[key], position: 'context' as const })),
      ...(repeated ? { limitations: repeated.trim() } : {}),
    })
  }
  const report = reportSchema.parse({
    schemaVersion: 1,
    video: review.video,
    analyzedAt: review.reviewedAt,
    status: 'completed',
    participants: review.participants,
    claims,
    summary: `${claims.length} afirmações do inventário revisadas ao longo do debate, com fontes e conclusões por trecho. Consulte a distribuição por debatedor e a transcrição integral.`,
    coverage: {
      kind: 'all-identified-claims',
      description: `Leitura integral dos ${cues.length} blocos do SRT fornecido, com ${review.claims.length} entradas no inventário e ${claims.length} afirmações publicadas. Referência histórica: ${review.referenceDate}. Opiniões, regras, publicidade e repetições não geram votos adicionais. As afirmações identificadas receberam conclusão, incluindo Inconclusivo quando faltou comprovação; isso não garante ausência de omissões na identificação.`,
      transcriptPath: `transcripts/${review.videoId}.md`,
      firstTimestamp: cues[0].start,
      lastTimestamp: cues.at(-1)!.start,
      cueCount: cues.length,
    },
    limitations: [
      'Revisão assistida por IA com pesquisa documental e leitura integral da legenda; não é validação humana independente nem reconhecimento acústico.',
      'Locutores atribuídos pelo contexto textual. Trechos mistos ou sem autoria segura não entram no placar individual; não foi inventado índice numérico de precisão.',
      'Legendas podem conter nomes e números incorretos. Divergências possivelmente causadas pela transcrição não foram tratadas como erro comprovado do debatedor.',
      'Inconclusivo significa evidência insuficiente. O placar não mede intenção de mentir nem substitui a leitura das conclusões, recortes e fontes.',
    ],
  })
  const markdown = [`# Checagem — ${review.video.title}`, '', report.summary, '',
    `- Vídeo: ${review.video.url}`,
    `- Revisão: ${review.reviewedAt}. Referência histórica: ${review.referenceDate}.`,
    `- Inventário e exclusões: [revisão editorial](https://github.com/Mreaggle/fatooupapo/blob/main/reviews/${review.videoId}.md).`,
    `- Transcrição: [texto integral](../transcripts/${review.videoId}.md).`, '',
    ...report.claims.flatMap((claim) => [
      `## ${claim.id}: ${claim.title}`, '',
      `${timestamp(claim.timestampSeconds)} · ${claim.speaker ?? 'Locutor não identificado'} · ${claim.verdict}`, '',
      `> ${claim.quote}`, '', claim.explanation, '',
      ...claim.evidence.map((source) => `- [${source.title}](${source.url}) — ${source.publisher}.`), '',
    ]),
    '<!-- fato-ou-papo:json', JSON.stringify(report, null, 2), '-->', '',
  ].join('\n')
  const transcriptMarkdown = [`# Transcrição — ${review.video.title}`, '',
    `- Vídeo: ${review.video.url}`,
    '- Origem: SRT integral fornecido pelo responsável pelo projeto; texto preservado, sem corrigir reconhecimento de fala.',
    '- Autoria revisada somente nos trechos do relatório; a legenda não contém diarização acústica.',
    `- SHA-256 do SRT: \`${hash}\`.`,
    `- Blocos: ${cues.length}. Duração até o fim da última legenda: ${timestamp(cues.at(-1)!.end)}.`, '',
    ...cues.flatMap((cue) => [`### ${timestamp(cue.start)} · bloco ${cue.id}`, '', cue.text, '']),
  ].join('\n')
  return { report, markdown, transcriptMarkdown, auditMarkdown: `${audit.join('\n').trimEnd()}\n` }
}
