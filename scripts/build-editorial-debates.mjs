import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { buildEditorialDebate } from './analysis/editorial.ts'

const sources = JSON.parse(await readFile('reviews/sources-2025.json', 'utf8'))
for (const id of ['C0ucX3GZo-c', 'l78NZP7riOA', 'nPLJs6xPNWU']) {
  const review = JSON.parse(await readFile(`reviews/${id}.json`, 'utf8'))
  const transcript = await readFile(`requests/${id}.srt`, 'utf8')
  const result = buildEditorialDebate(review, transcript, sources)
  await mkdir('transcripts', { recursive: true })
  await writeFile(`transcripts/${id}.md`, result.transcriptMarkdown)
  await writeFile(`snapshots/${id}.md`, result.markdown)
  await writeFile(`reviews/${id}.md`, result.auditMarkdown)
  console.log(`${id}: ${result.report.claims.length} afirmações; ${result.report.coverage.cueCount} blocos integrais.`)
}
