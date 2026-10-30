import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { buildEditorialDebate } from './analysis/editorial.ts'

const reviewFiles = await readdir('reviews')
const sources = {}
for (const name of reviewFiles.filter((name) => /^sources-.*\.json$/.test(name)).sort()) {
  const catalog = JSON.parse(await readFile(`reviews/${name}`, 'utf8'))
  for (const [key, source] of Object.entries(catalog)) {
    if (sources[key] && JSON.stringify(sources[key]) !== JSON.stringify(source)) throw new Error(`Fonte duplicada com conteúdo divergente: ${key}`)
    sources[key] = source
  }
}
for (const filename of reviewFiles.filter((name) => /^[\w-]{11}\.json$/.test(name)).sort()) {
  const id = filename.slice(0, -5)
  const review = JSON.parse(await readFile(`reviews/${id}.json`, 'utf8'))
  const transcript = await readFile(`requests/${id}.srt`, 'utf8')
  const result = buildEditorialDebate(review, transcript, sources)
  await mkdir('transcripts', { recursive: true })
  await writeFile(`transcripts/${id}.md`, result.transcriptMarkdown)
  await writeFile(`snapshots/${id}.md`, result.markdown)
  await writeFile(`reviews/${id}.md`, result.auditMarkdown)
  console.log(`${id}: ${result.report.claims.length} afirmações; ${result.report.coverage.cueCount} blocos integrais.`)
}
