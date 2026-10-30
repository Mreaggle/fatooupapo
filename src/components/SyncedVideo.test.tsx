import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AnalysisReport, Claim } from '../types'
import type { YouTubeIframeApi, YouTubePlayer, YouTubePlayerOptions } from '../services/youtube-player'
import { loadYouTubePlayerApi } from '../services/youtube-player'
import { SyncedVideo } from './SyncedVideo'

vi.mock('../services/youtube-player', () => ({ loadYouTubePlayerApi: vi.fn() }))

function claim(id: string, timestampSeconds: number): Claim {
  return { id, timestampSeconds, title: `Título ${id}`, quote: `Fala ${id}`, explanation: `Conclusão ${id}`, verdict: 'Inconclusivo', evidence: [] }
}

const report: AnalysisReport = {
  schemaVersion: 1,
  video: { id: 'q4T7plSBdJE', title: 'Debate', channel: 'Canal', url: 'https://www.youtube.com/watch?v=q4T7plSBdJE', thumbnailUrl: '' },
  status: 'completed', analyzedAt: '2026-10-30T00:00:00Z', summary: 'Resumo',
  claims: [claim('segunda', 20), claim('primeira', 10.5), claim('simultânea', 10.5)],
}

let options: YouTubePlayerOptions
let videoPlayer: YouTubePlayer
let seconds: number

beforeEach(() => {
  vi.clearAllMocks()
  seconds = 0
  videoPlayer = { getCurrentTime: () => seconds, seekTo: vi.fn((value) => { seconds = value }), destroy: vi.fn(), getIframe: () => document.querySelector('iframe')! }
  class Player {
    constructor(target: HTMLElement, config: YouTubePlayerOptions) {
      options = config
      target.replaceWith(document.createElement('iframe'))
      return videoPlayer
    }
  }
  vi.mocked(loadYouTubePlayerApi).mockResolvedValue({ Player } as YouTubeIframeApi)
})

afterEach(() => vi.useRealTimers())

async function ready() {
  await waitFor(() => expect(document.querySelector('iframe')).toBeInTheDocument())
  act(() => options.events.onReady({ target: videoPlayer }))
}

describe('vídeo com checagens sincronizadas', () => {
  it('acompanha reprodução, pausa, avanço e retorno, incluindo timestamps fracionários e simultâneos', async () => {
    render(<SyncedVideo report={report} onShowClaim={vi.fn()} />)
    await waitFor(() => expect(document.querySelector('iframe')).toBeInTheDocument())
    vi.useFakeTimers()
    act(() => options.events.onReady({ target: videoPlayer }))
    expect(screen.getByTitle('Vídeo: Debate')).toBeInTheDocument()
    expect(screen.getByText(/A primeira aparece em 00:10/)).toBeInTheDocument()
    seconds = 10.49
    act(() => { vi.advanceTimersByTime(250) })
    expect(screen.queryByText('Título primeira')).not.toBeInTheDocument()
    seconds = 10.5
    act(() => { vi.advanceTimersByTime(250) })
    expect(screen.getByText('Título primeira')).toBeInTheDocument()
    expect(screen.getByText('Título simultânea')).toBeInTheDocument()
    expect(screen.getByText('Conclusão primeira')).toBeInTheDocument()
    act(() => { vi.advanceTimersByTime(1000) })
    expect(screen.getByText('Título primeira')).toBeInTheDocument()
    seconds = 80
    act(() => { vi.advanceTimersByTime(250) })
    expect(screen.getByText('Título segunda')).toBeInTheDocument()
    expect(screen.queryByText('Título primeira')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Próxima checagem' })).toBeDisabled()
    seconds = 12
    act(() => options.events.onStateChange({ target: videoPlayer, data: 2 }))
    expect(screen.getByText('Título primeira')).toBeInTheDocument()
    seconds = 0
    act(() => { vi.advanceTimersByTime(250) })
    expect(screen.getByText(/As checagens acompanham/)).toBeInTheDocument()
  })

  it('navega entre trechos e abre a checagem completa', async () => {
    const user = userEvent.setup()
    const showClaim = vi.fn()
    render(<SyncedVideo report={report} onShowClaim={showClaim} />)
    expect(screen.getByRole('button', { name: 'Ir à primeira checagem' })).toBeDisabled()
    await ready()
    await user.click(screen.getByRole('button', { name: 'Ir à primeira checagem' }))
    expect(videoPlayer.seekTo).toHaveBeenCalledWith(10.5, true)
    act(() => options.events.onStateChange({ target: videoPlayer, data: 2 }))
    await user.click(screen.getAllByRole('link', { name: 'Ver checagem completa e fontes' })[0])
    expect(showClaim).toHaveBeenCalledWith('primeira')
    await user.click(screen.getByRole('button', { name: 'Próxima checagem' }))
    expect(videoPlayer.seekTo).toHaveBeenLastCalledWith(20, true)
    act(() => options.events.onStateChange({ target: videoPlayer, data: 1 }))
    await user.click(screen.getByRole('button', { name: 'Checagem anterior' }))
    expect(videoPlayer.seekTo).toHaveBeenLastCalledWith(10.5, true)
  })

  it('mostra erro de carregamento e permite tentar novamente', async () => {
    vi.mocked(loadYouTubePlayerApi).mockRejectedValueOnce(new Error('offline'))
    const user = userEvent.setup()
    render(<SyncedVideo report={report} onShowClaim={vi.fn()} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Verifique sua conexão')
    expect(screen.getByRole('link', { name: 'Assistir no YouTube' })).toHaveAttribute('href', report.video.url)
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    await ready()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByText('Sincronizado com o vídeo')).toBeInTheDocument()
  })

  it('trata vídeos que não permitem incorporação e cancela o player ao sair', async () => {
    const { unmount } = render(<SyncedVideo report={report} onShowClaim={vi.fn()} />)
    await ready()
    act(() => options.events.onError({ data: 101 }))
    expect(screen.getByRole('alert')).toHaveTextContent('Você pode assistir no YouTube')
    expect(screen.getByRole('button', { name: 'Ir à primeira checagem' })).toBeDisabled()
    unmount()
    expect(videoPlayer.destroy).toHaveBeenCalledOnce()
  })

  it('informa quando o iframe não fica pronto e não cria players depois de sair', async () => {
    vi.useFakeTimers()
    const { unmount } = render(<SyncedVideo report={report} onShowClaim={vi.fn()} />)
    await act(async () => {})
    act(() => { vi.advanceTimersByTime(15000) })
    expect(screen.getByRole('alert')).toHaveTextContent('O vídeo demorou para carregar')
    unmount()
    vi.useRealTimers()
    let finish: ((api: YouTubeIframeApi) => void) | undefined
    const Player = vi.fn()
    vi.mocked(loadYouTubePlayerApi).mockReturnValueOnce(new Promise((resolve) => { finish = resolve }))
    const pending = render(<SyncedVideo report={report} onShowClaim={vi.fn()} />)
    pending.unmount()
    await act(async () => { finish?.({ Player } as unknown as YouTubeIframeApi) })
    expect(Player).not.toHaveBeenCalled()
  })

  it('aceita um relatório sem afirmações', async () => {
    render(<SyncedVideo report={{ ...report, claims: [] }} onShowClaim={vi.fn()} />)
    await ready()
    expect(screen.getByText('Nenhuma afirmação checada neste vídeo.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ir à primeira checagem' })).not.toBeInTheDocument()
  })
})
