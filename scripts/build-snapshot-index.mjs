import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const sourceDirectory = resolve('snapshots')
const outputDirectory = resolve('public/snapshots')
const outputFile = resolve(outputDirectory, 'index.json')
const marker = /<!--\s*fato-ou-papo:json\s*\n([\s\S]*?)\n-->/
const videoIdPattern = /^[a-zA-Z0-9_-]{11}$/

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

  if (report.schemaVersion !== 1 || report.status !== 'completed') {
    throw new Error(`${file}: schemaVersion/status incompatível`)
  }
  if (!videoIdPattern.test(report.video?.id ?? '')) {
    throw new Error(`${file}: ID de vídeo inválido`)
  }
  if (!Array.isArray(report.claims)) throw new Error(`${file}: claims deve ser uma lista`)
  if (reports[report.video.id]) throw new Error(`${file}: snapshot duplicado para ${report.video.id}`)

  reports[report.video.id] = report
}

const analyzedDates = Object.values(reports).map((report) => Date.parse(report.analyzedAt)).filter(Number.isFinite)
const generatedAt = new Date(analyzedDates.length > 0 ? Math.max(...analyzedDates) : 0).toISOString()
await writeFile(outputFile, `${JSON.stringify({ generatedAt, reports }, null, 2)}\n`)
console.log(`Índice criado com ${files.length} snapshot(s).`)
