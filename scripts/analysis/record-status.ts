import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { parseYouTubeUrl } from '../../src/lib/youtube.ts'
import { issueField } from './request.ts'
import { ineligibleMessage } from './eligibility.ts'

async function optionalJson(path: string) {
  try { return JSON.parse(await readFile(path, 'utf8')) } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    return null
  }
}

const issue = JSON.parse(await readFile('.analysis-work/issue.json', 'utf8'))
const video = parseYouTubeUrl(issueField(issue.body ?? '', 'Vídeo do YouTube'))
if (video) {
  const directory = `drafts/${video.videoId}`
  await mkdir(directory, { recursive: true })
  const success = process.env.OPERATION === 'publish-reviewed' ? process.env.CHECKS_OUTCOME === 'success' : process.env.PROCESS_OUTCOME === 'success'
  const admission = await optionalJson('.analysis-work/admission.json')
  const queued = await optionalJson('.analysis-work/queue-notice.json')
  const failure = await optionalJson('.analysis-work/failure.json')
  const progress = await optionalJson(`${directory}/state.json`)
  const kind = admission?.eligible === false ? 'rejected' : queued ? 'queued' : ['quota', 'transient'].includes(failure?.kind) ? 'queued' : !success ? 'failed' : progress?.phase === 'completed' ? 'review' : 'processing'
  const retryAt = queued?.retryAt ?? failure?.retryAt
  const message = kind === 'rejected' ? ineligibleMessage : queued ? queued.message : failure?.kind === 'quota'
    ? 'A cota de processamento foi atingida. O pedido continua salvo e será retomado automaticamente após a espera de 24 horas, sem novo débito.'
    : failure?.kind === 'transient'
      ? 'O provedor está temporariamente indisponível. O pedido foi preservado para retomada automática após pelo menos seis horas, dentro da cota diária e sem novo débito.'
    : process.env.TRANSCRIPT_OUTCOME === 'failure'
      ? 'Não foi possível obter a legenda deste vídeo. Forneça um arquivo SRT/VTT para a equipe retomar o pedido. Nenhum crédito de análise foi debitado.' : !success
    ? 'Execução interrompida. A equipe precisa conferir legenda, configuração, cota e logs antes de retomar. As etapas já salvas foram preservadas.'
    : process.env.OPERATION === 'publish-reviewed'
      ? 'Relatório revisado preparado na PR. Aguardando merge e publicação.'
      : progress?.phase === 'completed' ? 'Checagem concluída. Aguardando revisão editorial e publicação.'
        : 'Lote salvo. O próximo lote será retomado automaticamente, respeitando a cota; sem novo débito.'
  await writeFile(`${directory}/status.json`, `${JSON.stringify({ interrupted: !success && kind !== 'rejected' && kind !== 'queued', kind, message, ...(retryAt ? { retryAt } : {}),
    runUrl: `https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`,
    updatedAt: new Date().toISOString(),
  }, null, 2)}\n`)
  try { await readFile(`${directory}/progress.md`) } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    await writeFile(`${directory}/progress.md`, `# Processamento — ${video.videoId}\n\n${message}\n`)
  }
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `video_id=${video.videoId}\n`)
}
