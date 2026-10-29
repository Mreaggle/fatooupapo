import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { ledgerSchema, chargeRequest } from './quota.ts'
import { requestSchema } from './request.ts'
import { parseTranscript } from './transcript.ts'
import { sourcesSchema } from './pipeline.ts'
import { boundedInteger } from './gemini.ts'
import { eligibleTitle, eligibleTranscript, ineligibleMessage } from './eligibility.ts'

const repository = process.env.GITHUB_REPOSITORY
const token = process.env.GH_TOKEN
if (!repository || !/^[\w.-]+\/[\w.-]+$/.test(repository) || !token) throw new Error('Este comando precisa executar no Actions com GH_TOKEN e GITHUB_REPOSITORY.')
const branch = 'analysis/credits'
const path = 'analysis-quota.json'
async function github(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`https://api.github.com/repos/${repository}/${endpoint}`, {
    ...options, redirect: 'error', signal: AbortSignal.timeout(20_000),
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
  })
  if (!response.ok && response.status !== 404) throw new Error(`Não foi possível registrar os créditos no GitHub (HTTP ${response.status}). A IA não será chamada.`)
  return response
}
const issue = JSON.parse(await readFile('.analysis-work/issue.json', 'utf8'))
const request = requestSchema.parse(JSON.parse(await readFile('.analysis-work/request.json', 'utf8')))
if (!/^[a-zA-Z0-9._-]+$/.test(process.env.GEMINI_MODEL ?? '')) throw new Error('Modelo inválido; nenhum crédito foi debitado.')
boundedInteger(process.env.ANALYSIS_BATCH_SIZE, 8, 8)
boundedInteger(process.env.ANALYSIS_MAX_CALLS, 20, 20)
const interval = boundedInteger(process.env.ANALYSIS_INTERVAL_SECONDS, 15, 120)
if (interval < 15) throw new Error('O intervalo mínimo é de 15 segundos; nenhum crédito foi debitado.')
let sources = sourcesSchema.parse([])
try {
  sources = sourcesSchema.parse(JSON.parse(await readFile(`requests/${request.videoId}.sources.json`, 'utf8')))
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
}
if (process.env.GEMINI_SEARCH_ENABLED !== 'true' && !sources.length && process.env.ANALYSIS_PUBLIC_SOURCES_ENABLED === 'false') throw new Error('Configure fontes revisadas ou consulta pública antes de debitar créditos.')
const subtitle = await readFile('.analysis-work/input.txt', 'utf8')
const cues = parseTranscript(subtitle)
const video = JSON.parse(await readFile('.analysis-work/video.json', 'utf8'))
if (!eligibleTitle(video.title) || !eligibleTranscript(cues)) throw new Error(ineligibleMessage)
if (cues.at(-1)!.end > request.durationMinutes * 60) throw new Error('A legenda excede a duração declarada; nenhum crédito foi debitado.')
const response = await github(`contents/${path}?ref=${encodeURIComponent(branch)}`)
const file = response.status === 404 ? null : await response.json() as { content: string; sha: string }
const ledger = file ? ledgerSchema.parse(JSON.parse(Buffer.from(file.content, 'base64').toString('utf8'))) : ledgerSchema.parse({ version: 1, users: {}, requests: {} })
const result = chargeRequest(ledger, {
  issueNumber: request.issueNumber, userId: issue.user.id, login: issue.user.login,
  videoId: request.videoId, referenceDate: request.referenceDate,
  transcriptHash: createHash('sha256').update(subtitle).digest('hex'), durationSeconds: request.durationMinutes * 60,
  textCharacters: cues.map((cue) => cue.text).join(' ').length, fileBytes: Buffer.byteLength(subtitle), now: Date.now(),
})
if (result.changed) {
  const ref = await github(`git/ref/heads/${branch}`)
  if (ref.status === 404) {
    const created = await github('git/refs', { method: 'POST', body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: process.env.GITHUB_SHA }) })
    if (!created.ok) throw new Error('Falha ao criar a branch de créditos. Nenhuma chamada de IA será feita.')
  }
  const saved = await github(`contents/${path}`, {
    method: 'PUT', body: JSON.stringify({ branch, message: `chore: reservar créditos da issue #${request.issueNumber}`,
      content: Buffer.from(`${JSON.stringify(result.ledger, null, 2)}\n`).toString('base64'), ...(file ? { sha: file.sha } : {}) }),
  })
  if (!saved.ok) throw new Error('Falha ao persistir o débito. A IA não será chamada.')
}
await writeFile('.analysis-work/credit-receipt.json', `${JSON.stringify(result.receipt, null, 2)}\n`)
console.log(`${result.changed ? 'Reserva registrada' : 'Reserva reutilizada'}: ${result.receipt.credits} créditos na conta @${issue.user.login}. Retomadas deste pedido não têm novo débito.`)
