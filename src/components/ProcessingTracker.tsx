import { useEffect, useState } from 'react'
import { findVideoRequest, readProcessingProgress } from '../services/processing'

export function ProcessingTracker({ videoId, discover = false, onRejected }: { videoId: string; discover?: boolean; onRejected?: () => void }) {
  const [issueNumber, setIssueNumber] = useState(() => new URLSearchParams(window.location.search).get('pedido') ?? '')
  const [trackedIssue, setTrackedIssue] = useState(() => /^[1-9]\d{0,8}$/.test(issueNumber) ? issueNumber : '')
  const [state, setState] = useState<Awaited<ReturnType<typeof readProcessingProgress>>>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (trackedIssue) return
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout>
    let attempts = 0
    let running = false
    async function locate() {
      if (running || controller.signal.aborted || attempts >= 15) return
      running = true
      attempts += 1
      clearTimeout(timer)
      try {
        const found = await findVideoRequest(videoId, controller.signal)
        if (controller.signal.aborted) return
        if (found) { setIssueNumber(found); setTrackedIssue(found); return }
      } catch {
        // Manual lookup remains available if the public API is rate limited.
      } finally { running = false }
      if (discover && !controller.signal.aborted) timer = setTimeout(() => void locate(), 60_000)
    }
    void locate()
    const onFocus = () => { if (discover) void locate() }
    window.addEventListener('focus', onFocus)
    return () => { controller.abort(); clearTimeout(timer); window.removeEventListener('focus', onFocus) }
  }, [videoId, trackedIssue, discover])

  useEffect(() => { if (state?.notice?.kind === 'rejected') onRejected?.() }, [state, onRejected])

  useEffect(() => {
    if (!trackedIssue) return
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout>
    async function update() {
      try {
        const value = await readProcessingProgress(videoId, trackedIssue, controller.signal)
        if (controller.signal.aborted) return
        setState(value)
        setError('')
      } catch (caught) {
        if (controller.signal.aborted) return
        setError(caught instanceof Error ? caught.message : 'Progresso indisponível.')
      }
      if (!controller.signal.aborted) timer = setTimeout(() => void update(), 60_000)
    }
    void update()
    return () => { controller.abort(); clearTimeout(timer) }
  }, [trackedIssue, videoId])

  const percent = !state ? 0 : state.phase === 'inventory' ? Math.round(40 * state.nextWindow / Math.max(1, state.totalWindows))
    : state.phase === 'completed' ? 90 : Math.round(40 + 50 * state.claims.length / Math.max(1, state.inventory.length))

  return <div className="mt-5 border-t border-white/20 pt-4">
    {discover && !trackedIssue && <p role="status" className="mb-3 text-xs">Aguardando a confirmação do envio. Seu pedido será localizado automaticamente ao voltar para esta página.</p>}
    <details>
      <summary className="text-xs text-muted">Acompanhar com código do pedido</summary>
    <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={(event) => {
      event.preventDefault()
      if (!/^[1-9]\d{0,8}$/.test(issueNumber)) { setError('Informe o código numérico do pedido.'); return }
      setState(null); setError(''); setTrackedIssue(issueNumber)
    }}>
      <label className="flex flex-col gap-1 text-xs">Código do pedido
        <input className="w-36 rounded border border-white/25 bg-black/20 px-3 py-2 text-white" inputMode="numeric" value={issueNumber} onChange={(event) => setIssueNumber(event.target.value)} placeholder="Ex.: 123" />
      </label>
      <button type="submit" className="relative isolate overflow-hidden rounded border border-emerald-300/50 px-4 py-2 text-xs text-white">
        {trackedIssue && <span aria-hidden="true" className="absolute inset-y-0 left-0 -z-10 bg-emerald-700 transition-[width]" style={{ width: `${percent}%` }} />}
        Acompanhar processamento
      </button>
    </form>
    </details>
    {error && <p role="alert" className="mt-2 text-xs text-red-300">{error}</p>}
    {trackedIssue && <div className="mt-3" aria-live="polite">
      <p className="mb-2 text-xs text-muted">Pedido {trackedIssue}</p>
      <div role="progressbar" aria-label="Etapas do processamento" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-valuetext={!state ? 'Na fila de processamento' : state.phase === 'completed' ? 'Checagem concluída; aguardando revisão e publicação' : `${state.nextWindow} de ${state.totalWindows} janelas; ${state.claims.length} de ${state.inventory.length} afirmações processadas`} className="h-2 overflow-hidden rounded bg-white/15">
        <div className="h-full bg-emerald-400 transition-[width]" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-2 text-xs">{!state ? 'Na fila de processamento. Os lotes começam automaticamente conforme a disponibilidade da cota.' : state.phase === 'completed'
        ? 'Checagem concluída. Aguardando revisão editorial e publicação.'
        : !state.totalWindows ? 'O processamento ainda não tem etapas concluídas.'
        : `Transcrição: ${state.nextWindow}/${state.totalWindows} janelas. Checagens: ${state.claims.length}/${state.inventory.length} afirmações identificadas até agora.`}</p>
      {state?.notice && <p role={state.notice.interrupted ? 'alert' : 'status'} className="mt-2 text-xs">{state.notice.message} <a className="underline underline-offset-4" href={state.notice.runUrl} target="_blank" rel="noreferrer">Ver execução ↗</a></p>}
      <p className="mt-1 text-[11px] opacity-75">A barra representa etapas, sem estimativa de tempo. O progresso salvo é atualizado ao final de cada lote; um debate pode exigir vários dias. Após a publicação, consulte o vídeo novamente.</p>
    </div>}
  </div>
}
