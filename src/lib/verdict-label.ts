import type { Verdict } from '../types'

export function verdictLabel(verdict: Verdict): string {
  const labels: Record<Verdict, string> = {
    Verdadeiro: 'Fato',
    'Majoritariamente verdadeiro': 'Majoritariamente fato',
    'Impreciso ou fora de contexto': 'Impreciso ou fora de contexto',
    'Majoritariamente falso': 'Majoritariamente papo',
    Falso: 'Papo',
    Inconclusivo: 'Inconclusivo',
  }
  return labels[verdict]
}
