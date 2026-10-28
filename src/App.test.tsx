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
    await user.click(screen.getByRole('button', { name: /verificar fatos/i }))
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
    await user.click(screen.getByRole('button', { name: /verificar fatos/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Este vídeo ainda não está no acervo')
  })

  it('abre o primeiro debate pelo ID sem chamar um serviço de IA', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => snapshots })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByLabelText('Link do vídeo do YouTube'), 'https://youtu.be/q4T7plSBdJE?si=compartilhado')
    await user.click(screen.getByRole('button', { name: /verificar fatos/i }))
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('KIM KATAGUIRI X JONES MANOEL')
    expect(screen.getByText(/48 afirmações analisadas/)).toBeInTheDocument()
    expect(window.location.search).toBe('?v=q4T7plSBdJE')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toContain('snapshots/index.json')

    await user.selectOptions(screen.getByLabelText('Filtrar por classificação'), 'Falso')
    expect(screen.getAllByRole('article').length).toBe(4)
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
    await user.click(screen.getByRole('button', { name: /consultar o primeiro debate/i }))
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    finish?.({ ok: true, json: async () => snapshots })
    await waitFor(() => expect(screen.getByRole('button', { name: /verificar fatos/i })).toBeEnabled())
    expect(screen.queryByText('48 afirmações analisadas')).not.toBeInTheDocument()
  })
})
