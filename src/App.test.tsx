import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

afterEach(() => vi.unstubAllGlobals())

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
    expect(await screen.findByRole('alert')).toHaveTextContent('backend de transcrição e checagem ainda não foi configurado')
  })
})
