import { useMemo, useState } from 'react'
import { ArrowUpRight, Check, ChevronDown, Copy, Download, Search } from 'lucide-react'
import type { AnalysisReport, Claim, Participant, Verdict } from '../types'
import { SpeakerLabel } from './SpeakerLabel'
import { verdicts } from '../lib/report-schema'
import { formatTimestamp, timestampUrl } from '../lib/youtube'
import { verdictLabel } from '../lib/verdict-label'

const verdictStyle: Record<Verdict, string> = {
  Verdadeiro: 'verdict--true',
  'Majoritariamente verdadeiro': 'verdict--mostly-true',
  'Impreciso ou fora de contexto': 'verdict--misleading',
  'Majoritariamente falso': 'verdict--mostly-false',
  Falso: 'verdict--false',
  Inconclusivo: 'verdict--inconclusive',
}
const evidenceLabels = { supports: 'Sustenta', contradicts: 'Contradiz', context: 'Contextualiza' }

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(value))
}

function ClaimItem({ claim, videoId, number, participants }: { claim: Claim; videoId: string; number: number; participants: Participant[] }) {
  return (
    <article id={claim.id} className="border-b border-line py-7 sm:py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3"><span className="font-mono text-[11px] text-faint">{String(number).padStart(2, '0')}</span><span className={`verdict ${verdictStyle[claim.verdict]}`}>{verdictLabel(claim.verdict)}</span></div>
        <a href={timestampUrl(videoId, claim.timestampSeconds)} className="inline-flex items-center gap-1 font-mono text-xs text-muted underline decoration-line underline-offset-4 hover:text-foreground" target="_blank" rel="noreferrer" aria-label={`Assistir ao trecho em ${formatTimestamp(claim.timestampSeconds)}`}>{formatTimestamp(claim.timestampSeconds)} <ArrowUpRight size={13} /></a>
      </div>
      {claim.title && <h3 className="mb-3 font-serif text-xl leading-7 font-semibold tracking-tight">{claim.title}</h3>}
      <SpeakerLabel claim={claim} videoId={videoId} participants={participants} />
      <blockquote className="border-l-2 border-line pl-4 font-serif text-lg leading-7 text-muted">“{claim.quote}”</blockquote>
      <p className="mt-4 text-sm leading-7 text-foreground/90">{claim.explanation}</p>

      <details className="group mt-4">
        <summary className="inline-flex list-none items-center gap-2 rounded text-xs text-muted hover:text-foreground">{claim.evidence.length ? `Fontes e contexto (${claim.evidence.length})` : 'Limitações da checagem'}<ChevronDown size={14} className="transition-transform group-open:rotate-180" /></summary>
        <div className="mt-4 space-y-3 border-t border-line pt-4">
          {claim.evidence.map((item) => <a key={`${item.url}-${item.title}`} href={item.url} target="_blank" rel="noreferrer" className="flex items-start justify-between gap-4 rounded py-1.5 text-sm hover:underline hover:underline-offset-4"><span><span className="block text-foreground/90">{item.title}</span><span className="mt-1 block text-[11px] text-muted">{evidenceLabels[item.position]} · {item.publisher}{item.publishedAt ? ` · ${formatDate(item.publishedAt)}` : ''}</span></span><ArrowUpRight size={15} className="mt-1 shrink-0 text-faint" /></a>)}
          {claim.limitations && <p className="text-xs leading-6 text-muted"><span className="font-medium text-foreground/80">Ressalva.</span> {claim.limitations}</p>}
          {claim.cueStart && <p className="text-[11px] text-faint">Legenda automática · blocos {claim.cueStart}–{claim.cueEnd ?? claim.cueStart}. Confira o áudio no vídeo original.</p>}
        </div>
      </details>
    </article>
  )
}

