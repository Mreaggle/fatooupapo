import { useState } from 'react'
import { ArrowUpRight, MessageSquareQuote } from 'lucide-react'
import type { useRecentDebates } from '../services/use-recent-debates'
import type { RecentDebate } from '../types'

function DebateCard({ debate, featured }: { debate: RecentDebate; featured: boolean }) {
  const [imageFailed, setImageFailed] = useState(false)
  const titleId = `recent-debate-${debate.video.id}`
  const date = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(debate.analyzedAt))

  return <article className="recent-debate group min-w-0">
    <a className={`recent-debate__link flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface transition-colors hover:border-foreground/40 ${featured ? 'sm:grid sm:grid-cols-2' : ''}`} href={`?v=${debate.video.id}`} aria-labelledby={titleId}>
      <div className="recent-debate__thumbnail relative flex aspect-video items-center justify-center overflow-hidden bg-white/5">
        <MessageSquareQuote size={40} className="absolute text-faint" aria-hidden="true" />
        {!imageFailed && <img src={debate.video.thumbnailUrl} alt="" width={640} height={360} loading="lazy" decoding="async" className="relative z-10 h-full w-full object-cover transition-transform group-hover:scale-[1.03]" onError={() => setImageFailed(true)} />}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs text-muted">{debate.video.channel}</p>
        <h3 id={titleId} className="mt-2 font-serif text-xl leading-7 text-foreground">{debate.video.title}</h3>
        <p className="recent-debate__meta mt-3 text-xs leading-5 text-muted">{debate.claimCount} {debate.claimCount === 1 ? 'afirmação analisada' : 'afirmações analisadas'}<br />Checado em <time dateTime={debate.analyzedAt}>{date}</time></p>
        <span className="mt-auto flex items-center justify-between gap-3 pt-5 text-xs font-medium text-foreground">Ver checagem <ArrowUpRight size={16} aria-hidden="true" /></span>
      </div>
    </a>
  </article>
}

export function RecentDebates({ debates, status, retry }: ReturnType<typeof useRecentDebates>) {
  return <section aria-labelledby="recent-debates-title" className="recent-debates mx-auto w-full max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
    <div className="mb-7 border-b border-line pb-6">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-faint">No acervo</p>
      <h2 id="recent-debates-title" className="mt-2 font-serif text-3xl leading-tight text-foreground sm:text-4xl">Debates checados recentemente</h2>
      <p className="mt-3 max-w-xl text-sm leading-6 text-muted">Consulte as análises publicadas e suas fontes. A consulta não consome créditos.</p>
    </div>
    {status === 'loading' && <p role="status" className="text-sm text-muted">Carregando debates checados…</p>}
    {status === 'error' && <div className="rounded-lg border border-line p-5 text-sm leading-6 text-muted">
      <p>Não foi possível carregar os debates do acervo.</p>
      <button type="button" className="mt-2 text-foreground underline underline-offset-4" onClick={retry}>Tentar carregar novamente</button>
    </div>}
    {status === 'ready' && (debates.length ? <div className={`recent-debates__grid grid gap-6 ${debates.length > 1 ? 'sm:grid-cols-2' : ''} ${debates.length > 2 ? 'lg:grid-cols-3' : ''}`}>{debates.map((debate) => <DebateCard key={debate.video.id} debate={debate} featured={debates.length === 1} />)}</div> : <p role="status" className="text-sm text-muted">Ainda não há debates checados publicados no acervo.</p>)}
  </section>
}
