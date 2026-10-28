import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { parseYouTubeUrl } from '../../src/lib/youtube.ts'
import { issueField } from './request.ts'

const issue = JSON.parse(await readFile('.analysis-work/issue.json', 'utf8'))
const video = parseYouTubeUrl(issueField(issue.body ?? '', 'Vídeo do YouTube'))
if (video) {
  const directory = `drafts/${video.videoId}`
  await mkdir(directory, { recursive: true })
  const success = process.env.OPERATION === 'publish-reviewed' ? process.env.CHECKS_OUTCOME === 'success' : process.env.PROCESS_OUTCOME === 'success'
  const message = !success
    ? 'Execução interrompida. A equipe precisa conferir legenda, configuração, cota e logs antes de retomar. As etapas já salvas foram preservadas.'
    : process.env.OPERATION === 'publish-reviewed'
      ? 'Relatório revisado preparado na PR. Aguardando merge e publicação.'
      : 'Lote salvo. A equipe pode retomar o pedido respeitando o orçamento diário; o mesmo pedido não terá novo débito.'
  await writeFile(`${directory}/status.json`, `${JSON.stringify({ interrupted: !success, message,
    runUrl: `https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`,
    updatedAt: new Date().toISOString(),
  }, null, 2)}\n`)
  try { await readFile(`${directory}/progress.md`) } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    await writeFile(`${directory}/progress.md`, `# Processamento — ${video.videoId}\n\n${message}\n`)
  }
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `video_id=${video.videoId}\n`)
}