export function Report({ report }: { report: AnalysisReport }) {
  const [filter, setFilter] = useState('Todas as classificações')
  const [query, setQuery] = useState('')
  const [copyState, setCopyState] = useState('')
  const inconclusive = report.claims.filter((claim) => claim.verdict === 'Inconclusivo').length
  const visible = useMemo(() => report.claims.filter((claim) => {
    const matchesFilter = filter === 'Todas as classificações' || claim.verdict === filter
    const text = `${claim.title ?? ''} ${claim.topic ?? ''} ${claim.quote} ${claim.explanation}`.toLocaleLowerCase('pt-BR')
    return matchesFilter && text.includes(query.toLocaleLowerCase('pt-BR'))
  }), [report.claims, filter, query])

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopyState('Link copiado')
    } catch {
      setCopyState('Não foi possível copiar. Copie o endereço do navegador.')
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 pb-12 pt-8 sm:px-8 sm:pt-12">
      <p className="mb-5 text-xs text-muted">{report.coverage?.kind === 'selected-claims' ? 'Checagem parcial' : 'Relatório'} · {formatDate(report.analyzedAt)}</p>
      <div className="flex items-start gap-5">
        <div className="min-w-0 flex-1"><p className="mb-2 text-xs text-muted">{report.video.channel}</p><h1 className="font-serif text-2xl leading-tight font-medium tracking-[-0.025em] sm:text-3xl">{report.video.title}</h1></div>
        <img className="hidden aspect-video w-32 rounded-md object-cover sm:block" src={report.video.thumbnailUrl} alt="Miniatura do debate" width={128} height={72} />
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 text-xs text-muted">
        <a className="inline-flex items-center gap-1.5 hover:text-foreground" target="_blank" rel="noreferrer" href={report.video.url}>Vídeo original <ArrowUpRight size={14} /></a>
        <button type="button" onClick={() => void copy()} className="inline-flex items-center gap-1.5 hover:text-foreground">{copyState === 'Link copiado' ? <Check size={13} /> : <Copy size={13} />} {copyState === 'Link copiado' ? copyState : 'Copiar link'}</button>
        {report.coverage && <a className="inline-flex items-center gap-1.5 hover:text-foreground" href={`${import.meta.env.BASE_URL}${report.coverage.transcriptPath}`} download>Transcrição .md <Download size={13} /></a>}
      </div>
      {copyState && <p role="status" className="mt-3 text-xs text-muted">{copyState}</p>}

      <div className="my-8 border-y border-line py-6">
        <p className="font-serif text-lg leading-7 text-muted">{report.summary}</p>
        <p className="mt-4 text-sm"><span className="font-medium">{report.claims.length} afirmações analisadas</span><span className="px-2 text-faint">·</span><span className="text-muted">{inconclusive} inconclusivas</span></p>
        {report.coverage && <details className="group mt-3"><summary className="list-none text-xs text-muted hover:text-foreground">Cobertura e origem <ChevronDown size={12} className="ml-1 inline transition-transform group-open:rotate-180" /></summary><p className="mt-3 text-xs leading-6 text-muted">{report.coverage.description} Transcrição: {report.coverage.cueCount.toLocaleString('pt-BR')} blocos, de {formatTimestamp(report.coverage.firstTimestamp)} a {formatTimestamp(report.coverage.lastTimestamp)}.</p></details>}
        {report.coverage?.kind === 'selected-claims' && <p className="mt-3 text-xs leading-6 text-muted">Este recorte parcial não permite comparar participantes nem inferir intenção de mentir.</p>}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-line px-3"><Search size={15} className="shrink-0 text-faint" /><label className="sr-only" htmlFor="claim-search">Buscar afirmações</label><input id="claim-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar no debate" className="h-10 w-full min-w-0 bg-transparent text-xs outline-none placeholder:text-faint" /></div>
        <label className="sr-only" htmlFor="claim-filter">Filtrar por classificação</label><select id="claim-filter" value={filter} onChange={(event) => setFilter(event.target.value)} className="max-w-full rounded-lg border border-line bg-background px-3 py-2.5 text-xs text-muted"><option>Todas as classificações</option>{verdicts.filter((verdict) => report.claims.some((claim) => claim.verdict === verdict)).map((verdict) => <option key={verdict} value={verdict}>{verdictLabel(verdict)}</option>)}</select>
      </div>
      <section aria-label="Afirmações verificadas" className="mt-2">
        {visible.map((claim) => <ClaimItem key={claim.id} claim={claim} videoId={report.video.id} number={report.claims.indexOf(claim) + 1} participants={report.participants ?? []} />)}
        {visible.length === 0 && <p role="status" className="py-12 text-center text-sm text-muted">Nenhuma afirmação encontrada para este filtro.</p>}
      </section>
      {report.limitations?.length ? <details className="group mt-8 border-b border-line pb-5"><summary className="list-none text-sm text-muted hover:text-foreground">Limitações do relatório <ChevronDown size={14} className="ml-1 inline transition-transform group-open:rotate-180" /></summary><ul className="mt-4 list-disc space-y-2 pl-4 text-xs leading-6 text-muted">{report.limitations.map((item) => <li key={item}>{item}</li>)}</ul></details> : null}
    </main>
  )
}
