import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DebateCharts } from './DebateCharts'
import snapshots from '../../public/snapshots/index.json'
import type { AnalysisReport } from '../types'

const report = snapshots.reports.RugVB17uRVM as AnalysisReport

describe('gráficos acessíveis das checagens importadas', () => {
  it('exibe dois medidores, seis categorias por pessoa e explica a cobertura parcial', () => {
    render(<DebateCharts report={report} speakers={{}} />)
    expect(screen.getAllByRole('img')).toHaveLength(2)
    expect(screen.getByText(/Cobertura parcial/)).toBeInTheDocument()
    for (const name of ['Lula', 'Flávio Bolsonaro']) {
      const distribution = screen.getByRole('list', { name: `Distribuição de ${name}` })
      expect(within(distribution).getAllByRole('listitem')).toHaveLength(6)
      expect(within(distribution).getByText('Fato')).toBeInTheDocument()
      expect(within(distribution).getByText('Papo')).toBeInTheDocument()
    }
    expect(screen.getByText(/Cada afirmação conta uma vez/)).toBeInTheDocument()
  })
})
