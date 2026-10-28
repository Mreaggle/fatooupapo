import { parseYouTubeUrl } from './youtube'

export const repositoryUrl = 'https://github.com/Mreaggle/fatooupapo'

export function analysisRequestLinks(input: string, durationMinutes?: number) {
  const video = parseYouTubeUrl(input)
  if (!video) return null
  const request = new URL(`${repositoryUrl}/issues/new`)
  request.searchParams.set('template', 'analysis.yml')
  request.searchParams.set('title', `[Análise] ${video.videoId}`)
  request.searchParams.set('video', video.canonicalUrl)
  if (durationMinutes !== undefined && Number.isInteger(durationMinutes) && durationMinutes > 0 && durationMinutes <= 240) {
    request.searchParams.set('duration', String(durationMinutes))
  }
  const queue = new URL(`${repositoryUrl}/issues`)
  queue.searchParams.set('q', `is:issue ${video.videoId} in:title`)
  return { request: request.toString(), queue: queue.toString() }
}
