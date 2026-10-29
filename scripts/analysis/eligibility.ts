import type { Cue } from './transcript.ts'

export const ineligibleMessage = 'Este vídeo não requer fact-checking.'

// Server-side admission policy. Do not send individual rules/reasons to the UI.
export function eligibleTitle(title: string) {
  const normalized = title.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
  return /\bdebate\b/.test(normalized)
    && !/\b(react|reaction|reacao|reagindo|reage|comentando|comenta|analisando|analisa|cortes?|highlights|parodia|simulacao|gameplay)\b|melhores momentos|pos[ -]debate|sobre o debate|analise d[eo] debate|repercussao d[eo] debate/.test(normalized)
}

export function eligibleTranscript(cues: Cue[]) {
  if (!cues.length || cues.at(-1)!.end < 1200 || cues.at(-1)!.end > 14400 || cues.length < 100) return false
  const text = cues.map((cue) => cue.text).join(' ').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
  const patterns = [/\bpergunta\b/, /\bresposta\b/, /\breplica\b/, /\bcandidatos?\b/, /\b(palavra|tempo)\b/]
  return text.split(/\s+/).length >= 1500 && patterns.filter((pattern) => pattern.test(text)).length >= 3
}
