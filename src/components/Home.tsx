import { useState, type FormEvent } from 'react'
import { ArrowRight, LoaderCircle } from 'lucide-react'
import type { AnalysisProgress } from '../types'
import { RequestPanel } from './RequestPanel'
import { RecentDebates } from './RecentDebates'

interface Props {
  initialUrl: string
  progress: AnalysisProgress | null
  error: string
  requestLinks: { request: string; queue: string } | null
  onAnalyze: (url: string) => void
  onCancel: () => void
  onClearError: () => void
}

export function Home({ initialUrl, progress, error, requestLinks, onAnalyze, onCancel, onClearError }: Props) {
  const [url, setUrl] = useState(initialUrl)
  const loading = Boolean(progress)

  function submit(event: FormEvent) {
    event.preventDefault()
    onAnalyze(url)
  }

  return (
    <main className="flex w-full flex-1 flex-col">
      <section aria-label="Consultar vídeo" className="hero-reference relative isolate flex min-h-svh w-full items-center justify-center overflow-hidden px-5 py-16 sm:px-8">
        <div className="w-full max-w-[880px] -translate-y-2">
          <h1 className="text-center font-serif text-[clamp(2.75rem,5vw,6rem)] leading-[1.08] font-normal tracking-[-0.025em] text-white">
            Você assiste e<br /><span>nós <em className="font-normal">checamos.</em></span>
          </h1>
          <p className="mx-auto mt-8 max-w-[820px] text-center font-serif text-[clamp(1rem,1.25vw,1.5rem)] leading-[1.45] text-[#d2dbd8]">
            Cole o link de um vídeo do YouTube para consultar as checagens e suas fontes. Se ele ainda não estiver no acervo, você pode solicitar uma análise.
          </p>

          <form onSubmit={submit} noValidate className="mt-12">
            <div className={`hero-input flex flex-col overflow-hidden rounded-lg ring-1 transition-shadow focus-within:ring-white/60 sm:min-h-[clamp(4rem,4.375vw,5.25rem)] sm:flex-row ${error ? 'ring-red-400/80' : 'ring-transparent'}`}>
              <div className="flex min-w-0 flex-1 items-center px-5 sm:px-7">
                <label className="sr-only" htmlFor="youtube-url">Link do vídeo do YouTube</label>
                <input id="youtube-url" type="url" inputMode="url" autoComplete="off" value={url}
                  onChange={(event) => { setUrl(event.target.value); onClearError() }}
                  placeholder="Cole aqui o link do vídeo do YouTube" disabled={loading}
                  aria-invalid={Boolean(error)} aria-describedby={error ? 'url-error' : undefined}
                  className="h-16 w-full min-w-0 bg-transparent text-sm text-foreground outline-none placeholder:text-[clamp(0.625rem,0.85vw,0.95rem)] placeholder:font-semibold placeholder:text-[#858588] placeholder:uppercase disabled:opacity-60 sm:h-full"
                />
              </div>
              <button className="relative isolate flex min-h-16 shrink-0 items-center justify-between gap-5 overflow-hidden bg-[#fdfdfd] px-5 text-[clamp(0.75rem,0.85vw,1rem)] font-semibold text-[#1b1c1b] uppercase transition-colors hover:bg-stone-200 disabled:cursor-not-allowed disabled:bg-[#f2f2f2] sm:w-[34%] sm:px-6" disabled={loading || !url.trim()} type="submit">
                {loading && <span aria-hidden="true" className="processing-fill absolute inset-y-0 left-0 -z-10 w-1/2 bg-emerald-400" />}
                {loading ? <><span>Consultando</span><LoaderCircle size={18} className="animate-spin motion-reduce:animate-none" /></> : <><span>Verifique os fatos</span><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1c1d1c] text-white"><ArrowRight size={12} strokeWidth={2} /></span></>}
              </button>
            </div>

            {error && <p id="url-error" role="alert" className="mt-3 text-sm leading-6 text-red-300">{error}</p>}
            {progress && <div role="status" aria-live="polite" className="mt-3 flex items-start justify-between gap-3 text-xs leading-5 text-muted"><span>{progress.message}</span><button type="button" onClick={onCancel} className="shrink-0 underline underline-offset-4">Cancelar</button></div>}
          </form>
          {requestLinks && <RequestPanel videoUrl={url} queueUrl={requestLinks.queue} />}
        </div>
      </section>
      <RecentDebates />
    </main>
  )
}
