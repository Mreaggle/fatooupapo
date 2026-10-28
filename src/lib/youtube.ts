const VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/

export interface ParsedYouTubeUrl {
  videoId: string
  canonicalUrl: string
}

export function parseYouTubeUrl(input: string): ParsedYouTubeUrl | null {
  const value = input.trim()
  if (!value) return null

  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null

  const host = url.hostname.toLowerCase().replace(/^www\./, '')
  let videoId: string | null = null

  if (host === 'youtu.be') {
    videoId = url.pathname.split('/').filter(Boolean)[0] ?? null
  } else if (
    host === 'youtube.com' ||
    host === 'm.youtube.com' ||
    host === 'music.youtube.com' ||
    host === 'youtube-nocookie.com'
  ) {
    if (url.pathname === '/watch') {
      videoId = url.searchParams.get('v')
    } else {
      const parts = url.pathname.split('/').filter(Boolean)
      if (['shorts', 'embed', 'live', 'v'].includes(parts[0])) {
        videoId = parts[1] ?? null
      }
    }
  }

  if (!videoId || !VIDEO_ID_PATTERN.test(videoId)) return null

  return {
    videoId,
    canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
  }
}

export function timestampUrl(videoId: string, seconds: number): string {
  return `https://www.youtube.com/watch?v=${videoId}&t=${Math.max(0, Math.floor(seconds))}s`
}

export function formatTimestamp(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const remaining = safeSeconds % 60

  return hours > 0
    ? [hours, minutes, remaining].map((value) => String(value).padStart(2, '0')).join(':')
    : [minutes, remaining].map((value) => String(value).padStart(2, '0')).join(':')
}
