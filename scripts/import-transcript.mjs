import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const [videoId, sourcePath] = process.argv.slice(2)
if (!/^[\w-]{11}$/.test(videoId ?? '') || !sourcePath) {
  throw new Error('Uso: node scripts/import-transcript.mjs VIDEO_ID arquivo.srt')
}
const bytes = await readFile(resolve(sourcePath))
const cues = bytes.toString('utf8').trim().split(/\r?\n\r?\n/).map((block) => {
  const [id, timing, ...lines] = block.split(/\r?\n/)
  if (!/^\d+$/.test(id) || !timing?.includes(' --> ')) throw new Error('Bloco SRT inválido')
  return { id: Number(id), start: timing.split(' --> ')[0], text: lines.join(' ') }
})
const markdown = [
  '# Transcrição — Kim Kataguiri × Jones Manoel',
  '',
  `- Vídeo: https://www.youtube.com/watch?v=${videoId}`,
  '- Origem: arquivo SRT fornecido pelo responsável pelo projeto.',
  '- Legenda automática em português, preservada sem correção editorial.',
  '- Sem diarização: nomes de participantes não são inferidos dos blocos.',
  `- SHA-256 do SRT: \`${createHash('sha256').update(bytes).digest('hex')}\``,
  `- Blocos: ${cues.length}. Primeiro: ${cues[0].start}. Último: ${cues.at(-1).start}.`,
  '',
  ...cues.flatMap((cue) => [`### ${cue.start} · bloco ${cue.id}`, '', cue.text, '']),
].join('\n')
await mkdir('transcripts', { recursive: true })
await writeFile(resolve('transcripts', `${videoId}.md`), markdown)
console.log(`${cues.length} blocos preservados em transcripts/${videoId}.md`)
