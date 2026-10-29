import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { eligibleTitle, eligibleTranscript, ineligibleMessage } from './eligibility.ts'
import { requestSchema } from './request.ts'
import { parseTranscript } from './transcript.ts'

const request = requestSchema.parse(JSON.parse(await readFile('.analysis-work/request.json', 'utf8')))
await mkdir('.analysis-work', { recursive: true })
async function reject() {
  await writeFile('.analysis-work/admission.json', JSON.stringify({ eligible: false, message: ineligibleMessage }))
  throw new Error(ineligibleMessage)
}
if (process.argv.includes('--transcript')) {
  if (!eligibleTranscript(parseTranscript(await readFile('.analysis-work/input.txt', 'utf8')))) await reject()
} else {
  const url = `https://www.youtube.com/watch?v=${request.videoId}`
  const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, { signal: AbortSignal.timeout(20_000) })
  if (!response.ok) throw new Error('Não foi possível verificar este vídeo no YouTube. Tente novamente mais tarde.')
  const metadata = await response.json() as { title?: string; author_name?: string }
  if (!metadata.title || !metadata.author_name) throw new Error('Não foi possível verificar este vídeo no YouTube. Tente novamente mais tarde.')
  if (!eligibleTitle(metadata.title)) await reject()
  await writeFile('.analysis-work/video.json', JSON.stringify({ id: request.videoId, url, title: metadata.title, channel: metadata.author_name, thumbnailUrl: `https://i.ytimg.com/vi/${request.videoId}/hqdefault.jpg` }))
}
console.log('Verificação de elegibilidade concluída.')
