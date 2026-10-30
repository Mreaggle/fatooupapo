import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowUpRight, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import type { AnalysisReport } from '../types'
import { activeMomentIndex, buildClaimTimeline } from '../lib/claim-timeline'
import { formatTimestamp } from '../lib/youtube'
import { verdictLabel } from '../lib/verdict-label'
import { verdictStyle } from '../lib/verdict-style'
import { loadYouTubePlayerApi, type YouTubePlayer } from '../services/youtube-player'

export function SyncedVideo({ report, onShowClaim }: { report: AnalysisReport; onShowClaim: (id: string) => void }) {
  const container = useRef<HTMLDivElement>(null)
  const player = useRef<YouTubePlayer | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [position, setPosition] = useState({ seconds: 0, index: -1 })
  const moments = useMemo(() => buildClaimTimeline(report.claims), [report.claims])
  const moment = moments[position.index]

  useEffect(() => {
    const host = container.current
    if (!host) return
    let disposed = false
    let failed = false
    let instance: YouTubePlayer | undefined
    let interval: number | undefined
    let readyTimeout: number | undefined

    function fail(message: string) {
      if (disposed) return
      failed = true
      window.clearInterval(interval)
      window.clearTimeout(readyTimeout)
      setReady(false)
      setError(message)
    }

    function synchronize(target: YouTubePlayer) {
      if (disposed || failed) return
      const seconds = target.getCurrentTime()
      if (!Number.isFinite(seconds) || seconds < 0) return
      const index = activeMomentIndex(moments, seconds)
      const wholeSeconds = Math.floor(seconds)
      setPosition((current) => current.seconds === wholeSeconds && current.index === index
        ? current
        : { seconds: wholeSeconds, index })
    }

    void loadYouTubePlayerApi().then((api) => {
      if (disposed) return
      const target = document.createElement('div')
      host.replaceChildren(target)
      readyTimeout = window.setTimeout(() => fail('O vídeo demorou para carregar. Tente novamente ou assista no YouTube.'), 15000)
      instance = new api.Player(target, {
        videoId: report.video.id,
        width: '100%',
        height: '100%',
        host: 'https://www.youtube-nocookie.com',
        playerVars: { origin: window.location.origin, playsinline: 1, rel: 0 },
        events: {
          onReady: ({ target: videoPlayer }) => {
            if (disposed || failed) return
            window.clearTimeout(readyTimeout)
            videoPlayer.getIframe().title = `Vídeo: ${report.video.title}`
            player.current = videoPlayer
            setReady(true)
            synchronize(videoPlayer)
            // Read the actual playback position, also while paused after a seek.
            interval = window.setInterval(() => synchronize(videoPlayer), 250)
          },
          onStateChange: ({ target: videoPlayer }) => synchronize(videoPlayer),
          onError: () => fail('Não foi possível reproduzir este vídeo aqui. Você pode assistir no YouTube e consultar a checagem completa abaixo.'),
        },
      })
    }).catch(() => fail('Não foi possível carregar o player do YouTube. Verifique sua conexão e tente novamente.'))

    return () => {
      disposed = true
      window.clearInterval(interval)
      window.clearTimeout(readyTimeout)
      player.current = null
      instance?.destroy()
      host.replaceChildren()
    }
  }, [report.video.id, report.video.title, moments, attempt])

  function seek(index: number) {
    if (!ready || !player.current || !moments[index]) return
    player.current.seekTo(moments[index].timestampSeconds, true)
  }

  return (
    <section aria-labelledby="synced-video-title" className="synced-video mt-8 overflow-hidden rounded-xl border border-line bg-surface">
      <div className="px-4 py-4 sm:px-5">
        <h2 id="synced-video-title" className="font-serif text-lg font-medium">Assista com as checagens</h2>
        <p className="mt-1 text-xs leading-5 text-muted">Dê play. A checagem de cada trecho aparece abaixo do vídeo e fica em destaque até a próxima.</p>
      </div>
      <div className="synced-video__player relative bg-black" hidden={Boolean(error)}>
        {!ready && <p role="status" className="absolute inset-0 flex items-center justify-center text-xs text-muted">Carregando vídeo…</p>}
        <div ref={container} className="absolute inset-0" />
      </div>
      {error && <div className="border-y border-line p-5">
        <p role="alert" className="text-sm leading-6 text-muted">{error}</p>
        <div className="mt-3 flex flex-wrap gap-4 text-xs">
          <button type="button" className="inline-flex items-center gap-1.5 hover:underline" onClick={() => { setError(''); setReady(false); setPosition({ seconds: 0, index: -1 }); setAttempt((current) => current + 1) }}><RotateCcw size={14} aria-hidden="true" />Tentar novamente</button>
          <a href={report.video.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:underline">Assistir no YouTube <ArrowUpRight size={14} aria-hidden="true" /></a>
        </div>
      </div>}
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <p className="text-xs text-muted"><span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-blue-300" aria-hidden="true" />{error ? 'Vídeo indisponível' : ready ? 'Sincronizado com o vídeo' : 'Aguardando vídeo'}</p>
        <span className="font-mono text-xs text-muted" aria-label="Tempo do vídeo">{formatTimestamp(position.seconds)}</span>
      </div>
      <div className="synced-video__slide p-4 sm:p-5" aria-live="polite" aria-atomic="true">
        {moment ? <div key={moment.timestampSeconds}>
          <p className="mb-4 font-mono text-[11px] text-muted">Trecho em {formatTimestamp(moment.timestampSeconds)}</p>
          <div className="space-y-6">
            {moment.claims.map((claim) => <div key={claim.id} className="synced-video__claim">
              <span className={`verdict ${verdictStyle[claim.verdict]}`}>{verdictLabel(claim.verdict)}</span>
              {claim.title && <h3 className="mt-3 font-serif text-xl font-medium leading-7">{claim.title}</h3>}
              <blockquote className={`claim-quote ${verdictStyle[claim.verdict].replace('verdict--', 'claim-quote--')} mt-3 rounded-r-lg px-4 py-3 font-serif text-lg leading-7`}>“{claim.quote}”</blockquote>
              <p className="claim-conclusion mt-3 text-sm leading-7">{claim.explanation}</p>
              <a className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted underline underline-offset-4 hover:text-foreground" href={`#${claim.id}`} onClick={(event) => { event.preventDefault(); onShowClaim(claim.id) }}>Ver checagem completa e fontes <ArrowDown size={13} aria-hidden="true" /></a>
            </div>)}
          </div>
        </div> : <div className="py-4">
          <p className="font-serif text-lg">{moments.length ? 'As checagens acompanham o vídeo.' : 'Nenhuma afirmação checada neste vídeo.'}</p>
          {moments.length > 0 && <p className="mt-2 text-sm leading-6 text-muted">A primeira aparece em {formatTimestamp(moments[0].timestampSeconds)}. Você também pode ir direto ao trecho.</p>}
        </div>}
      </div>
      {moments.length > 0 && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 sm:px-5">
        <span className="text-[11px] text-muted">{position.index < 0 ? `${moments.length} trechos com checagens` : `Trecho ${position.index + 1} de ${moments.length}`}</span>
        <div className="flex items-center gap-1">
          <button type="button" className="icon-button disabled:opacity-35" aria-label="Checagem anterior" disabled={!ready || position.index <= 0} onClick={() => seek(position.index - 1)}><ChevronLeft size={18} aria-hidden="true" /></button>
          <button type="button" className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-xs text-muted hover:bg-line hover:text-foreground disabled:opacity-35" aria-label={position.index < 0 ? 'Ir à primeira checagem' : 'Próxima checagem'} disabled={!ready || position.index >= moments.length - 1} onClick={() => seek(position.index + 1)}>{position.index < 0 ? 'Primeira checagem' : 'Próxima'}<ChevronRight size={18} aria-hidden="true" /></button>
        </div>
      </div>}
    </section>
  )
}
