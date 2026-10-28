import type { Participant, SpeakerAttribution } from '../types'

export interface SpeechCue {
  id: number
  startSeconds: number
  endSeconds: number
  text: string
}

export interface ParticipantHint {
  name: string
  aliases: string[]
  role: 'guest' | 'host'
}

export interface SpeakerAnchor {
  participantId: string
  kind: SpeakerAttribution['anchor']['kind']
  cueStart: number
  cueEnd: number
  text: string
  startSeconds: number
  strength: number
}

export function normalizeSpeech(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const participantId = (name: string) => normalizeSpeech(name).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const titleCase = (name: string) => name.toLocaleLowerCase('pt-BR').replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase('pt-BR'))

/** O título produz candidatos; nunca determina ordem ou autoria de um trecho. */
export function discoverParticipants(title: string, cues: SpeechCue[], hints: ParticipantHint[] = []): Participant[] {
  const names = title.replace(/^.*?debate\s*:\s*/i, '').split(/\s+[—–-]\s+/)[0].split(/\s+(?:x|×|vs\.?|versus|contra)\s+/i)
  const participants: Participant[] = names.length > 1 ? names.map<Participant>((raw) => {
    const name = titleCase(raw.trim())
    const hint = hints.find((item) => normalizeSpeech(item.name) === normalizeSpeech(name))
    return { id: participantId(name), name, aliases: hint?.aliases ?? [], role: 'guest', source: 'video-title' }
  }).filter((item) => item.name.length > 2 && item.name.length <= 80) : []

  const opening = normalizeSpeech(cues.filter((cue) => cue.startSeconds <= 12 * 60).map((cue) => cue.text).join(' '))
  for (const hint of hints.filter((item) => item.role === 'host')) {
    const aliases = [hint.name, ...hint.aliases].map((name) => escapeRegex(normalizeSpeech(name))).join('|')
    if (new RegExp(`\\b(?:meu nome e|eu sou|sou|me chamo) (?:${aliases})\\b`).test(opening)) {
      participants.push({ id: participantId(hint.name), ...hint, source: 'self-introduction' })
    }
  }
  // Um anfitrião fora do título pode ser descoberto por uma apresentação explícita.
  const originalOpening = cues.filter((cue) => cue.startSeconds <= 12 * 60).map((cue) => cue.text).join(' ')
  const introduction = /(?:[Mm]eu nome [ée]|[Ee]u [Ss]ou|sou|Sou|[Mm]e chamo) ([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][\p{L}'-]+(?: [A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][\p{L}'-]+){1,3})/gu
  for (const match of originalOpening.matchAll(introduction)) {
    const name = match[1].split(/\s+(?:Eu|Sou|Estou|Hoje)\b/)[0]
    const context = normalizeSpeech(originalOpening.slice(match.index, match.index + 240))
    if (!/\b(?:anfitriao|apresentador|apresentadora)\b/.test(context)) continue
    if (participants.some((item) => [item.name, ...item.aliases].map(normalizeSpeech).includes(normalizeSpeech(name)))) continue
    participants.push({ id: participantId(name), name, aliases: [], role: 'host', source: 'self-introduction' })
  }
  return participants.filter((item, index) => participants.findIndex((other) => other.id === item.id) === index)
}

