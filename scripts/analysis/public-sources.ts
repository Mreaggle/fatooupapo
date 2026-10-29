import { sourcesSchema, type Source } from './pipeline.ts'

const api = 'https://pt.wikipedia.org/w/api.php'
const userAgent = 'FatoOuPapo/1.0 (https://github.com/Mreaggle/fatooupapo; public factual review)'
const stopwords = new Set('a o as os de da do das dos e em no na nos nas um uma para por com que se eu voce nos eles ele ela meu minha seu sua foi foram tem tinha era agora pais governo presidente afirmou disse afirma sobre'.split(' '))

export function sourceQuery(title: string) {
  return title.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().match(/[a-z0-9]+/g)
    ?.filter((word) => word.length > 2 && !stopwords.has(word)).slice(0, 6).join(' ') ?? ''
}

// Finite public API requests, fixed origin, historical revisions and no secret.
// These are secondary sources; the reviewer must check cited primary documents.
export async function publicSources(title: string, referenceDate: string, fetcher: typeof fetch = fetch): Promise<Source[]> {
  const query = sourceQuery(title)
  if (!query) return []
  async function get(parameters: Record<string, string>) {
    const url = new URL(api)
    url.search = new URLSearchParams({ format: 'json', formatversion: '2', maxlag: '5', ...parameters }).toString()
    const response = await fetcher(url, { headers: { 'User-Agent': userAgent, Accept: 'application/json' }, signal: AbortSignal.timeout(20_000), redirect: 'error' })
    if (response.status === 429) throw new Error('Cota das fontes públicas excedida. Retomada adiada, sem novas tentativas nesta execução.')
    if (!response.ok) throw new Error('Não foi possível consultar as fontes públicas. O checkpoint será preservado.')
    const result = await response.json()
    if (result.error) throw new Error('A fonte pública não pôde concluir a pesquisa. O checkpoint será preservado.')
    return result
  }
  const search = await get({ action: 'query', list: 'search', srsearch: query, srlimit: '3', srnamespace: '0' })
  const results: Source[] = []
  for (const item of (search.query?.search ?? []).slice(0, 3)) {
    if (!Number.isSafeInteger(item.pageid) || item.pageid < 1) continue
    const data = await get({ action: 'query', prop: 'revisions', pageids: String(item.pageid), rvprop: 'ids|timestamp|content', rvslots: 'main', rvlimit: '1', rvstart: `${referenceDate}T23:59:59Z`, rvdir: 'older' })
    const page = data.query?.pages?.[0]
    const revision = page?.revisions?.[0]
    const text = revision?.slots?.main?.content
    if (typeof text !== 'string' || !Number.isSafeInteger(revision.revid) || revision.revid < 1 || Date.parse(revision.timestamp) > Date.parse(`${referenceDate}T23:59:59Z`)) continue
    // Keep retrieved wikitext as data, including reference markers; never execute it.
    const excerpt = text.replace(/<!--[\s\S]*?-->/g, '').slice(0, 2000).trim()
    if (!excerpt) continue
    results.push({ id: `wikipedia-${revision.revid}`, title: String(page.title).slice(0, 300),
      url: `https://pt.wikipedia.org/w/index.php?oldid=${revision.revid}`, publisher: 'Wikipédia · CC BY-SA 4.0 · fonte secundária',
      publishedAt: String(revision.timestamp).slice(0, 10), excerpt })
  }
  return sourcesSchema.parse(results)
}
