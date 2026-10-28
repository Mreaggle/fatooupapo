import { FormEvent, useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  Check,
  CircleHelp,
  Clock3,
  Copy,
  ExternalLink,
  FileSearch,
  Link2,
  LoaderCircle,
  Scale,
  Search,
  Share2,
  ShieldCheck,
  Video,
  Youtube,
} from 'lucide-react'
import { AnalysisError, analyzeVideo } from './services/analysis'
import { formatTimestamp, parseYouTubeUrl, timestampUrl } from './lib/youtube'
import type { AnalysisProgress, AnalysisReport, Claim, Verdict } from './types'

const VERDICT_CLASS: Record<Verdict, string> = {
  Verdadeiro: 'verdict--true',
  'Majoritariamente verdadeiro': 'verdict--mostly-true',
  'Impreciso ou fora de contexto': 'verdict--misleading',
  'Majoritariamente falso': 'verdict--mostly-false',
  Falso: 'verdict--false',
  Inconclusivo: 'verdict--inconclusive',
}

const features = [
  { icon: Link2, title: 'Fontes verificáveis', text: 'Referências diretas para consultar cada evidência.' },
  { icon: BookOpenCheck, title: 'Contexto completo', text: 'Datas, números e circunstâncias entram na análise.' },
  { icon: Scale, title: 'Sem torcida', text: 'O mesmo critério para todas as posições políticas.' },
]

function Brand() {
  return (
    <a className="brand" href="#inicio" aria-label="Fato ou Papo — início">
      <span className="brand__mark" aria-hidden="true"><FileSearch size={18} /></span>
      <span>Fato ou <strong>Papo</strong></span>
    </a>
  )
}

function ErrorNotice({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="notice notice--error" role="alert">
      <AlertTriangle size={18} aria-hidden="true" />
      <span>{message}</span>
      <button type="button" onClick={onDismiss} aria-label="Fechar mensagem">×</button>
    </div>
  )
}

