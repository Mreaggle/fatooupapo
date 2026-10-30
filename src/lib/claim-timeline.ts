import type { Claim } from '../types'

export interface ClaimMoment {
  timestampSeconds: number
  claims: Claim[]
}

export function buildClaimTimeline(claims: Claim[]): ClaimMoment[] {
  const moments = new Map<number, Claim[]>()
  for (const claim of claims) {
    const group = moments.get(claim.timestampSeconds) ?? []
    group.push(claim)
    moments.set(claim.timestampSeconds, group)
  }
  return [...moments].sort(([a], [b]) => a - b).map(([timestampSeconds, group]) => ({ timestampSeconds, claims: group }))
}

export function activeMomentIndex(moments: ClaimMoment[], seconds: number): number {
  if (!Number.isFinite(seconds) || seconds < 0) return -1
  // Find the latest timestamp reached, including when seeking backwards.
  let low = 0
  let high = moments.length
  while (low < high) {
    const middle = Math.floor((low + high) / 2)
    if (moments[middle].timestampSeconds <= seconds) low = middle + 1
    else high = middle
  }
  return low - 1
}
