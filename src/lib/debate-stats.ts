import type { AnalysisReport, Verdict } from '../types'

export const chartVerdicts: { verdict: Verdict; label: string; color: string }[] = [
  { verdict: 'Verdadeiro', label: 'Fato', color: '#34d399' },
  { verdict: 'Majoritariamente verdadeiro', label: 'Majoritariamente fato', color: '#6ee7b7' },
  { verdict: 'Impreciso ou fora de contexto', label: 'Impreciso ou fora de contexto', color: '#fbbf24' },
  { verdict: 'Majoritariamente falso', label: 'Majoritariamente papo', color: '#fb923c' },
  { verdict: 'Falso', label: 'Papo', color: '#f87171' },
  { verdict: 'Inconclusivo', label: 'Inconclusivo', color: '#94a3b8' },
]

export function debateStats(report: AnalysisReport, overrides: Record<string, string | null | undefined> = {}) {
  const names = new Set(report.participants?.filter((person) => person.role === 'guest').map((person) => person.name))
  const counts = new Map<string, Record<Verdict, number>>()
  for (const name of names) counts.set(name, Object.fromEntries(chartVerdicts.map(({ verdict }) => [verdict, 0])) as Record<Verdict, number>)
  let unattributed = 0
  for (const claim of report.claims) {
    // Heuristic speaker suggestions require review before entering a comparison.
    const name = overrides[claim.id] !== undefined ? overrides[claim.id]
      : claim.speakerOrigin === 'fact-check-source' ? claim.speaker : undefined
    if (!name || !names.has(name)) { unattributed += 1; continue }
    counts.get(name)![claim.verdict] += 1
  }
  return {
    unattributed,
    speakers: [...counts].map(([name, values]) => {
      const facts = values.Verdadeiro + values['Majoritariamente verdadeiro']
      const talk = values.Falso + values['Majoritariamente falso']
      return { name, counts: values, total: Object.values(values).reduce((sum, count) => sum + count, 0), facts, talk,
        factPercent: facts + talk ? Math.round(100 * facts / (facts + talk)) : null }
    }),
  }
}
