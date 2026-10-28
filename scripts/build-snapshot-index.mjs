import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { reportSchema } from '../src/lib/report-schema.ts'

const sourceDirectory = resolve('snapshots')
const outputDirectory = resolve('public/snapshots')
const outputFile = resolve(outputDirectory, 'index.json')
const marker = /<!--\s*fato-ou-papo:json\s*\n([\s\S]*?)\n-->/

await mkdir(sourceDirectory, { recursive: true })
await mkdir(outputDirectory, { recursive: true })

const reports = {}
const files = (await readdir(sourceDirectory)).filter((file) => file.endsWith('.md') && file !== 'README.md')

for (const file of files) {
  const contents = await readFile(resolve(sourceDirectory, file), 'utf8')
  const match = contents.match(marker)
  if (!match) throw new Error(`${file}: bloco "fato-ou-papo:json" ausente`)

  let report
  try {
    report = JSON.parse(match[1])
  } catch (error) {
    throw new Error(`${file}: JSON inválido (${error.message})`)
  }

  report = reportSchema.parse(report)
  if (file !== `${report.video.id}.md`) throw new Error(`${file}: nome deve ser o ID do vídeo`)
  if (reports[report.video.id]) throw new Error(`${file}: snapshot duplicado para ${report.video.id}`)
  if (new Set(report.claims.map((claim) => claim.id)).size !== report.claims.length) {
    throw new Error(`${file}: identificadores de afirmações duplicados`)
  }

  if (report.coverage) {
    const transcript = await readFile(resolve(report.coverage.transcriptPath), 'utf8')
    for (const claim of report.claims) {
      if (!claim.cueStart || !claim.cueEnd) throw new Error(`${file}: origem do trecho ausente`)
      const escapedStart = String(claim.cueStart)
      const escapedEnd = String(claim.cueEnd + 1)
      const start = transcript.search(new RegExp(`### .* · bloco ${escapedStart}\\n`))
      const end = transcript.search(new RegExp(`### .* · bloco ${escapedEnd}\\n`))
      if (start < 0) throw new Error(`${file}: bloco inicial da afirmação não existe`)
      const text = transcript.slice(start, end < 0 ? undefined : end).replace(/^### .*$/gm, '').replace(/\s+/g, ' ').trim()
      if (text !== claim.quote) throw new Error(`${file}: citação diverge da transcrição em ${claim.id}`)
    }
    await mkdir(resolve('public/transcripts'), { recursive: true })
    await copyFile(resolve(report.coverage.transcriptPath), resolve('public', report.coverage.transcriptPath))
  }
  await mkdir(resolve('public/reports'), { recursive: true })
  await copyFile(resolve(sourceDirectory, file), resolve('public/reports', file))

  reports[report.video.id] = report
}

const analyzedDates = Object.values(reports).map((report) => Date.parse(report.analyzedAt)).filter(Number.isFinite)
const generatedAt = new Date(analyzedDates.length > 0 ? Math.max(...analyzedDates) : 0).toISOString()
await writeFile(outputFile, `${JSON.stringify({ generatedAt, reports }, null, 2)}\n`)
console.log(`Índice criado com ${files.length} snapshot(s).`)
