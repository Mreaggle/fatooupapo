import { readFileSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { reportSchema } from './report-schema'

const markdown = readFileSync('snapshots/q4T7plSBdJE.md', 'utf8')
const report = reportSchema.parse(JSON.parse(markdown.match(/fato-ou-papo:json\n([\s\S]*?)\n-->/)![1]))
const srt = readFileSync(`mvp/${readdirSync('mvp').find((file) => file.endsWith('.srt'))}`)
const cues = srt.toString('utf8').trim().split(/\r?\n\r?\n/).map((block) => {
  const [id, timing, ...text] = block.split(/\r?\n/)
  const [hours, minutes, seconds] = timing.split(' --> ')[0].replace(',', '.').split(':').map(Number)
  return { id: Number(id), seconds: Math.floor(hours * 3600 + minutes * 60 + seconds), text: text.join(' ') }
})

describe('integridade editorial do primeiro snapshot', () => {
  it('preserva todos os blocos e o hash do SRT original no Markdown', () => {
    const transcript = readFileSync('transcripts/q4T7plSBdJE.md', 'utf8')
    expect(transcript).toContain(createHash('sha256').update(srt).digest('hex'))
    expect(transcript.match(/^### /gm)?.length).toBe(5224)
    for (const cue of cues) expect(transcript).toContain(`bloco ${cue.id}\n\n${cue.text}\n`)
  })

  it('cada citação e timestamp corresponde exatamente aos blocos do SRT', () => {
    for (const claim of report.claims) {
      const selected = cues.filter((cue) => cue.id >= claim.cueStart! && cue.id <= claim.cueEnd!)
      expect(claim.quote, claim.id).toBe(selected.map((cue) => cue.text).join(' '))
      expect(claim.timestampSeconds, claim.id).toBe(selected[0].seconds)
    }
  })

  it('identifica a cobertura parcial e não inventa participantes', () => {
    expect(report.coverage?.kind).toBe('selected-claims')
    expect(report.coverage?.cueCount).toBe(cues.length)
    expect(report.claims.every((claim) => claim.speaker === undefined)).toBe(true)
    expect(report.claims.every((claim) => claim.verdict === 'Inconclusivo' || claim.evidence.length > 0)).toBe(true)
  })
})
