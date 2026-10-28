import { useState, type FormEvent } from 'react'
import { ArrowRight, LoaderCircle, Youtube } from 'lucide-react'
import type { AnalysisProgress } from '../types'

export const FIRST_VIDEO_URL = 'https://www.youtube.com/watch?v=q4T7plSBdJE'

interface Props {
  initialUrl: string
  progress: AnalysisProgress | null
  error: string
  onAnalyze: (url: string) => void
  onCancel: () => void
  onClearError: () => void
}

export function Home({ initialUrl, progress, error, onAnalyze, onCancel, onClearError }: Props) {
  const [url, setUrl] = useState(initialUrl)
  const loading = Boolean(progress)

  function submit(event: FormEvent) {
    event.preventDefault()
    onAnalyze(url)
  }

  return (
    <main className="flex w-full flex-1 items-center justify-center px-5 py-16 sm:px-8">
      <div className="w-full max-w-2xl pb-10 sm:pb-16">
        <h1 className="text-center text-[clamp(2.25rem,6.5vw,3.8rem)] leading-[1.12] font-semibold tracking-[-0.045em]">
          Você assiste e<br /><span className="text-muted">nós checamos.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-lg text-center text-sm leading-6 text-muted sm:text-base sm:leading-7">
          Você não precisa confiar em ninguém, cole o link do vídeo do YouTube no espaço abaixo e nós verificamos pra você a veracidade dos fatos
        </p>

        <form onSubmit={submit} noValidate className="mt-9">
          <div className={`flex flex-col gap-2 rounded-xl border bg-surface p-2 transition-colors focus-within:border-stone-500 sm:flex-row ${error ? 'border-red-400/60' : 'border-line'}`}>
            <div className="flex min-w-0 flex-1 items-center gap-3 px-2.5">
              <Youtube size={20} className="shrink-0 text-faint" aria-hidden="true" />
              <label className="sr-only" htmlFor="youtube-url">Link do vídeo do YouTube</label>
              <input id="youtube-url" type="url" inputMode="url" autoComplete="off" value={url}
                onChange={(event) => { setUrl(event.target.value); onClearError() }}
                placeholder="Cole aqui o link do vídeo do YouTube..." disabled={loading}
                aria-invalid={Boolean(error)} aria-describedby={error ? 'url-error' : undefined}
                className="h-11 w-full min-w-0 bg-transparent text-sm text-foreground outline-none placeholder:text-faint disabled:opacity-60"
              />
            </div>
            <button className="button-primary shrink-0" disabled={loading || !url.trim()} type="submit">
              {loading ? <><LoaderCircle size={16} className="animate-spin motion-reduce:animate-none" /> Consultando</> : <>Verificar fatos <ArrowRight size={16} /></>}
            </button>
          </div>

          {error && <p id="url-error" role="alert" className="mt-3 text-sm leading-6 text-red-300">{error}</p>}
          {progress && <div role="status" aria-live="polite" className="mt-3 flex items-start justify-between gap-3 text-xs leading-5 text-muted"><span>{progress.message}</span><button type="button" onClick={onCancel} className="shrink-0 underline underline-offset-4">Cancelar</button></div>}
        </form>

        <div className="mt-5 text-center text-xs leading-5 text-faint">
          <p>Análise baseada em evidências, fontes verificáveis e contexto.</p>
          <button type="button" disabled={loading} onClick={() => { setUrl(FIRST_VIDEO_URL); onAnalyze(FIRST_VIDEO_URL) }} className="mt-5 text-muted underline decoration-line underline-offset-4 transition-colors hover:text-foreground disabled:opacity-50">
            Consultar o primeiro debate: Kim × Jones <span aria-hidden="true">↗</span>
          </button>
        </div>
      </div>
    </main>
  )
}