/** Regras locais, sem modelo, rede ou ordem predefinida de participantes. */
export function detectSpeakerAnchors(cues: SpeechCue[], participants: Participant[]): SpeakerAnchor[] {
  let offset = 0
  const indexed = cues.map((cue) => {
    const text = normalizeSpeech(cue.text)
    const item = { ...cue, offset, normalized: text }
    offset += text.length + 1
    return item
  })
  const transcript = indexed.map((cue) => cue.normalized).join(' ')
  const cueAt = (position: number) => indexed.find((cue) => cue.offset + cue.normalized.length >= position) ?? indexed.at(-1)!
  const events: Array<{ start: number; end: number; participantId?: string; kind: SpeakerAnchor['kind']; strength: number }> = []

  for (const participant of participants) {
    const surname = participant.name.split(' ').slice(1).join(' ')
    const expanded = participant.aliases.filter((alias) => !alias.includes(' ')).map((alias) => `${alias} ${surname}`.trim())
    const aliases = [...new Set([participant.name, participant.name.split(' ')[0], ...participant.aliases, ...expanded].map(normalizeSpeech))]
      .filter((name) => name.length >= 3 && !participants.some((other) => other.id !== participant.id && [other.name, other.name.split(' ')[0], ...other.aliases].map(normalizeSpeech).includes(name)))
      .sort((a, b) => b.length - a.length).map(escapeRegex).join('|')
    if (!aliases) continue
    const name = `(?:${aliases})\\b`
    const duration = '(?:[235]|3s|tres|cinco) minutos?'
    const preposition = '(?:pra|para|paraa|pro|praa)(?: (?:pra|para|paraa|pro|praa))?'
    const patterns: Array<{ pattern: string; kind: SpeakerAnchor['kind']; strength: number }> = [
      { pattern: `\\b(?:meu nome e|eu sou|sou|me chamo) ${name}`, kind: 'self-introduction', strength: 0.98 },
      { pattern: `\\b(?:vamos la|vai la|encerramento|sua vez agora|sua vez) (?:deputado )?${name}`, kind: 'named-handoff', strength: 0.94 },
      { pattern: `\\b${duration} ${preposition} (?:a )?(?:resposta|replica|treplica|comentarios) (?:do |da )?${name}`, kind: 'named-handoff', strength: 0.94 },
      { pattern: `\\b${name} ${duration} ${preposition} (?:a )?(?:resposta|replica|treplica)`, kind: 'named-handoff', strength: 0.94 },
      { pattern: `\\b(?:primeira pergunta|ultima pergunta|pergunta do chat) ${preposition} (?:pro )?${name}`, kind: 'named-handoff', strength: 0.9 },
      { pattern: `\\bpergunta ${preposition} ${name} (?:eh leo|do chat)`, kind: 'named-handoff', strength: 0.9 },
      { pattern: `\\b(?:entao|agora) ${name} (?:primeira pergunta|pergunte|e contigo)`, kind: 'named-handoff', strength: 0.9 },
      { pattern: `\\b(?:foi sorteado )?${name} faz a (?:primeira|proxima) pergunta`, kind: 'named-handoff', strength: 0.94 },
      { pattern: `\\b(?:emenda|emendar) a (?:terceira|proxima) pergunta.{0,35}\\b${name}`, kind: 'named-handoff', strength: 0.9 },
    ]
    for (const { pattern, kind, strength } of patterns) {
      for (const match of transcript.matchAll(new RegExp(pattern, 'g'))) {
        const prefix = transcript.slice(Math.max(0, match.index - 70), match.index)
        // Citações de uma regra não são uma passagem efetiva de palavra.
        if (/(?:ele (?:disse|falou)|ela (?:disse|falou)|na minha pergunta|eu tenho|voce tem|cada um vai ter) [^.!?]{0,40}$/.test(prefix)) continue
        events.push({ start: match.index, end: match.index + match[0].length, participantId: participant.id, kind, strength })
      }
    }
  }

  const transition = /\b(?:(?:[235]|3s|tres|cinco) minutos? (?:pra|para|paraa) (?:a )?(?:replica|treplica|comentarios)|(?:vamos (?:pra|para) (?:a )?)?treplica(?: entao)?|replica de (?:3|tres|tr) minutos|replica) (?:vamos la|perfeito|veja|qu vamos la)/g
  for (const match of transcript.matchAll(transition)) {
    if (events.some((event) => event.start <= match.index + match[0].length && event.end >= match.index)) continue
    events.push({ start: match.index, end: match.index + match[0].length, kind: 'reply-transition', strength: 0.78 })
  }

  const anchors: SpeakerAnchor[] = []
  const guests = participants.filter((item) => item.role === 'guest')
  for (const event of events.sort((a, b) => a.end - b.end)) {
    const first = cueAt(event.start)
    const last = cueAt(event.end)
    const previous = anchors.at(-1)
    // Só uma réplica explícita num diálogo de dois convidados permite inferir o outro.
    const inferred = !event.participantId && guests.length === 2 && previous && first.startSeconds - previous.startSeconds < 390
      ? guests.find((guest) => guest.id !== previous.participantId && guests.some((item) => item.id === previous.participantId))?.id
      : undefined
    const id = event.participantId ?? inferred
    if (!id) {
      // Uma mudança explícita sem destinatário seguro invalida o contexto anterior.
      anchors.push({ participantId: 'unknown', kind: event.kind, cueStart: first.id, cueEnd: last.id, text: first.text, startSeconds: last.endSeconds, strength: 0 })
      continue
    }
    if (previous && previous.cueEnd >= first.id && previous.participantId === id) continue
    anchors.push({
      participantId: id, kind: event.kind, cueStart: first.id, cueEnd: last.id,
      text: cues.filter((cue) => cue.id >= first.id && cue.id <= last.id).map((cue) => cue.text).join(' '),
      startSeconds: last.endSeconds,
      strength: event.kind === 'reply-transition' ? Math.min(event.strength, previous?.strength ?? 0) : event.strength,
    })
  }
  return anchors
}

export function attributeSpeaker(
  cueStart: number,
  cueEnd: number,
  cues: SpeechCue[],
  anchors: SpeakerAnchor[],
  participants: Participant[],
): SpeakerAttribution | undefined {
  const selected = cues.filter((cue) => cue.id >= cueStart && cue.id <= cueEnd)
  if (selected.length === 0) return undefined
  const first = selected[0]
  const last = selected.at(-1)!
  const anchor = [...anchors].reverse().find((item) => item.cueEnd < cueStart)
  if (!anchor || anchors.some((item) => item.cueStart >= cueStart && item.cueStart <= cueEnd)) return undefined
  const age = first.startSeconds - anchor.startSeconds
  const maxAge = anchor.kind === 'reply-transition' ? 240 : 360
  if (age < 0 || age > maxAge || last.endSeconds - anchor.startSeconds > maxAge + 15) return undefined
  // Combina a passagem de palavra, sua proximidade e a ausência de nova transição.
  // Índice determinístico não calibrado: não é uma probabilidade de identidade vocal.
  const score = Math.round(100 * anchor.strength * (1 - 0.2 * age / maxAge))
  if (score < 65) return undefined
  const participant = participants.find((item) => item.id === anchor.participantId)
  if (!participant) return undefined
  return {
    participantId: participant.id, name: participant.name, score,
    scoreKind: 'uncalibrated-text-evidence', method: 'text-rules-v1', needsReview: true,
    anchor: { kind: anchor.kind, cueStart: anchor.cueStart, cueEnd: anchor.cueEnd, text: anchor.text },
  }
}
