import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import index from '../../public/snapshots/index.json'
import { createClaimCard } from '../lib/claim-card'
import { ShareClaimDialog } from './ShareClaimDialog'
import { reportSchema } from '../lib/report-schema'

vi.mock('../lib/claim-card', () => ({ createClaimCard: vi.fn() }))
const report = reportSchema.parse(index.reports.q4T7plSBdJE)
const file = new File(['png'], 'checagem.png', { type: 'image/png' })
const generate = vi.mocked(createClaimCard)

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); generate.mockReset() })

function setup() {
  generate.mockResolvedValue(file)
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:card')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
}

describe('compartilhamento de uma checagem', () => {
  it('gera uma prévia e oferece PNG quando o navegador não compartilha arquivos', async () => {
    setup()
    const { unmount } = render(<ShareClaimDialog claim={report.claims[0]} video={report.video} onClose={() => {}} />)
    expect(screen.getByRole('status')).toHaveTextContent('Gerando card')
    const preview = await screen.findByRole('img')
    expect(preview).toHaveAccessibleName(expect.stringContaining(report.claims[0].explanation))
    expect(preview).not.toHaveAccessibleName(expect.stringContaining(report.claims[0].quote))
    expect(screen.getByRole('link', { name: 'Baixar PNG' })).toHaveAttribute('download', 'checagem.png')
    expect(screen.queryByRole('button', { name: 'Compartilhar imagem' })).not.toBeInTheDocument()
    unmount()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:card')
  })

  it('compartilha o PNG e permite baixar após falha; cancelar não exibe erro', async () => {
    setup()
    const share = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new DOMException('Cancelado', 'AbortError')).mockRejectedValueOnce(new Error('Falha'))
    vi.stubGlobal('navigator', { share, canShare: () => true })
    const user = userEvent.setup()
    render(<ShareClaimDialog claim={report.claims[0]} video={report.video} onClose={() => {}} />)
    await user.click(await screen.findByRole('button', { name: 'Compartilhar imagem' }))
    await waitFor(() => expect(share).toHaveBeenCalledWith(expect.objectContaining({ files: [file] })))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Compartilhar imagem' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Compartilhar imagem' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Você pode baixar o PNG.')
    expect(screen.getByRole('link', { name: 'Baixar PNG' })).toBeInTheDocument()
  })

  it('permite gerar novamente após erro e fechar a prévia', async () => {
    setup()
    generate.mockRejectedValueOnce(new Error('Não foi possível gerar o PNG.'))
    const close = vi.fn()
    const user = userEvent.setup()
    render(<ShareClaimDialog claim={report.claims[0]} video={report.video} onClose={close} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível gerar o PNG.')
    await user.click(screen.getByRole('button', { name: 'Tentar gerar novamente' }))
    expect(await screen.findByRole('img')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Fechar card' }))
    expect(close).toHaveBeenCalledOnce()
  })
})
