import { afterEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SpeakerLabel } from './SpeakerLabel'
import type { Claim, Participant } from '../types'

const participants: Participant[] = [
  { id: 'jones-manoel', name: 'Jones Manoel', aliases: [], role: 'guest', source: 'video-title' },
  { id: 'kim-kataguiri', name: 'Kim Kataguiri', aliases: [], role: 'guest', source: 'video-title' },
]
const claim: Claim = { id: 'teste', quote: 'Trecho de teste.', timestampSeconds: 10, verdict: 'Inconclusivo', explanation: 'Exemplo de teste.', evidence: [], speakerAttribution: {
  participantId: 'jones-manoel', name: 'Jones Manoel', score: 88, scoreKind: 'uncalibrated-text-evidence', method: 'text-rules-v1', needsReview: true,
  anchor: { kind: 'named-handoff', cueStart: 1, cueEnd: 1, text: 'Vamos lá Jones.' },
} }

afterEach(() => localStorage.clear())

describe('locutor e revisão pelo usuário', () => {
  it('explica o percentual por hover e foco sem confundi-lo com a checagem', async () => {
    const user = userEvent.setup()
    render(<SpeakerLabel claim={claim} participants={participants} videoId="q4T7plSBdJE" />)
    const trigger = screen.getByRole('button', { name: /explicar índice textual/i })
    await user.hover(trigger)
    expect(screen.getByRole('tooltip')).toHaveTextContent('não de veracidade do fato')
    expect(screen.getByRole('tooltip')).toHaveTextContent('não uma probabilidade calibrada')
    await user.unhover(trigger)
    await user.tab()
    expect(screen.getByRole('tooltip')).toBeVisible()
  })

  it('permite corrigir e restaurar sem apresentar revisão manual como 100%', async () => {
    const user = userEvent.setup()
    const view = render(<SpeakerLabel claim={claim} participants={participants} videoId="q4T7plSBdJE" />)
    await user.click(screen.getByRole('button', { name: 'Revisar locutor' }))
    await user.selectOptions(screen.getByLabelText('Quem falou este trecho?'), 'Kim Kataguiri')
    await user.click(screen.getByRole('button', { name: 'Salvar revisão' }))
    expect(screen.getByText('Kim Kataguiri')).toBeVisible()
    expect(screen.getByText(/revisado por você/)).toBeVisible()
    expect(screen.queryByText(/100%/)).not.toBeInTheDocument()
    expect(claim.speakerAttribution?.name).toBe('Jones Manoel')
    view.unmount()
    render(<SpeakerLabel claim={claim} participants={participants} videoId="q4T7plSBdJE" />)
    expect(screen.getByText('Kim Kataguiri')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Revisar locutor' }))
    await user.click(screen.getByRole('button', { name: 'Restaurar sugestão' }))
    expect(screen.getByText('Jones Manoel')).toBeVisible()
  })

  it('descarta uma revisão quando o texto do trecho mudou', async () => {
    localStorage.setItem('fato-ou-papo:speaker-review:v1:q4T7plSBdJE:teste', JSON.stringify({ version: 1, quote: 'Trecho antigo.', name: 'Kim Kataguiri' }))
    render(<SpeakerLabel claim={claim} participants={participants} videoId="q4T7plSBdJE" />)
    expect(screen.getByText('Jones Manoel')).toBeVisible()
  })

  it('mostra locutor não identificado sem inventar um percentual', () => {
    render(<SpeakerLabel claim={{ ...claim, speakerAttribution: undefined }} participants={participants} videoId="q4T7plSBdJE" />)
    expect(screen.getByText('Locutor não identificado')).toBeVisible()
    expect(screen.queryByRole('button', { name: /explicar índice/i })).not.toBeInTheDocument()
  })
})
