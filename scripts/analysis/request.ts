import { z } from 'zod'
import { parseYouTubeUrl } from '../../src/lib/youtube.ts'

export const requestSchema = z.object({
  videoId: z.string().regex(/^[\w-]{11}$/),
  referenceDate: z.iso.date(),
  issueNumber: z.number().int().positive(),
  durationMinutes: z.number().positive().max(240),
  origin: z.enum(['issue', 'repository', 'youtube-transcript-api']),
})

export function issueField(body: string, heading: string) {
  const sections = body.replace(/\r\n/g, '\n').split(/^### /m)
  const section = sections.find((part) => part.startsWith(`${heading}\n`))
  const value = section?.slice(heading.length).trim() ?? ''
  return value === '_No response_' ? '' : value
}

export function parseRequest(body: string, issueNumber: number) {
  const video = parseYouTubeUrl(issueField(body, 'Vídeo do YouTube'))
  if (!video) throw new Error('O campo Vídeo do YouTube precisa conter um link válido.')
  const referenceDate = issueField(body, 'Data de referência')
  const raw = issueField(body, 'Legenda SRT ou VTT')
  const transcript = raw.replace(/^```[^\n]*\n/, '').replace(/\n```$/, '').trim()
  return {
    request: requestSchema.parse({ videoId: video.videoId, referenceDate, issueNumber, durationMinutes: Number(issueField(body, 'Duração em minutos')), origin: 'issue' }),
    transcript,
  }
}
