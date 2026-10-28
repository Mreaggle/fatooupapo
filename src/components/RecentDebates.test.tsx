import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import index from '../../public/snapshots/index.json'
import { RecentDebates } from './RecentDebates'

afterEach(() => vi.unstubAllGlobals())

describe('galeria de debates checados', () => {
  it('mostra carregamento e depois apresenta o debate real com link para a checagem', async () => {
    let finish: (response: unknown) => void = () => {}
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Promise((resolve) => { finish = resolve })))
    render(<RecentDebates />)
    expect(screen.getByRole('status')).toHaveTextContent('Carregando debates')
    finish({ ok: true, json: async () => index })
    const link = await screen.findByRole('link', { name: index.reports.q4T7plSBdJE.video.title })
    expect(link).toHaveAttribute('href', '?v=q4T7plSBdJE')
    expect(link).toHaveTextContent('48 afirmações analisadas')
    expect(within(link).getByText('Checagem parcial')).toBeInTheDocument()
    expect(screen.queryByText('Carregando debates checados…')).not.toBeInTheDocument()
    fireEvent.error(within(link).getByAltText(''))
    expect(link).toHaveAccessibleName(index.reports.q4T7plSBdJE.video.title)
  })

  it('informa que o acervo está vazio, sem inventar debates', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ reports: {} }) }))
    render(<RecentDebates />)
    expect(await screen.findByText('Ainda não há debates checados publicados no acervo.')).toBeInTheDocument()
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })

  it('permite tentar novamente após falha ao carregar', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new TypeError('Network error')).mockResolvedValueOnce({ ok: true, json: async () => index }))
    const user = userEvent.setup()
    render(<RecentDebates />)
    expect(await screen.findByText('Não foi possível carregar os debates do acervo.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Tentar carregar novamente' }))
    expect(await screen.findByRole('link', { name: index.reports.q4T7plSBdJE.video.title })).toBeInTheDocument()
  })
})
