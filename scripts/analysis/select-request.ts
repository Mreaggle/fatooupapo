import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { github, readContent } from './github.ts'
import { parseRequest } from './request.ts'

type Issue = { number: number; title: string; body: string | null; state: string; pull_request?: unknown; user: { id: number; login: string } }

export async function selectRequest(workDirectory = '.analysis-work') {
  const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH!, 'utf8'))
  const manual = process.env.GITHUB_EVENT_NAME === 'workflow_dispatch'
  const operation = manual ? process.env.OPERATION : 'process'
  if (!['process', 'publish-reviewed'].includes(operation ?? '')) throw new Error('Operação inválida.')
  if (manual) {
    const response = await github(`collaborators/${encodeURIComponent(process.env.GITHUB_ACTOR!)}/permission`)
    const permission = response.ok ? (await response.json()).permission : null
    if (!['admin', 'maintain', 'write'].includes(permission)) throw new Error('Operação manual exige permissão de escrita.')
    if (operation === 'publish-reviewed' && process.env.REVIEW_CONFIRMED !== 'true') throw new Error('A publicação exige revisão editorial explícita.')
  }
  let candidates: Issue[]
  if (manual || process.env.GITHUB_EVENT_NAME === 'issues') {
    const number = manual ? process.env.ISSUE_NUMBER : String(event.issue?.number ?? '')
    if (!/^[1-9]\d{0,8}$/.test(number ?? '')) throw new Error('Número de pedido inválido.')
    const response = await github(`issues/${number}`)
    if (!response.ok) throw new Error('Pedido indisponível.')
    candidates = [await response.json()]
  } else {
    const response = await github('issues?state=open&sort=created&direction=asc&per_page=100')
    if (!response.ok) throw new Error('Fila indisponível.')
    candidates = await response.json()
  }
  await mkdir(workDirectory, { recursive: true })
  for (const issue of candidates) {
    if (issue.state !== 'open' || issue.pull_request || !issue.title.startsWith('[Análise]')) continue
    if (!issue.body?.includes('- [x] Entendo que o pedido é público')) continue
    let parsed
    try { parsed = parseRequest(issue.body, issue.number) } catch { if (manual) throw new Error('Confira URL, duração e data do pedido.'); continue }
    const report = await github(`contents/snapshots/${parsed.request.videoId}.md?ref=${encodeURIComponent(event.repository.default_branch)}`)
    if (report.ok && operation !== 'publish-reviewed') continue
    if (!manual) {
      const status = await readContent(`drafts/${parsed.request.videoId}/status.json`, `analysis/issue-${issue.number}`)
      const value = status?.value as { kind?: string; retryAt?: string; interrupted?: boolean } | undefined
      if (value && (['rejected', 'review', 'failed', 'published'].includes(value.kind ?? '') || (!value.kind && value.interrupted) || (value.retryAt && Date.parse(value.retryAt) > Date.now()))) continue
    }
    await writeFile(`${workDirectory}/issue.json`, JSON.stringify(issue))
    if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `ready=true\nissue_number=${issue.number}\noperation=${operation}\n`)
    console.log(`Pedido #${issue.number} selecionado para ${operation}.`)
    return
  }
  if (manual) throw new Error('Não há pedido aberto elegível para esta operação.')
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, 'ready=false\n')
  console.log('Nenhum pedido pronto nesta janela.')
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) await selectRequest()
