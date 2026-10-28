// @vitest-environment node
import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GeminiClient } from './gemini.ts'
import { completedReport, groundedSources, processBatch, resolveJudgment, type PipelineState } from './pipeline.ts'
import { parseRequest } from './request.ts'
import { parseTranscript, transcriptWindows, type Cue } from './transcript.ts'

const video = { id: 'dQw4w9WgXcQ', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', title: 'Vídeo de teste', channel: 'Canal', thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg' }
const source = { id: 'documento', title: 'Documento', url: 'https://example.org/documento', publisher: 'Instituição', excerpt: 'Dado fornecido para teste.' }
const judgment = { verdict: 'Verdadeiro' as const, explanation: 'O documento sustenta o dado.', limitations: 'Conferir o documento original.', evidence: [{ sourceId: source.id, position: 'supports' as const }] }

function initialState(cues: Cue[]): PipelineState {
  return { version: 1, transcriptHash: 'a'.repeat(64), referenceDate: '2024-10-01', phase: 'inventory', nextWindow: 0, totalWindows: transcriptWindows(cues).length, inventory: [], claims: [] }
}

function clientFor(handler: (prompt: string, search: boolean) => unknown, maxCalls = 20) {
  const fetcher = vi.fn<typeof fetch>().mockImplementation(async (_url, request) => {
    const body = JSON.parse(String(request?.body))
    const value = handler(body.contents[0].parts[0].text, Boolean(body.tools))
    if (value instanceof Response) return value
    return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(value) }] } }] })
  })
  const pause = vi.fn().mockResolvedValue(undefined)
  return { client: new GeminiClient({ key: 'test-key', model: 'test-model', fetcher, pause, maxCalls }), fetcher, pause }
}

describe('entrada e limites da transcrição', () => {
  it('normaliza SRT com BOM, CRLF, múltiplas linhas e IDs não sequenciais', () => {
    expect(parseTranscript('\uFEFF10\r\n00:00:01,200 --> 00:00:03,000\r\nLinha um\r\nlinha dois\r\n')).toEqual([{ id: 1, start: 1.2, end: 3, text: 'Linha um linha dois' }])
  })

  it('aceita WebVTT, identificadores, configurações e notas', () => {
    expect(parseTranscript('WEBVTT\n\nNOTE observação\nignorar\n\ncue-a\n00:01.000 --> 00:03.500 align:start\n<v Ana>Uma <b>fala</b>\n')).toEqual([{ id: 1, start: 1, end: 3.5, text: 'Uma fala' }])
  })

  it('preserva comparações matemáticas e separa palavras em quebras HTML', () => {
    const cues = parseTranscript('1\n00:00:00,000 --> 00:00:01,000\nx < 5 > 3<br>outra linha')
    expect(cues[0].text).toBe('x < 5 > 3 outra linha')
  })

  it.each([
    '', 'WEBVTT', '1\n99:99:99,000 --> 99:99:99,999\nTexto',
    '1\n00:01:00,000 --> 00:00:30,000\nTexto',
    '1\n03:59:59,000 --> 04:00:00,001\nTexto',
    '1\n00:00:02,000 --> 00:00:03,000\nTexto\n\n2\n00:00:01,000 --> 00:00:02,000\nOutro',
  ])('rejeita legenda inválida ou acima de 4h: %s', (input) => {
    expect(() => parseTranscript(input)).toThrow()
  })

  it('aceita exatamente 4 horas e recusa arquivos excessivos', () => {
    expect(parseTranscript('1\n03:59:59,000 --> 04:00:00,000\nFim')[0].end).toBe(14400)
    expect(() => parseTranscript('a'.repeat(600001))).toThrow(/600 mil/)
  })

  it('cobre todos os blocos com sobreposição, sem amostragem', () => {
    const cues = Array.from({ length: 48 }, (_, index) => ({ id: index + 1, start: index, end: index + 1, text: 'a'.repeat(1200) }))
    const windows = transcriptWindows(cues)
    expect(windows.length).toBeGreaterThan(4)
    expect(new Set(windows.flat().map((cue) => cue.id)).size).toBe(48)
    for (let index = 1; index < windows.length; index++) expect(windows[index][0].id).toBeLessThanOrEqual(windows[index - 1].at(-1)!.id)
  })

  it('valida URL, data e duração declarada antes de consumir IA', () => {
    const body = '### Vídeo do YouTube\n\nhttps://youtu.be/dQw4w9WgXcQ\n\n### Duração em minutos\n\n240\n\n### Data de referência\n\n2024-10-01\n\n### Legenda SRT ou VTT\n\n```text\n1\n00:00:00,000 --> 00:00:01,000\nTexto\n```'
    expect(parseRequest(body, 1).transcript).toContain('-->')
    expect(() => parseRequest(body.replace('240', '241'), 1)).toThrow()
    expect(() => parseRequest(body.replace('2024-10-01', '2024-02-30'), 1)).toThrow()
    expect(() => parseRequest(body.replace('https://youtu.be/dQw4w9WgXcQ', 'https://example.org'), 1)).toThrow()
  })
})

