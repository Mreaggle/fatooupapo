import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import index from '../../public/snapshots/index.json'
import { RecentDebates as Gallery } from './RecentDebates'
import { useRecentDebates } from '../services/use-recent-debates'

function RecentDebates() { return <Gallery {...useRecentDebates()} /> }

afterEach(() => vi.unstubAllGlobals())

describe('galeria de debates checados', () => {
  it('pesquisa títulos e canais combinando palavras sem diferenciar acentos e maiúsculas', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => index })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(<RecentDebates />)
    await screen.findByRole('link', { name: index.reports.q4T7plSBdJE.video.title })
    const search = screen.getByRole('searchbox', { name: 'Pesquisar no acervo' })
    await user.type(search, '  INTELIGENCIA   KIM  ')
    expect(screen.getAllByRole('article')).toHaveLength(1)
    expect(screen.getByRole('link')).toHaveAttribute('href', '?v=q4T7plSBdJE')
    expect(screen.getByRole('status')).toHaveTextContent('1 vídeo encontrado.')
    await user.clear(search)
    await user.type(search, 'nenhum-video-com-este-titulo')
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Nenhum vídeo encontrado.')
    await user.click(screen.getByRole('button', { name: 'Limpar pesquisa' }))
    expect(search).toHaveFocus()
    expect(search).toHaveValue('')
    expect(screen.getAllByRole('article')).toHaveLength(Object.keys(index.reports).length)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('mostra carregamento e depois apresenta o debate real com link para a checagem', async () => {
    let finish: (response: unknown) => void = () => {}
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Promise((resolve) => { finish = resolve })))
    render(<RecentDebates />)
    expect(screen.getByRole('status')).toHaveTextContent('Carregando debates')
    finish({ ok: true, json: async () => index })
    const link = await screen.findByRole('link', { name: index.reports.q4T7plSBdJE.video.title })
    expect(link).toHaveAttribute('href', '?v=q4T7plSBdJE')
    expect(link).toHaveTextContent('48 afirmações analisadas')
    expect(within(link).queryByText('Checagem parcial')).not.toBeInTheDocument()
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
