export interface SpeakerReview {
  version: 1
  quote: string
  name: string | null
}

const key = (videoId: string, claimId: string) => `fato-ou-papo:speaker-review:v1:${videoId}:${claimId}`

export function readSpeakerReview(videoId: string, claimId: string, quote: string): SpeakerReview | null {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(key(videoId, claimId)) ?? 'null')
    if (!raw || typeof raw !== 'object') return null
    const review = raw as Partial<SpeakerReview>
    if (review.version !== 1 || review.quote !== quote) return null
    if (review.name !== null && (typeof review.name !== 'string' || !review.name.trim() || review.name.length > 80)) return null
    return review as SpeakerReview
  } catch {
    return null
  }
}

export function saveSpeakerReview(videoId: string, claimId: string, review: SpeakerReview): boolean {
  try {
    localStorage.setItem(key(videoId, claimId), JSON.stringify(review))
    return true
  } catch {
    return false
  }
}

export function removeSpeakerReview(videoId: string, claimId: string): boolean {
  try { localStorage.removeItem(key(videoId, claimId)); return true } catch { return false }
}
