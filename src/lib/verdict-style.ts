import type { Verdict } from '../types'

export const verdictStyle: Record<Verdict, string> = {
  Verdadeiro: 'verdict--true',
  'Majoritariamente verdadeiro': 'verdict--mostly-true',
  'Impreciso ou fora de contexto': 'verdict--misleading',
  'Majoritariamente falso': 'verdict--mostly-false',
  Falso: 'verdict--false',
  Inconclusivo: 'verdict--inconclusive',
}
