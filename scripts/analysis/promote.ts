import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { reportSchema } from '../../src/lib/report-schema.ts'
import { reviewMarkdown, stateSchema } from './pipeline.ts'
import { parseTranscript, transcriptMarkdown, transcriptWindows } from './transcript.ts'
import { requestSchema } from './request.ts'
import { createHash } from 'node:crypto'

const [videoId, acknowledgment] = process.argv.slice(2)
if (!/^[\w-]{11}$/.test(videoId ?? '') || acknowledgment !== '--reviewed') {
  throw new Error('Uso após revisão humana: npm run analysis:promote -- VIDEO_ID --reviewed')
}
const directory = `drafts/${videoId}`
const state = stateSchema.parse(JSON.parse(await readFile(`${directory}/state.json`, 'utf8')))
const request = requestSchema.parse(JSON.parse(await readFile(`${directory}/request.json`, 'utf8')))
const report = reportSchema.parse(JSON.parse(await readFile(`${directory}/report.json`, 'utf8')))
const source = await readFile(`${directory}/source.txt`, 'utf8')
const cues = parseTranscript(source)
if (state.phase !== 'completed' || state.nextWindow !== state.totalWindows || state.totalWindows !== transcriptWindows(cues).length || report.claims.length !== state.inventory.length || !report.claims.length || state.claims.length !== state.inventory.length) {
  throw new Error('O debate inteiro precisa ter inventário e checagens concluídos antes da publicação.')
}
if (state.transcriptHash !== createHash('sha256').update(source).digest('hex') || request.videoId !== videoId || report.video.id !== videoId || report.coverage?.transcriptPath !== `transcripts/${videoId}.md`) {
  throw new Error('Relatório, transcrição e pedido não correspondem ao mesmo vídeo.')
}
if (report.summary.includes('exigem revisão editorial antes da publicação')) throw new Error('Substitua o resumo de rascunho por um resumo editorial revisado em report.json.')
if (report.coverage.kind !== 'all-identified-claims' || report.coverage.cueCount !== cues.length || report.coverage.firstTimestamp !== cues[0].start || report.coverage.lastTimestamp !== cues.at(-1)!.start) throw new Error('A cobertura precisa refletir o inventário completo e a transcrição integral.')
if (new Set(report.claims.map((claim) => claim.id)).size !== report.claims.length) throw new Error('IDs de afirmações duplicados.')
for (const [index, claim] of report.claims.entries()) {
  const selection = state.inventory[index]
  if (claim.cueStart !== selection.cueStart || claim.cueEnd !== selection.cueEnd) throw new Error('O relatório precisa preservar a origem de todas as afirmações do inventário.')
  if (!claim.cueStart || !claim.cueEnd || claim.cueStart > claim.cueEnd || claim.cueEnd > cues.length) throw new Error('Intervalo de origem fora da transcrição.')
  const selected = cues.slice(claim.cueStart! - 1, claim.cueEnd)
  if (claim.quote !== selected.map((cue) => cue.text).join(' ') || claim.timestampSeconds !== Math.floor(selected[0]?.start)) {
    throw new Error(`Citação ou timestamp divergente: ${claim.id}.`)
  }
  if (claim.speakerAttribution || claim.speaker) throw new Error('Esta fila não identifica locutores. Revise a atribuição por um processo com evidência própria antes de publicá-la.')
}
for (const destination of [`snapshots/${videoId}.md`, `transcripts/${videoId}.md`]) {
  try {
    await access(destination)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue
    throw error
  }
  throw new Error(`${destination} já existe. Uma revisão do acervo exige atualização editorial explícita.`)
}
await mkdir('snapshots', { recursive: true })
await mkdir('transcripts', { recursive: true })
const markdown = reviewMarkdown(report).replace(/^# Rascunho para revisão — /, '# Relatório — ')
  .replace('**Não publicado.** Conferir áudio, duração, data da fala, afirmações e documentos originais.', 'Revisão editorial declarada pelo responsável pela publicação.')
  .replace(/Edite report\.json[^\n]+\n/, '')
const json = JSON.stringify(report, null, 2).replace(/</g, '\\u003c')
await writeFile(`snapshots/${videoId}.md`, `${markdown}\n<!-- fato-ou-papo:json\n${json}\n-->\n`)
await writeFile(`transcripts/${videoId}.md`, transcriptMarkdown(videoId, source, cues, request.origin))
console.log(`Relatório revisado preparado em snapshots/${videoId}.md. Publique após os checks e o merge da PR.`)