describe('orçamento e erros da IA', () => {
  it('para no 429 sem repetir ou expor a chave', async () => {
    const { client, fetcher } = clientFor(() => new Response('secret provider body', { status: 429 }))
    await expect(client.generate('teste')).rejects.toThrow('429')
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(fetcher.mock.calls[0][0]).not.toContain('test-key')
  })

  it('respeita o intervalo e o teto de chamadas', async () => {
    const { client, fetcher, pause } = clientFor(() => ({ ok: true }), 2)
    await client.generate('primeira')
    await client.generate('segunda')
    expect(pause.mock.calls[1][0]).toBeGreaterThan(14_000)
    await expect(client.generate('terceira')).rejects.toThrow(/Orçamento/)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it.each([400, 403, 500])('explica erro HTTP %i sem incluir o corpo do provedor', async (status) => {
    const { client } = clientFor(() => new Response('secret-body', { status }))
    await expect(client.generate('teste')).rejects.toThrow(`HTTP ${status}`)
  })

  it('recusa uma resposta truncada ou bloqueada', async () => {
    const { client } = clientFor(() => Response.json({ candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: '{}' }] } }] }))
    await expect(client.generate('teste')).rejects.toThrow(/incompleta/)
  })
})

describe('inventário integral e retomada por lotes', () => {
  it('preserva 48 afirmações e só libera relatório após todos os lotes', async () => {
    const cues = Array.from({ length: 48 }, (_, index) => ({ id: index + 1, start: index * 2, end: index * 2 + 1, text: `Afirmação ${index + 1}.` }))
    const state = initialState(cues)
    const checkpoint = vi.fn().mockResolvedValue(undefined)
    const handler = (prompt: string) => prompt.includes('LEGENDAS:')
      ? { claims: cues.map((cue) => ({ cueStart: cue.id, cueEnd: cue.id, title: cue.text })) }
      : judgment
    for (let batch = 0; batch < 6; batch++) {
      const { client } = clientFor(handler)
      await processBatch({ client, video, cues, referenceDate: state.referenceDate, batchSize: 8, sources: [source], search: false, state, checkpoint, audit: async () => {} })
      expect(state.inventory).toHaveLength(48)
      expect(state.claims).toHaveLength((batch + 1) * 8)
      expect(client.calls).toBeLessThanOrEqual(9)
      if (batch < 5) expect(() => completedReport(video, cues, state)).toThrow(/inventário/)
    }
    expect(completedReport(video, cues, state).coverage?.kind).toBe('all-identified-claims')
    expect(checkpoint).toHaveBeenCalledTimes(49)
  })

  it('retoma janelas sem rechecar o começo e não checa antes do inventário completo', async () => {
    const cues = Array.from({ length: 20 }, (_, index) => ({ id: index + 1, start: index, end: index + 1, text: 'x'.repeat(2000) }))
    const state = initialState(cues)
    const calls: number[] = []
    const handler = (prompt: string) => {
      const window = JSON.parse(prompt.split('LEGENDAS:\n')[1]) as Cue[]
      calls.push(window[0].id)
      return { claims: [{ cueStart: window[0].id, cueEnd: window[0].id, title: 'Dado' }] }
    }
    for (let batch = 0; batch < 2; batch++) {
      const { client } = clientFor(handler, 1)
      await processBatch({ client, video, cues, referenceDate: state.referenceDate, batchSize: 8, sources: [source], search: false, state, checkpoint: async () => {}, audit: async () => {} })
      expect(state.claims).toHaveLength(0)
    }
    expect(state.nextWindow).toBe(2)
    expect(calls[1]).toBeGreaterThan(calls[0])
  })

  it('preserva o último item concluído quando a cota acaba', async () => {
    const cues = [{ id: 1, start: 0, end: 1, text: 'Um dado.' }, { id: 2, start: 1, end: 2, text: 'Outro dado.' }]
    const state = initialState(cues)
    let requests = 0
    const { client } = clientFor((prompt) => {
      requests += 1
      if (requests === 3) return new Response('', { status: 429 })
      return prompt.includes('LEGENDAS:') ? { claims: cues.map((cue) => ({ cueStart: cue.id, cueEnd: cue.id, title: cue.text })) } : judgment
    })
    await expect(processBatch({ client, video, cues, referenceDate: state.referenceDate, batchSize: 8, sources: [source], search: false, state, checkpoint: async () => {}, audit: async () => {} })).rejects.toThrow('429')
    expect(state.claims).toHaveLength(1)
    expect(state.phase).toBe('checking')
  })

  it('retoma a classificação sem repetir uma busca já salva', async () => {
    const cues = [{ id: 1, start: 0, end: 1, text: 'Um dado.' }]
    const state = initialState(cues)
    state.phase = 'checking'; state.nextWindow = state.totalWindows
    state.inventory = [{ cueStart: 1, cueEnd: 1, title: 'Um dado' }]
    state.pendingEvidence = { claimIndex: 0, sources: [source] }
    const { client, fetcher } = clientFor(() => judgment)
    await processBatch({ client, video, cues, referenceDate: state.referenceDate, batchSize: 8, sources: [], search: true, state, checkpoint: async () => {}, audit: async () => {} })
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).not.toHaveProperty('tools')
    expect(state.phase).toBe('completed')
    expect(state.pendingEvidence).toBeUndefined()
  })

  it('rejeita citações fora da janela', async () => {
    const cues = [{ id: 1, start: 0, end: 1, text: 'Dado.' }]
    const state = initialState(cues)
    const { client } = clientFor(() => ({ claims: [{ cueStart: 2, cueEnd: 2, title: 'Inventado' }] }))
    await expect(processBatch({ client, video, cues, referenceDate: state.referenceDate, batchSize: 8, sources: [source], search: false, state, checkpoint: async () => {}, audit: async () => {} })).rejects.toThrow(/fora da janela/)
    expect(state.nextWindow).toBe(0)
  })
})

