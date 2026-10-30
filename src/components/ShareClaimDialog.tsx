import { useEffect, useRef, useState } from 'react'
import { Download, Share2, X } from 'lucide-react'
import type { AnalysisReport, Claim } from '../types'
import { createClaimCard } from '../lib/claim-card'
import { verdictLabel } from '../lib/verdict-label'

function canShare(file: File) {
  try { return typeof navigator.share === 'function' && Boolean(navigator.canShare?.({ files: [file] })) }
  catch { return false }
}

export function ShareClaimDialog({ claim, video, speakerName, onClose }: { claim: Claim; video: AnalysisReport['video']; speakerName?: string | null; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [image, setImage] = useState<{ file: File; url: string } | null>(null)
  const [error, setError] = useState('')
  const [shareError, setShareError] = useState('')
  const [sharing, setSharing] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const reportUrl = new URL(`${window.location.pathname}?v=${video.id}`, window.location.origin).href
  const author = (speakerName !== undefined ? speakerName : claim.speakerAttribution?.name ?? claim.speaker) || 'Locutor não identificado'

  useEffect(() => {
    const current = dialog.current
    current?.showModal()
    return () => current?.close()
  }, [])

  useEffect(() => {
    let active = true
    let objectUrl: string | undefined
    createClaimCard(claim, video, reportUrl, author).then((file) => {
      if (!active) return
      objectUrl = URL.createObjectURL(file)
      setImage({ file, url: objectUrl })
    }).catch((caught: unknown) => {
      if (active) setError(caught instanceof Error ? caught.message : 'Não foi possível gerar o card. Tente novamente.')
    })
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [claim, video, reportUrl, author, attempt])

  async function share() {
    if (!image) return
    setSharing(true)
    setShareError('')
    try {
      await navigator.share({
        files: [image.file],
        title: `Fato ou Papo — ${author} — ${verdictLabel(claim.verdict)}`,
        text: `Confira a checagem e as fontes: ${reportUrl}`,
      })
    } catch (caught) {
      if (!(caught && typeof caught === 'object' && 'name' in caught && caught.name === 'AbortError')) setShareError('Não foi possível compartilhar. Você pode baixar o PNG.')
    } finally { setSharing(false) }
  }

  function close() {
    dialog.current?.close()
    onClose()
  }

  return <dialog ref={dialog} onCancel={(event) => { event.preventDefault(); close() }} onClick={(event) => { if (event.target === event.currentTarget) close() }} className="info-dialog" aria-labelledby="share-claim-title">
    <div className="flex items-center justify-between gap-4 border-b border-line pb-4">
      <h2 id="share-claim-title" className="font-serif text-xl font-semibold">Compartilhar checagem</h2>
      <button type="button" className="icon-button" onClick={close} aria-label="Fechar card"><X size={18} aria-hidden="true" /></button>
    </div>
    {!image && !error && <p role="status" className="py-8 text-sm text-muted">Gerando card…</p>}
    {error && <div className="py-6 text-sm"><p role="alert">{error}</p><button type="button" className="mt-4 underline underline-offset-4" onClick={() => { setError(''); setAttempt((value) => value + 1) }}>Tentar gerar novamente</button></div>}
    {image && <>
      <div className="sticky top-0 z-10 -mx-2 flex flex-wrap items-center gap-3 bg-background px-2 py-4">
        {canShare(image.file) && <button type="button" className="button-primary" disabled={sharing} onClick={() => void share()}><Share2 size={16} aria-hidden="true" />{sharing ? 'Compartilhando…' : 'Compartilhar imagem'}</button>}
        <a href={image.url} download={image.file.name} className={canShare(image.file) ? 'inline-flex min-h-11 items-center gap-2 text-sm underline underline-offset-4' : 'button-primary'}><Download size={16} aria-hidden="true" />Baixar PNG</a>
      </div>
      {shareError && <p role="alert" className="mb-4 text-sm text-muted">{shareError}</p>}
      <img src={image.url} alt={`Card da checagem. Autor: ${author}. Argumento: ${claim.title || claim.topic || 'Afirmação checada'}. Classificação: ${verdictLabel(claim.verdict)}. Conclusão: ${claim.explanation}`} className="w-full rounded-lg border border-line" />
    </>}
  </dialog>
}
