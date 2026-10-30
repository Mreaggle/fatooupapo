import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { YouTubeIframeApi } from './youtube-player'

beforeEach(() => {
  vi.resetModules()
  delete window.YT
  delete window.onYouTubeIframeAPIReady
})

afterEach(() => {
  document.querySelectorAll('script[src="https://www.youtube.com/iframe_api"]').forEach((script) => script.remove())
  delete window.YT
  delete window.onYouTubeIframeAPIReady
  vi.useRealTimers()
})

describe('carregamento da API do YouTube', () => {
  it('compartilha o script entre consultas e reutiliza a API pronta', async () => {
    const previousReady = vi.fn()
    window.onYouTubeIframeAPIReady = previousReady
    const { loadYouTubePlayerApi } = await import('./youtube-player')
    const first = loadYouTubePlayerApi()
    const second = loadYouTubePlayerApi()
    expect(first).toBe(second)
    expect(document.querySelectorAll('script[src="https://www.youtube.com/iframe_api"]')).toHaveLength(1)
    window.YT = { Player: vi.fn() } as unknown as YouTubeIframeApi
    window.onYouTubeIframeAPIReady?.()
    await expect(first).resolves.toBe(window.YT)
    await expect(loadYouTubePlayerApi()).resolves.toBe(window.YT)
    expect(previousReady).toHaveBeenCalledOnce()
    expect(window.onYouTubeIframeAPIReady).toBe(previousReady)
  })

  it('permite nova tentativa após erro na rede', async () => {
    const { loadYouTubePlayerApi } = await import('./youtube-player')
    const failed = expect(loadYouTubePlayerApi()).rejects.toThrow('Não foi possível carregar')
    document.querySelector('script[src="https://www.youtube.com/iframe_api"]')!.dispatchEvent(new Event('error'))
    await failed
    const next = loadYouTubePlayerApi()
    window.YT = { Player: vi.fn() } as unknown as YouTubeIframeApi
    window.onYouTubeIframeAPIReady?.()
    await expect(next).resolves.toBe(window.YT)
  })

  it('encerra a espera por um script bloqueado', async () => {
    vi.useFakeTimers()
    const { loadYouTubePlayerApi } = await import('./youtube-player')
    const failed = expect(loadYouTubePlayerApi()).rejects.toThrow('Não foi possível carregar')
    await vi.advanceTimersByTimeAsync(15000)
    await failed
    expect(document.querySelector('script[src="https://www.youtube.com/iframe_api"]')).not.toBeInTheDocument()
  })
})
