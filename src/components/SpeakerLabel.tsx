import { useId, useRef, useState, type FormEvent } from 'react'
import type { Claim, Participant } from '../types'
import { readSpeakerReview, removeSpeakerReview, saveSpeakerReview, type SpeakerReview } from '../lib/speaker-reviews'
import { timestampUrl } from '../lib/youtube'

export function SpeakerLabel({ claim, videoId, participants }: { claim: Claim; videoId: string; participants: Participant[] }) {
  const [review, setReview] = useState(() => readSpeakerReview(videoId, claim.id, claim.quote))
  const [editing, setEditing] = useState(false)
  const [tooltip, setTooltip] = useState(false)
  const [choice, setChoice] = useState(review?.name ?? claim.speakerAttribution?.name ?? '')
  const [custom, setCustom] = useState('')
  const [message, setMessage] = useState('')
  const percentRef = useRef<HTMLButtonElement>(null)
  const id = useId()
  const attribution = claim.speakerAttribution
  const name = review ? review.name : attribution?.name ?? claim.speaker

  function save(event: FormEvent) {
    event.preventDefault()
    const name = choice === '__other' ? custom.trim() : choice
    if (choice === '__other' && !name) { setMessage('Informe o nome ou escolha “Não identificado”.'); return }
    const value: SpeakerReview = { version: 1, quote: claim.quote, name: name || null }
    const stored = saveSpeakerReview(videoId, claim.id, value)
    setReview(value)
    setEditing(false)
    setMessage(stored ? 'Revisão salva apenas neste navegador.' : 'Revisão aplicada nesta sessão. O navegador não permitiu salvá-la.')
  }

  function reset() {
    const removed = removeSpeakerReview(videoId, claim.id)
    if (!removed) { setMessage('O navegador não permitiu remover a revisão salva.'); return }
    setReview(null)
    setEditing(false)
    setMessage('Sugestão original restaurada.')
  }

  return (
    <div className="relative mb-3 text-xs text-muted">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span>{name ?? 'Locutor não identificado'}</span>
        {!review && attribution && <button ref={percentRef} type="button"
          aria-label={`Explicar índice textual de autoria: ${attribution.score}%`}
          aria-describedby={tooltip ? `${id}-tooltip` : undefined}
          onMouseEnter={() => setTooltip(true)}
          onMouseLeave={() => { if (document.activeElement !== percentRef.current) setTooltip(false) }}
          onFocus={() => setTooltip(true)} onBlur={() => setTooltip(false)} onClick={() => setTooltip(true)}
          onKeyDown={(event) => { if (event.key === 'Escape') { setTooltip(false); event.stopPropagation() } }}
          className="rounded text-[11px] text-faint underline decoration-dotted underline-offset-4">({attribution.score}%)</button>}
        {review && <span className="text-[10px] text-faint">· revisado por você</span>}
        <button type="button" onClick={() => {
          setChoice(name && participants.some((item) => item.name === name) ? name : name ? '__other' : '')
          setCustom(name ?? '')
          setEditing(!editing)
          setTooltip(false)
          setMessage('')
        }} aria-expanded={editing} aria-controls={`${id}-review`} className="rounded text-[10px] text-faint underline decoration-line underline-offset-4 hover:text-foreground">Revisar locutor</button>
      </div>
      {tooltip && <span role="tooltip" id={`${id}-tooltip`} className="pointer-events-none absolute top-7 left-0 z-20 max-w-[calc(100vw-3rem)] rounded-lg border border-line bg-surface px-3 py-2 text-[11px] leading-5 text-muted shadow-lg sm:w-80">
        Estimativa de autoria da fala, não de veracidade do fato. É um índice de pistas textuais, não uma probabilidade calibrada. Ouça o trecho e revise o locutor, se necessário.
      </span>}

      {editing && <form id={`${id}-review`} onSubmit={save} className="mt-3 rounded-lg border border-line p-4">
        <label htmlFor={`${id}-name`} className="block text-xs font-medium text-foreground">Quem falou este trecho?</label>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <select id={`${id}-name`} value={choice} onChange={(event) => setChoice(event.target.value)} className="min-w-0 flex-1 rounded-md border border-line bg-background px-3 py-2 text-xs">
            <option value="">Não identificado</option>
            {participants.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
            <option value="__other">Outra pessoa…</option>
          </select>
          <button type="submit" className="rounded-md bg-foreground px-3 py-2 text-xs font-medium text-background">Salvar revisão</button>
        </div>
        {choice === '__other' && <div className="mt-3"><label htmlFor={`${id}-custom`} className="sr-only">Nome do locutor</label><input id={`${id}-custom`} value={custom} onChange={(event) => setCustom(event.target.value)} maxLength={80} placeholder="Nome do locutor" className="w-full rounded-md border border-line bg-background px-3 py-2 text-xs" /></div>}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px]">
          <a href={timestampUrl(videoId, claim.timestampSeconds)} target="_blank" rel="noreferrer" className="underline underline-offset-4">Ouvir no vídeo ↗</a>
          {review && <button type="button" onClick={reset} className="underline underline-offset-4">Restaurar sugestão</button>}
          <button type="button" onClick={() => setEditing(false)}>Cancelar</button>
        </div>
        <p className="mt-3 text-[11px] leading-5 text-faint">A revisão fica neste navegador. Não altera o acervo público nem é enviada a um serviço.</p>
        {attribution && <details className="mt-3"><summary className="text-[11px]">Pista usada na sugestão</summary><p className="mt-2 text-[11px] leading-5 text-muted">“{attribution.anchor.text}”</p><p className="mt-1 text-[10px] text-faint">Blocos {attribution.anchor.cueStart}–{attribution.anchor.cueEnd} da legenda. Sugestão textual sujeita a erro.</p></details>}
      </form>}
      {message && <p role="status" className="mt-2 text-[11px] leading-5 text-muted">{message}</p>}
    </div>
  )
}
