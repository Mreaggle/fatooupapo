import { useState } from 'react'
import { ArrowUpRight, MessageSquareQuote, Search } from 'lucide-react'
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
  const [query, setQuery] = useState('')
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean)
  const visible = debates.filter(({ video }) => {
    const text = normalize(`${video.title} ${video.channel}`)
    return terms.every((term) => text.includes(term))
  })

  return <section id="acervo" aria-labelledby="recent-debates-title" className="recent-debates mx-auto w-full max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
    <div className="mb-7 border-b border-line pb-6">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-faint">No acervo</p>
      <h2 id="recent-debates-title" className="mt-2 font-serif text-3xl leading-tight text-foreground sm:text-4xl">Debates checados recentemente</h2>
      <p className="mt-3 max-w-xl text-sm leading-6 text-muted">Consulte as análises publicadas e suas fontes. A consulta não consome créditos.</p>
    </div>
    <div role="search" aria-label="Pesquisa de vídeos do acervo" className="mb-6">
      <label htmlFor="archive-search" className="text-sm font-medium">Pesquisar no acervo</label>
      <div className="mt-3 flex min-w-0 items-center gap-3 rounded-lg border border-line bg-surface px-4 focus-within:ring-1 focus-within:ring-foreground/60">
        <Search size={18} className="shrink-0 text-faint" aria-hidden="true" />
        <input id="archive-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Título ou canal" aria-describedby="archive-search-help" className="h-12 w-full min-w-0 scroll-mt-24 bg-transparent text-sm outline-none placeholder:text-faint" />
        {query && <button type="button" onClick={() => { setQuery(''); document.getElementById('archive-search')?.focus() }} className="shrink-0 text-xs text-muted underline underline-offset-4 hover:text-foreground">Limpar pesquisa</button>}
      </div>
      <p id="archive-search-help" className="mt-2 text-xs text-muted">Pesquise pelo título do vídeo ou pelo nome do canal.</p>
    </div>
    {status === 'loading' && <p role="status" className="text-sm text-muted">Carregando debates checados…</p>}
    {status === 'error' && <div className="rounded-lg border border-line p-5 text-sm leading-6 text-muted">
      <p>Não foi possível carregar os debates do acervo.</p>
      <button type="button" className="mt-2 text-foreground underline underline-offset-4" onClick={retry}>Tentar carregar novamente</button>
    </div>}
    {status === 'ready' && (debates.length ? <>
      <p role="status" className="mb-5 text-sm text-muted">{visible.length ? `${visible.length} ${visible.length === 1 ? 'vídeo encontrado' : 'vídeos encontrados'}.` : 'Nenhum vídeo encontrado. Tente outro título ou canal.'}</p>
      <div className={`recent-debates__grid grid gap-6 ${visible.length > 1 ? 'sm:grid-cols-2' : ''} ${visible.length > 2 ? 'lg:grid-cols-3' : ''}`}>{visible.map((debate) => <DebateCard key={debate.video.id} debate={debate} featured={visible.length === 1} />)}</div>
    </> : <p role="status" className="text-sm text-muted">Ainda não há debates checados publicados no acervo.</p>)}
  </section>
}