describe('fontes e publicação', () => {
  it('aceita apenas fontes HTTPS associadas a segmentos da busca', () => {
    const sources = groundedSources({ candidates: [{ groundingMetadata: {
      groundingChunks: [{ web: { uri: 'https://example.org', title: 'Fonte' } }, { web: { uri: 'https://unused.org', title: 'Não citada' } }, { web: { uri: 'javascript:alert(1)', title: 'Inválida' } }],
      groundingSupports: [{ segment: { text: 'Dado encontrado.' }, groundingChunkIndices: [0, 2] }],
    } }] })
    expect(sources).toHaveLength(1)
    expect(sources[0].excerpt).toBe('Dado encontrado.')
  })

  it('recusa fontes inventadas e torna inconclusiva uma conclusão só contextual', () => {
    expect(() => resolveJudgment({ ...judgment, evidence: [{ sourceId: 'inventada', position: 'supports' }] }, [source])).toThrow(/fonte/)
    expect(resolveJudgment({ ...judgment, evidence: [{ sourceId: source.id, position: 'context' }] }, [source]).verdict).toBe('Inconclusivo')
  })

  const directories: string[] = []
  afterEach(async () => { await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))) })

  it('exige revisão explícita, completude e correspondência literal para promover', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'fato-analysis-'))
    directories.push(directory)
    const draft = join(directory, 'drafts', video.id)
    await mkdir(draft, { recursive: true })
    const subtitle = '1\n00:00:00,000 --> 00:00:01,000\nUm dado.'
    const cues = parseTranscript(subtitle)
    const state = initialState(cues)
    state.transcriptHash = createHash('sha256').update(subtitle).digest('hex')
    state.phase = 'completed'
    state.nextWindow = state.totalWindows
    state.inventory = [{ cueStart: 1, cueEnd: 1, title: 'Um dado' }]
    state.claims = [{ id: 'claim-1', ...state.inventory[0], quote: 'Um dado.', timestampSeconds: 0, verdict: 'Inconclusivo', explanation: 'Sem base suficiente.', evidence: [] }]
    const report = completedReport(video, cues, state)
    report.summary = 'Resumo editorial revisado.'
    await writeFile(join(draft, 'state.json'), JSON.stringify(state))
    await writeFile(join(draft, 'request.json'), JSON.stringify({ videoId: video.id, referenceDate: state.referenceDate, durationMinutes: 1, issueNumber: 1, origin: 'issue' }))
    await writeFile(join(draft, 'source.txt'), subtitle)
    await writeFile(join(draft, 'report.json'), JSON.stringify(report))
    const script = resolve('scripts/analysis/promote.ts')
    const run = (...args: string[]) => spawnSync(process.execPath, [script, video.id, ...args], { cwd: directory, encoding: 'utf8' })
    expect(run().status).not.toBe(0)
    report.claims[0].quote = 'Citação inventada.'
    await writeFile(join(draft, 'report.json'), JSON.stringify(report))
    expect(run('--reviewed').status).not.toBe(0)
    report.claims[0].quote = 'Um dado.'
    await writeFile(join(draft, 'report.json'), JSON.stringify(report))
    const published = run('--reviewed')
    expect(published.stderr).toBe('')
    expect(published.status).toBe(0)
    expect(await readFile(join(directory, 'snapshots', `${video.id}.md`), 'utf8')).toContain('fato-ou-papo:json')
    expect(run('--reviewed').status).not.toBe(0)
  })
})
