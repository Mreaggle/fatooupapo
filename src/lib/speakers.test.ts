import { describe, expect, it } from 'vitest'
import { attributeSpeaker, detectSpeakerAnchors, discoverParticipants, type SpeechCue } from './speakers'

const cues = (...entries: Array<[number, string]>): SpeechCue[] => entries.map(([time, text], index) => ({ id: index + 1, startSeconds: time, endSeconds: time + 2, text }))
const title = 'DEBATE: ANA SILVA X BRUNO COSTA — Canal'

describe('identificação determinística de locutores', () => {
  it('usa o título para candidatos, sem atribuir falas pelo nome ou pela ordem', () => {
    const text = cues([0, 'Bruno discorda de Ana.'], [10, 'O dado cresceu.'])
    const participants = discoverParticipants(title, text)
    expect(participants.map((person) => person.name)).toEqual(['Ana Silva', 'Bruno Costa'])
    expect(detectSpeakerAnchors(text, participants)).toEqual([])
  })

  it.each([title, 'DEBATE: BRUNO COSTA X ANA SILVA — Canal'])('reconhece autoapresentação com ordem de título: %s', (title) => {
    const text = cues([0, 'Olá, meu nome é Bruno Costa.'], [5, 'O dado é de 2024.'])
    const participants = discoverParticipants(title, text)
    const result = attributeSpeaker(2, 2, text, detectSpeakerAnchors(text, participants), participants)
    expect(result?.name).toBe('Bruno Costa')
    expect(result?.scoreKind).toBe('uncalibrated-text-evidence')
    expect(result?.needsReview).toBe(true)
  })

  it('segue uma passagem nominal real e reduz o índice conforme a distância', () => {
    const text = cues([0, 'Cinco minutos para resposta Ana.'], [5, 'Primeira afirmação.'], [150, 'Outra afirmação.'])
    const participants = discoverParticipants(title, text)
    const anchors = detectSpeakerAnchors(text, participants)
    const first = attributeSpeaker(2, 2, text, anchors, participants)
    const later = attributeSpeaker(3, 3, text, anchors, participants)
    expect(first?.name).toBe('Ana Silva')
    expect(later?.name).toBe('Ana Silva')
    expect(first!.score).toBeGreaterThan(later!.score)
  })

  it('não perpetua o último nome indefinidamente', () => {
    const text = cues([0, 'Vamos lá Ana.'], [700, 'Outra pessoa pode estar falando.'])
    const participants = discoverParticipants(title, text)
    expect(attributeSpeaker(2, 2, text, detectSpeakerAnchors(text, participants), participants)).toBeUndefined()
  })

  it('infere uma réplica somente a partir de uma troca explícita entre dois convidados', () => {
    const text = cues([0, 'Vamos lá Ana.'], [10, 'Um dado.'], [20, 'Três minutos para réplica vamos lá.'], [25, 'Outro dado.'])
    const participants = discoverParticipants(title, text)
    const result = attributeSpeaker(4, 4, text, detectSpeakerAnchors(text, participants), participants)
    expect(result?.name).toBe('Bruno Costa')
    expect(result?.anchor.kind).toBe('reply-transition')
  })

  it('se abstém numa réplica com três convidados ou sem contexto anterior', () => {
    const text = cues([0, 'Vamos lá Ana.'], [10, 'Três minutos para réplica vamos lá.'], [15, 'Outro dado.'])
    const participants = discoverParticipants('DEBATE: ANA SILVA X BRUNO COSTA X CARLA LUZ', text)
    expect(attributeSpeaker(3, 3, text, detectSpeakerAnchors(text, participants), participants)).toBeUndefined()
    const orphan = cues([0, 'Três minutos para réplica vamos lá.'], [15, 'Outro dado.'])
    expect(attributeSpeaker(2, 2, orphan, detectSpeakerAnchors(orphan, participants), participants)).toBeUndefined()
  })

  it('não atribui uma citação que atravessa uma troca de locutor', () => {
    const text = cues([0, 'Vamos lá Ana.'], [5, 'Um dado.'], [10, 'Vamos lá Bruno.'], [15, 'Outro dado.'])
    const participants = discoverParticipants(title, text)
    expect(attributeSpeaker(2, 4, text, detectSpeakerAnchors(text, participants), participants)).toBeUndefined()
  })

  it('não resolve um primeiro nome compartilhado pela ordem dos candidatos', () => {
    const text = cues([0, 'Vamos lá Ana.'], [5, 'Um dado.'])
    const participants = discoverParticipants('DEBATE: ANA SILVA X ANA LUZ', text)
    expect(attributeSpeaker(2, 2, text, detectSpeakerAnchors(text, participants), participants)).toBeUndefined()
  })

  it('só aceita um apresentador sugerido quando encontra sua autoapresentação', () => {
    const hint = [{ name: 'Rogério Vilela', aliases: ['Rogério Vila'], role: 'host' as const }]
    expect(discoverParticipants(title, cues([0, 'Boa tarde.']), hint).some((person) => person.role === 'host')).toBe(false)
    expect(discoverParticipants(title, cues([0, 'Olá sou Rogério Vila.']), hint).some((person) => person.name === 'Rogério Vilela')).toBe(true)
  })

  it('descobre um apresentador pela introdução mesmo sem fornecer seu nome antes', () => {
    const text = cues([0, 'Olá, sou Carlos Pereira, o apresentador deste programa.'], [5, 'Hoje temos um debate.'])
    const participants = discoverParticipants(title, text)
    expect(participants.find((person) => person.role === 'host')?.name).toBe('Carlos Pereira')
    expect(attributeSpeaker(2, 2, text, detectSpeakerAnchors(text, participants), participants)?.name).toBe('Carlos Pereira')
  })
})
