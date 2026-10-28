import { access, appendFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { parseRequest } from './request.ts'
import { parseTranscript } from './transcript.ts'

const issue = JSON.parse(await readFile('.analysis-work/issue.json', 'utf8'))
if (issue.state !== 'open' || issue.pull_request) throw new Error('O pedido precisa ser uma issue aberta.')
const { request, transcript } = parseRequest(issue.body ?? '', issue.number)
try {
  await access(`snapshots/${request.videoId}.md`)
  throw new Error('Este vídeo já está no acervo. A consulta é gratuita e não precisa de novo processamento.')
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
}
await mkdir('.analysis-work', { recursive: true })
let source = transcript
for (const extension of ['srt', 'vtt']) {
  if (source) break
  try {
    source = await readFile(`requests/${request.videoId}.${extension}`, 'utf8')
    request.origin = 'repository'
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
}
if (!source) {
  try {
    source = await readFile(`drafts/${request.videoId}/source.txt`, 'utf8')
    const original = JSON.parse(await readFile(`drafts/${request.videoId}/request.json`, 'utf8'))
    request.origin = original.origin
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
}
if (source) {
  parseTranscript(source)
  await writeFile('.analysis-work/input.txt', source)
} else if (process.env.ALLOW_TRANSCRIPT_FETCH !== 'true') {
  throw new Error('Transcrição indisponível. Forneça SRT/VTT na issue ou em requests/VIDEO_ID.srt; a extração automática exige autorização explícita no workflow.')
} else {
  request.origin = 'youtube-transcript-api'
}
await writeFile('.analysis-work/request.json', `${JSON.stringify(request, null, 2)}\n`)
if (process.env.GITHUB_OUTPUT) {
  await appendFile(process.env.GITHUB_OUTPUT, `video_id=${request.videoId}\nneeds_fetch=${!source}\n`)
}
console.log(`Pedido #${request.issueNumber}: ${request.videoId}; origem: ${request.origin}.`)
