import { afterEach, describe, expect, it, vi } from 'vitest'
import { readCreditBalance, readProcessingProgress } from './processing'
import { creditWindowMs } from '../lib/analysis-credits'

afterEach(() => vi.unstubAllGlobals())

describe('acompanhamento público', () => {
  it('mostra espera sem inventar progresso quando o lote ainda não existe', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 404 }))
    expect(await readProcessingProgress('dQw4w9WgXcQ', '123', new AbortController().signal)).toBeNull()
  })

  it('recusa números de pedido inválidos antes de acessar a rede', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    await expect(readProcessingProgress('dQw4w9WgXcQ', '../123', new AbortController().signal)).rejects.toThrow()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('informa interrupção mesmo quando a primeira etapa não concluiu', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ status: 404 }).mockResolvedValueOnce({ ok: true, json: async () => ({ interrupted: true, message: 'Execução interrompida.', runUrl: 'https://github.com/Mreaggle/fatooupapo/actions/runs/123' }) }))
    const state = await readProcessingProgress('dQw4w9WgXcQ', '123', new AbortController().signal)
    expect(state?.notice?.interrupted).toBe(true)
    expect(state?.nextWindow).toBe(0)
  })

  it('não apresenta saldo cheio quando a rede falha', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Falha de rede')))
    await expect(readCreditBalance('teste', new AbortController().signal)).rejects.toThrow()
  })

  it('renova o saldo após 24h, sem acumular créditos', async () => {
    const started = Date.now() - creditWindowMs - 1000
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ users: { '123': { login: 'Teste', spent: 100, windowStartedAt: started } } }) }))
    expect(await readCreditBalance('teste', new AbortController().signal)).toEqual({ remaining: 100, resetsAt: null })
  })
})
