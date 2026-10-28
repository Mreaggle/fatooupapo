import { createHash } from 'node:crypto'
import { appendFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { GeminiClient, boundedInteger } from './gemini.ts'
import { completedReport, processBatch, reviewMarkdown, sourcesSchema, stateSchema, type PipelineState } from './pipeline.ts'
import { requestSchema } from './request.ts'
import { parseTranscript, transcriptMarkdown, transcriptWindows } from './transcript.ts'

const request = requestSchema.parse(JSON.parse(await readFile('.analysis-work/request.json', 'utf8')))
const source = await readFile('.analysis-work/input.txt', 'utf8')
const cues = parseTranscript(source)
if (cues.at(-1)!.end > request.durationMinutes * 60) throw new Error('A legenda ultrapassa a duração declarada. Confira o vídeo e corrija o pedido.')
const transcriptHash = createHash('sha256').update(source).digest('hex')
const directory = `drafts/${request.videoId}`
await mkdir(directory, { recursive: true })

async function checkpoint(state: PipelineState) {
  await writeFile(`${directory}/state.json.tmp`, `${JSON.stringify(state, null, 2)}\n`)
  await rename(`${directory}/state.json.tmp`, `${directory}/state.json`)
  await writeFile(`${directory}/progress.md`, [
    `# Processamento — ${request.videoId}`, '', `- Fase: ${state.phase}`,
    `- Transcrição: ${state.nextWindow}/${state.totalWindows} janelas percorridas.`,
    `- Inventário: ${state.inventory.length} afirmações identificadas até agora.`,
    `- Checagem: ${state.claims.length}/${state.inventory.length} afirmações processadas.`,
    '- Nenhum resultado parcial deste pedido é publicado no site. O inventário automático precisa de revisão para omissões e duplicatas.',
    '- Não use esta contagem para comparar participantes ou inferir intenção de mentir.', '',
  ].join('\n'))
}

let state: PipelineState
try {
  state = stateSchema.parse(JSON.parse(await readFile(`${directory}/state.json`, 'utf8')))
  const original = requestSchema.parse(JSON.parse(await readFile(`${directory}/request.json`, 'utf8')))
  if (state.transcriptHash !== transcriptHash || state.referenceDate !== request.referenceDate || original.issueNumber !== request.issueNumber || original.durationMinutes !== request.durationMinutes) {
    throw new Error('O pedido ou a transcrição mudou desde o checkpoint. Revise o rascunho existente antes de iniciar outro processamento.')
  }
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  state = { version: 1, transcriptHash, referenceDate: request.referenceDate, phase: 'inventory', nextWindow: 0, totalWindows: transcriptWindows(cues).length, inventory: [], claims: [] }
}

let video
try {
  video = JSON.parse(await readFile(`${directory}/video.json`, 'utf8'))
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  const url = `https://www.youtube.com/watch?v=${request.videoId}`
  const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, { signal: AbortSignal.timeout(20_000) })
  if (!response.ok) throw new Error(`Metadados do YouTube indisponíveis (HTTP ${response.status}).`)
  const metadata = await response.json() as { title?: string; author_name?: string }
  if (!metadata.title || !metadata.author_name) throw new Error('Metadados do YouTube incompletos.')
  video = { id: request.videoId, url, title: metadata.title, channel: metadata.author_name, thumbnailUrl: `https://i.ytimg.com/vi/${request.videoId}/hqdefault.jpg` }
  await writeFile(`${directory}/video.json`, `${JSON.stringify(video, null, 2)}\n`)
}
await writeFile(`${directory}/source.txt`, source)
await writeFile(`${directory}/request.json`, `${JSON.stringify(request, null, 2)}\n`)
try {
  await writeFile(`${directory}/credit-receipt.json`, await readFile('.analysis-work/credit-receipt.json'))
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
}
await writeFile(`${directory}/transcript.md`, transcriptMarkdown(request.videoId, source, cues, request.origin))
await checkpoint(state)

if (state.phase !== 'completed') {
  const client = new GeminiClient({
    key: process.env.GEMINI_API_KEY ?? '', model: process.env.GEMINI_MODEL ?? '',
    maxCalls: boundedInteger(process.env.ANALYSIS_MAX_CALLS, 20, 20),
    intervalMs: Math.max(15, boundedInteger(process.env.ANALYSIS_INTERVAL_SECONDS, 15, 120)) * 1000,
  })
  let sources = sourcesSchema.parse([])
  try {
    sources = sourcesSchema.parse(JSON.parse(await readFile(`requests/${request.videoId}.sources.json`, 'utf8')))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  const search = process.env.GEMINI_SEARCH_ENABLED === 'true'
  // Fail before spending inference quota when evidence retrieval has not been configured.
  if (!search && !sources.length) throw new Error('Forneça requests/VIDEO_ID.sources.json ou habilite GEMINI_SEARCH_ENABLED com uma ferramenta de busca disponível na sua cota.')
  const audit = async (entry: unknown) => {
    await appendFile(`${directory}/provenance.jsonl`, `${JSON.stringify({ at: new Date().toISOString(), model: client.model, promptVersion: 'full-transcript-v1', commit: process.env.GITHUB_SHA ?? null, runId: process.env.GITHUB_RUN_ID ?? null, ...entry as object })}\n`)
  }
  try {
    await processBatch({ client, video, cues, referenceDate: request.referenceDate,
      batchSize: boundedInteger(process.env.ANALYSIS_BATCH_SIZE, 8, 8), sources, search, state, checkpoint, audit })
  } finally {
    await audit({ stage: 'budget', calls: client.calls, maxCalls: client.maxCalls, intervalMs: client.intervalMs })
  }
}

if (state.phase === 'completed' && state.inventory.length) {
  const report = completedReport(video, cues, state)
  // A completed rerun preserves editorial corrections already made in report.json.
  try { await readFile(`${directory}/report.json`) } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    await writeFile(`${directory}/report.json`, `${JSON.stringify(report, null, 2)}\n`)
    await writeFile(`${directory}/review.md`, reviewMarkdown(report))
  }
}
if (state.phase === 'completed' && !state.inventory.length) throw new Error('Nenhuma afirmação factual identificada. Revise o inventário; não há relatório para publicar.')
console.log(`${state.phase}: ${state.nextWindow}/${state.totalWindows} janelas; ${state.claims.length}/${state.inventory.length} afirmações. Progresso salvo em ${directory}.`)
