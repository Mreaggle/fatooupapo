import { useCallback, useEffect, useRef, useState } from 'react'
import { Brand } from './components/Brand'
import { Home } from './components/Home'
import { InfoDialog, type InfoPage } from './components/InfoDialog'
import { Report } from './components/Report'
import { BackToTop } from './components/BackToTop'
import { AnalysisError, analyzeVideo } from './services/analysis'
import { parseYouTubeUrl } from './lib/youtube'
import { analysisRequestLinks } from './lib/analysis-requests'
import type { AnalysisProgress, AnalysisReport } from './types'

function getInitialUrl() {
  const videoId = new URLSearchParams(window.location.search).get('v')
  return videoId && /^[\w-]{11}$/.test(videoId) ? `https://www.youtube.com/watch?v=${videoId}` : ''
}

export default function App() {
  const [initialUrl] = useState(getInitialUrl)
  const [report, setReport] = useState<AnalysisReport | null>(null)
  const [progress, setProgress] = useState<AnalysisProgress | null>(null)
  const [error, setError] = useState('')
  const [requestLinks, setRequestLinks] = useState<ReturnType<typeof analysisRequestLinks>>(null)
  const [info, setInfo] = useState<InfoPage | null>(null)
  const request = useRef<AbortController | null>(null)

  const analyze = useCallback(async (url: string) => {
    setRequestLinks(null)
    const video = parseYouTubeUrl(url)
    if (!video) { setError('Insira um link válido de vídeo do YouTube.'); return }
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setError('')
    setProgress({ stage: 'snapshot', message: 'Consultando o acervo…' })
    try {
      const result = await analyzeVideo(video, controller.signal, (value) => {
        if (!controller.signal.aborted) setProgress(value)
      })
      if (controller.signal.aborted) return
      window.history.replaceState({}, '', `${window.location.pathname}?v=${video.videoId}`)
      setReport(result.report)
      window.scrollTo?.({ top: 0 })
    } catch (caught) {
      if (controller.signal.aborted) return
      if (caught instanceof AnalysisError && caught.code === 'integration_unavailable') {
        setRequestLinks(analysisRequestLinks(video.canonicalUrl))
        setError('')
      } else {
        setError(caught instanceof AnalysisError ? caught.message : 'Não foi possível consultar a análise. Verifique a conexão e tente novamente.')
      }
    } finally {
      if (request.current === controller) { setProgress(null); request.current = null }
    }
  }, [])

  useEffect(() => {
    if (initialUrl) void analyze(initialUrl)
    return () => request.current?.abort()
  }, [initialUrl, analyze])

  function goHome() {
    request.current?.abort()
    request.current = null
    setProgress(null)
    setError('')
    setRequestLinks(null)
    setReport(null)
    window.history.replaceState({}, '', window.location.pathname)
    window.scrollTo({ top: 0 })
  }

  return (
    <div className={`app-shell flex min-h-svh flex-col ${report ? 'app-shell--report' : ''}`}>
      {report && <div className="h-20 shrink-0"><header className="report-header fixed inset-x-0 top-0 z-30 flex h-20 items-center justify-between gap-4 border-b border-line bg-background/95 px-5 backdrop-blur-sm sm:px-8">
        <Brand onHome={goHome} />
        <button className="button-text text-xs" type="button" onClick={goHome}>← Nova consulta</button>
      </header></div>}
      {report ? <Report key={report.video.id} report={report} /> : <Home initialUrl={initialUrl} error={error} requestLinks={requestLinks} progress={progress} onAnalyze={(url) => void analyze(url)} onClearError={() => { setError(''); setRequestLinks(null) }} onCancel={() => { request.current?.abort(); setProgress(null) }} />}
      {report && <BackToTop />}
      <footer className="mx-auto w-full max-w-6xl px-5 pb-6 pt-8 text-center sm:px-8">
        <nav aria-label="Links do rodapé" className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-xs text-muted">
          {(['Como funciona', 'Metodologia', 'Sobre o projeto'] as const).map((page) => <button className="button-text" key={page} type="button" onClick={() => setInfo(page)}>{page}</button>)}
          {!report && <a className="button-text" href="?v=q4T7plSBdJE">Debate do MVP ↗</a>}
        </nav>
        <p className="mx-auto mt-4 max-w-lg text-[11px] leading-5 text-faint">Análises automatizadas podem conter erros. Consulte as fontes.</p>
      </footer>
      <InfoDialog page={info} onClose={() => setInfo(null)} />
    </div>
  )
}
