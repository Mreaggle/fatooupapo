import { describe, expect, it } from 'vitest'
import type { Claim } from '../types'
import { activeMomentIndex, buildClaimTimeline } from './claim-timeline'

function claim(id: string, timestampSeconds: number): Claim {
  return { id, timestampSeconds, quote: id, explanation: id, verdict: 'Inconclusivo', evidence: [] }
}

describe('linha do tempo das checagens', () => {
  it('ordena sem alterar o relatório e agrupa afirmações no mesmo timestamp', () => {
    const claims = [claim('depois', 20), claim('primeira', 10.5), claim('simultânea', 10.5)]
    const moments = buildClaimTimeline(claims)
    expect(moments.map((moment) => moment.claims.map((item) => item.id))).toEqual([['primeira', 'simultânea'], ['depois']])
    expect(claims.map((item) => item.id)).toEqual(['depois', 'primeira', 'simultânea'])
  })

  it('sincroniza os limites exatos, intervalos, fim e retorno do vídeo', () => {
    const moments = buildClaimTimeline([claim('a', 10.5), claim('b', 20)])
    for (const [seconds, expected] of [[0, -1], [10.49, -1], [10.5, 0], [19.99, 0], [20, 1], [100, 1], [11, 0], [0, -1], [NaN, -1], [-1, -1]]) {
      expect(activeMomentIndex(moments, seconds)).toBe(expected)
    }
    expect(activeMomentIndex([], 100)).toBe(-1)
    expect(activeMomentIndex(buildClaimTimeline([claim('início', 0)]), 0)).toBe(0)
  })
})
