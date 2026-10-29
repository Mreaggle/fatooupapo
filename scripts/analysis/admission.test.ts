// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { eligibleTitle, eligibleTranscript } from './eligibility.ts'
import { parseTranscript } from './transcript.ts'
import { budgetSchema, reserveBudget } from './budget.ts'
import { publicSources } from './public-sources.ts'

describe('admissão de vídeos antes do débito', () => {
  it.each(['FLÁVIO BOLSONARO X LULA: DEBATE PRESIDENCIAL DO 2º TURNO | ÍNTEGRA', 'DEBATE: KIM KATAGUIRI X JONES MANOEL', 'DEBATE COMPLETO na Globo | LULA e FLÁVIO BOLSONARO'])('aceita o título de debate: %s', (title) => expect(eligibleTitle(title)).toBe(true))
  it.each(['PAVANATO, RENNÓ E FIRMINO EXPÕEM TUDO SOBRE O DEBATE DA BAND', 'REACT: DEBATE LULA X FLAVIO', 'Melhores momentos do debate', 'DEBATE — ANÁLISE DO DEBATE', 'DEBATE (PARÓDIA)', 'Show ao vivo'])('recusa comentário, corte ou outro conteúdo: %s', (title) => expect(eligibleTitle(title)).toBe(false))
  it('aceita os SRTs integrais fornecidos e recusa um monólogo ou trecho curto', () => {
    for (const id of ['RugVB17uRVM', '6BBZWwq2juE']) expect(eligibleTranscript(parseTranscript(readFileSync(`requests/${id}.srt`, 'utf8')))).toBe(true)
    expect(eligibleTranscript([{ id: 1, start: 0, end: 60, text: 'Uma pergunta e uma resposta de candidatos.' }])).toBe(false)
    expect(eligibleTranscript(Array.from({ length: 100 }, (_, i) => ({ id: i + 1, start: i * 15, end: i * 15 + 15, text: 'Música instrumental '.repeat(20) })))).toBe(false)
  })
})

describe('orçamento persistente, independente de execuções vazias da fila', () => {
  it('limita a dois lotes por dia, impede repetição da mesma tentativa e renova em UTC', () => {
    const now = new Date('2026-10-29T23:59:00Z')
    const empty = budgetSchema.parse({ version: 1, days: {} })
    const one = reserveBudget(empty, '100-1', 2, now)
    expect(one.allowed).toBe(true)
    expect(reserveBudget(one.ledger, '100-1', 2, now).allowed).toBe(false)
    const two = reserveBudget(one.ledger, '101-1', 2, now)
    expect(two.allowed).toBe(true)
    expect(reserveBudget(two.ledger, '102-1', 2, now)).toMatchObject({ allowed: false, retryAt: '2026-10-30T00:00:00.000Z' })
    expect(reserveBudget(two.ledger, '102-1', 2, new Date('2026-10-30T00:00:00Z')).allowed).toBe(true)
  })
  it('conta nova tentativa de execução e respeita um teto reduzido', () => {
    const empty = budgetSchema.parse({ version: 1, days: {} })
    const now = new Date('2026-10-29T12:00:00Z')
    const one = reserveBudget(empty, '100-1', 1, now)
    expect(reserveBudget(one.ledger, '100-2', 1, now).allowed).toBe(false)
    expect(() => reserveBudget(empty, '100-1', 3, now)).toThrow()
  })
})

describe('evidências públicas sem chave e com referência temporal', () => {
  it('consulta apenas a API fixa e cita a revisão anterior à fala, sem gerar links pela IA', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ query: { search: [{ pageid: 42 }] } }))
      .mockResolvedValueOnce(Response.json({ query: { pages: [{ title: 'Sistema Único de Saúde', revisions: [{ revid: 12345, timestamp: '2026-10-01T00:00:00Z', slots: { main: { content: 'O sistema foi criado pela Constituição de 1988.' } } }] }] } }))
    const result = await publicSources('Sistema Único de Saúde', '2026-10-18', fetcher)
    expect(result[0]).toMatchObject({ url: 'https://pt.wikipedia.org/w/index.php?oldid=12345', publishedAt: '2026-10-01' })
    expect(fetcher.mock.calls.every(([url]) => new URL(String(url)).origin === 'https://pt.wikipedia.org')).toBe(true)
    expect(new URL(String(fetcher.mock.calls[1][0])).searchParams.get('rvstart')).toBe('2026-10-18T23:59:59Z')
  })
  it('não transforma ausência de resultado em evidência', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ query: { search: [] } }))
    expect(await publicSources('Alegação sem documento', '2026-10-18', fetcher)).toEqual([])
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it('interrompe 429 sem novas tentativas', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 429 }))
    await expect(publicSources('PIB brasileiro', '2026-10-18', fetcher)).rejects.toThrow(/Cota/)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})
