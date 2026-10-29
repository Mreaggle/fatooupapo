import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import snapshots from '../public/snapshots/index.json'

afterEach(() => {
  vi.unstubAllGlobals()
  window.history.replaceState({}, '', '/')
})

describe('fluxo inicial', () => {
  it('mostra feedback para uma URL inválida', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByLabelText('Link do vídeo do YouTube'), 'https://example.com/video')
    await user.click(screen.getByRole('button', { name: /verifique os fatos/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Insira um link válido')
  })

  it('informa com honestidade quando não há snapshot nem backend', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ generatedAt: new Date().toISOString(), reports: {} }),
    }))
    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByLabelText('Link do vídeo do YouTube'), 'https://youtu.be/dQw4w9WgXcQ')
    await user.click(screen.getByRole('button', { name: /verifique os fatos/i }))
    expect(await screen.findByText(/Este vídeo ainda não está no acervo/)).toBeInTheDocument()
    const request = new URL(screen.getByRole('link', { name: /confirmar pedido com github/i }).getAttribute('href')!)
    expect(request.origin).toBe('https://github.com')
    expect(request.searchParams.get('video')).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(request.searchParams.get('duration')).toBe('180')
    expect(screen.getByText(/100 créditos estimados/)).toBeInTheDocument()
    await user.clear(screen.getByLabelText('Duração do vídeo em minutos'))
    await user.type(screen.getByLabelText('Duração do vídeo em minutos'), '30')
    expect(screen.getByText(/20 créditos estimados/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ver pedidos enviados/i })).toHaveAttribute('href', expect.stringContaining('dQw4w9WgXcQ'))
    await user.clear(screen.getByLabelText('Link do vídeo do YouTube'))
    expect(screen.queryByRole('link', { name: /confirmar pedido com github/i })).not.toBeInTheDocument()
  })

  it('localiza automaticamente um pedido recusado e mostra apenas a mensagem genérica', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('api.github.com')) return { ok: true, json: async () => [{ number: 2, title: '[Análise] 06WU-H3jICE', body: 'https://youtu.be/06WU-H3jICE' }] }
      if (url.endsWith('state.json')) return { status: 404 }
      if (url.endsWith('status.json')) return { ok: true, json: async () => ({ interrupted: false, kind: 'rejected', message: 'Este vídeo não requer fact-checking.', runUrl: 'https://github.com/Mreaggle/fatooupapo/actions/runs/123' }) }
      return { ok: true, json: async () => ({ reports: {} }) }
    }))
    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByLabelText('Link do vídeo do YouTube'), 'https://youtu.be/06WU-H3jICE')
    await user.click(screen.getByRole('button', { name: /verifique os fatos/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/^Este vídeo não requer fact-checking\.$/)
    expect(screen.queryByLabelText('Duração do vídeo em minutos')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /confirmar pedido/ })).not.toBeInTheDocument()
  })

  it('abre o primeiro debate pelo ID sem chamar um serviço de IA', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => snapshots })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByLabelText('Link do vídeo do YouTube'), 'https://youtu.be/q4T7plSBdJE?si=compartilhado')
    await user.click(screen.getByRole('button', { name: /verifique os fatos/i }))
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('KIM KATAGUIRI X JONES MANOEL')
    expect(screen.getByText(/48 afirmações analisadas/)).toBeInTheDocument()
    expect(window.location.search).toBe('?v=q4T7plSBdJE')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0][0]).toContain('snapshots/index.json')
    expect(fetchMock.mock.calls.every(([, options]) => !options?.method || options.method === 'GET')).toBe(true)

    expect(screen.getByRole('option', { name: 'Fato' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Falso' })).not.toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Filtrar por classificação'), screen.getByRole('option', { name: 'Papo' }))
    expect(screen.getAllByRole('article').length).toBe(4)
    for (const article of screen.getAllByRole('article')) expect(article).toHaveTextContent('Papo')
    await user.click(screen.getByRole('button', { name: /nova consulta/i }))
    expect(screen.getByLabelText('Link do vídeo do YouTube')).toBeInTheDocument()
    expect(window.location.search).toBe('')
  })

  it('restaura o relatório ao abrir um link compartilhado', async () => {
    window.history.replaceState({}, '', '/?v=q4T7plSBdJE')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => snapshots }))
    render(<App />)
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('KIM KATAGUIRI'))
  })

  it('cancela uma consulta e ignora uma resposta tardia', async () => {
    let finish: ((value: unknown) => void) | undefined
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Promise((resolve) => { finish = resolve })))
    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByLabelText('Link do vídeo do YouTube'), 'https://youtu.be/q4T7plSBdJE')
    await user.click(screen.getByRole('button', { name: /verifique os fatos/i }))
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    finish?.({ ok: true, json: async () => snapshots })
    await waitFor(() => expect(screen.getByRole('button', { name: /verifique os fatos/i })).toBeEnabled())
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Você assiste e')
  })
})