function Home({ onReport, initialUrl }: { onReport: (report: AnalysisReport, source: 'snapshot' | 'backend') => void; initialUrl?: string }) {
  const [url, setUrl] = useState(initialUrl ?? '')
  const [error, setError] = useState('')
  const [progress, setProgress] = useState<AnalysisProgress | null>(null)
  const controllerRef = useRef<AbortController | null>(null)

  async function startAnalysis(value: string) {
    setError('')
    const parsed = parseYouTubeUrl(value)
    if (!parsed) {
      setError('Insira um link válido de vídeo do YouTube.')
      return
    }

    const controller = new AbortController()
    controllerRef.current = controller
    setProgress({ stage: 'snapshot', message: 'Iniciando a análise…' })

    try {
      const result = await analyzeVideo(parsed, controller.signal, setProgress)
      onReport(result.report, result.source)
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') {
        setError('A análise foi cancelada.')
      } else if (caught instanceof AnalysisError) {
        setError(caught.message)
      } else {
        setError('Não foi possível iniciar a análise. Verifique sua conexão e tente novamente.')
      }
    } finally {
      setProgress(null)
      controllerRef.current = null
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    void startAnalysis(url)
  }

  const autoStartedRef = useRef(false)
  useEffect(() => {
    if (initialUrl && !autoStartedRef.current) {
      autoStartedRef.current = true
      void startAnalysis(initialUrl)
    }
    // O link inicial é imutável durante esta montagem.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function cancel() {
    controllerRef.current?.abort()
  }

  const loading = progress !== null

  return (
    <>
      <main id="inicio">
        <section className="hero" aria-labelledby="hero-title">
          <div className="ambient ambient--red" />
          <div className="ambient ambient--blue" />
          <nav className="topbar" aria-label="Navegação principal">
            <Brand />
            <a className="topbar__method" href="#metodologia"><ShieldCheck size={15} /> Metodologia</a>
          </nav>

          <div className="hero__content">
            <div className="eyebrow"><BadgeCheck size={15} /> Checagem orientada por evidências</div>
            <h1 id="hero-title">Você assiste e<br /><span>nós checamos.</span></h1>
            <p className="hero__subtitle">Você não precisa confiar em ninguém, cole o link do vídeo do YouTube no espaço abaixo e nós verificamos pra você a veracidade dos fatos</p>

            <form className={`url-form ${error ? 'url-form--error' : ''}`} onSubmit={handleSubmit} noValidate>
              <div className="url-form__field">
                <Youtube size={22} aria-hidden="true" />
                <label className="sr-only" htmlFor="youtube-url">Link do vídeo do YouTube</label>
                <input
                  id="youtube-url"
                  type="url"
                  inputMode="url"
                  autoComplete="url"
                  placeholder="Cole aqui o link do vídeo do YouTube..."
                  value={url}
                  onChange={(event) => { setUrl(event.target.value); setError('') }}
                  disabled={loading}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'url-error' : 'evidence-note'}
                />
              </div>
              <button className="primary-button" type="submit" disabled={loading || !url.trim()}>
                {loading ? <LoaderCircle className="spin" size={19} /> : <Search size={19} />}
                {loading ? 'Analisando' : 'Verificar fatos'}
                {!loading && <ArrowRight size={17} />}
              </button>
            </form>

            {loading && (
              <div className="progress" role="status" aria-live="polite">
                <span className="progress__pulse" />
                <div><strong>Estamos analisando o vídeo e verificando as afirmações...</strong><span>{progress.message}</span></div>
                <button type="button" onClick={cancel}>Cancelar</button>
              </div>
            )}
            {error && <div id="url-error"><ErrorNotice message={error} onDismiss={() => setError('')} /></div>}

            <p className="evidence-note" id="evidence-note"><ShieldCheck size={14} /> Análise baseada em evidências, fontes verificáveis e contexto.</p>

            <div className="feature-row">
              {features.map(({ icon: Icon, title, text }) => (
                <div className="feature" key={title}>
                  <span className="feature__icon"><Icon size={18} /></span>
                  <div><strong>{title}</strong><span>{text}</span></div>
                </div>
              ))}
            </div>
          </div>
          <a className="scroll-cue" href="#como-funciona">Como funciona <span>↓</span></a>
        </section>

        <section className="explain" id="como-funciona">
          <div className="section-heading"><span>01 / PROCESSO</span><h2>Da fala à evidência,<br />sem atalhos.</h2></div>
          <div className="process-grid">
            {[
              ['01', 'Transcrição', 'Usamos apenas meios autorizados e informamos quando uma transcrição não está disponível.'],
              ['02', 'Afirmações', 'Separamos dados verificáveis de opinião, retórica, preferência ou previsão.'],
              ['03', 'Evidências', 'Buscamos fontes primárias, atuais e pertinentes, registrando divergências.'],
              ['04', 'Relatório', 'Apresentamos conclusão, contexto, limitações e links para você conferir.'],
            ].map(([number, title, text]) => (
              <article className="process-card" key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>
            ))}
          </div>
        </section>

        <section className="method" id="metodologia">
          <div className="method__visual" aria-hidden="true">
            <div className="signal signal--red" /><div className="method__center"><Scale size={34} /><span>mesmo critério</span></div><div className="signal signal--blue" />
          </div>
          <div className="method__copy">
            <span>02 / METODOLOGIA</span>
            <h2>O contexto também é um fato.</h2>
            <p>Uma classificação só é responsável quando considera a formulação exata da fala, o período citado, a qualidade dos dados e o que as fontes realmente permitem concluir.</p>
            <ul>
              <li><Check size={15} /> Prioridade para bases públicas e documentos originais</li>
              <li><Check size={15} /> Evidências favoráveis e contrárias lado a lado</li>
              <li><Check size={15} /> Inconclusivo quando faltam elementos seguros</li>
            </ul>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}

function ClaimCard({ claim, videoId, index }: { claim: Claim; videoId: string; index: number }) {
  const supports = claim.evidence.filter((item) => item.position === 'supports')
  const contradicts = claim.evidence.filter((item) => item.position === 'contradicts')
  const context = claim.evidence.filter((item) => item.position === 'context')

  return (
    <article className="claim-card">
      <div className="claim-card__number">{String(index + 1).padStart(2, '0')}</div>
      <div className="claim-card__body">
        <div className="claim-card__meta">
          <span className={`verdict ${VERDICT_CLASS[claim.verdict]}`}>{claim.verdict}</span>
          <a href={timestampUrl(videoId, claim.timestampSeconds)} target="_blank" rel="noreferrer"><Clock3 size={14} /> {formatTimestamp(claim.timestampSeconds)}</a>
        </div>
        {claim.speaker && <p className="speaker">{claim.speaker}</p>}
        <blockquote>“{claim.quote}”</blockquote>
        <p className="claim-card__explanation">{claim.explanation}</p>

        {(supports.length > 0 || contradicts.length > 0 || context.length > 0) && (
          <div className="evidence-list">
            <h4>Evidências consultadas</h4>
            {[...supports, ...contradicts, ...context].map((item) => (
              <a href={item.url} target="_blank" rel="noreferrer" key={`${item.url}-${item.title}`}>
                <span className={`evidence-dot evidence-dot--${item.position}`} />
                <span><strong>{item.title}</strong><small>{item.publisher}{item.publishedAt ? ` · ${new Date(item.publishedAt).toLocaleDateString('pt-BR')}` : ''}</small></span>
                <ExternalLink size={15} />
              </a>
            ))}
          </div>
        )}
        {claim.limitations && <p className="limitation"><CircleHelp size={15} /> <span><strong>Limitação:</strong> {claim.limitations}</span></p>}
      </div>
    </article>
  )
}

function Results({ report, source, onBack }: { report: AnalysisReport; source: 'snapshot' | 'backend'; onBack: () => void }) {
  const [copied, setCopied] = useState(false)
  const inconclusive = report.claims.filter((claim) => claim.verdict === 'Inconclusivo').length

  async function share() {
    const data = { title: `Fato ou Papo — ${report.video.title}`, text: report.summary, url: window.location.href }
    if (navigator.share) await navigator.share(data)
    else {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="results-page">
      <header className="results-topbar"><Brand /><button type="button" onClick={onBack}><ArrowLeft size={16} /> Nova análise</button></header>
      <main className="results">
        <div className="report-status"><span className="status-dot" /> Análise concluída · {source === 'snapshot' ? 'acervo verificado' : 'processada agora'}</div>
        <section className="video-summary">
          <img src={report.video.thumbnailUrl} alt={`Miniatura de ${report.video.title}`} />
          <div>
            <span className="video-summary__channel"><Youtube size={15} /> {report.video.channel}</span>
            <h1>{report.video.title}</h1>
            <div className="video-summary__actions">
              <a href={report.video.url} target="_blank" rel="noreferrer"><Video size={16} /> Assistir ao original <ExternalLink size={14} /></a>
              <button type="button" onClick={copyLink}>{copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copiado' : 'Copiar link'}</button>
              <button type="button" onClick={share}><Share2 size={16} /> Compartilhar</button>
            </div>
          </div>
        </section>

        <section className="report-overview">
          <div><span>Resumo da análise</span><p>{report.summary}</p><small>Analisado em {new Date(report.analyzedAt).toLocaleDateString('pt-BR')}</small></div>
          <dl><div><dt>{report.claims.length}</dt><dd>afirmações verificadas</dd></div><div><dt>{inconclusive}</dt><dd>itens inconclusivos</dd></div></dl>
        </section>

        <div className="claims-heading"><div><span>AFIRMAÇÃO POR AFIRMAÇÃO</span><h2>O que encontramos</h2></div><p>Abra as fontes e confira as evidências diretamente.</p></div>
        <section className="claims" aria-label="Afirmações verificadas">
          {report.claims.map((claim, index) => <ClaimCard key={claim.id} claim={claim} videoId={report.video.id} index={index} />)}
        </section>

        {report.limitations && report.limitations.length > 0 && (
          <section className="report-limitations"><AlertTriangle size={19} /><div><h2>Limitações desta análise</h2><ul>{report.limitations.map((item) => <li key={item}>{item}</li>)}</ul></div></section>
        )}
      </main>
      <Footer />
    </div>
  )
}

function Footer() {
  return (
    <footer className="footer" id="sobre">
      <Brand />
      <nav aria-label="Links do rodapé"><a href="#como-funciona">Como funciona</a><a href="#metodologia">Metodologia</a><a href="#sobre">Sobre o projeto</a></nav>
      <p>Análises automatizadas podem conter erros. Interprete cada conclusão considerando as fontes apresentadas.</p>
    </footer>
  )
}

export default function App() {
  const [result, setResult] = useState<{ report: AnalysisReport; source: 'snapshot' | 'backend' } | null>(null)
  const requestedVideoId = new URLSearchParams(window.location.search).get('v')
  const initialUrl = requestedVideoId && /^[a-zA-Z0-9_-]{11}$/.test(requestedVideoId)
    ? `https://www.youtube.com/watch?v=${requestedVideoId}`
    : undefined

  function showReport(report: AnalysisReport, source: 'snapshot' | 'backend') {
    window.history.replaceState({}, '', `${window.location.pathname}?v=${report.video.id}`)
    setResult({ report, source })
  }

  function goHome() {
    window.history.replaceState({}, '', window.location.pathname)
    setResult(null)
  }

  return result
    ? <Results report={result.report} source={result.source} onBack={goHome} />
    : <Home initialUrl={initialUrl} onReport={showReport} />
}
