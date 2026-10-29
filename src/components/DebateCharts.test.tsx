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
    expect(screen.queryByText(/Precisão média estimada de identificação:/)).not.toBeInTheDocument()
  })

  it('exibe medidores preenchidos e a precisão média dos locutores detectados no MVP', () => {
    render(<DebateCharts report={snapshots.reports.q4T7plSBdJE as AnalysisReport} speakers={{}} />)
    const jones = screen.getByRole('group', { name: 'Resumo de Jones Manoel' })
    const kim = screen.getByRole('group', { name: 'Resumo de Kim Kataguiri' })
    expect(jones).toHaveTextContent('17 afirmações atribuídas')
    expect(jones).toHaveTextContent('Precisão média estimada de identificação: 85,5%')
    expect(jones).toHaveTextContent('Média de 17 de 17 afirmações atribuídas.')
    expect(within(jones).getByRole('img')).toHaveAccessibleName(/3 Fatos e 0 Papos/)
    expect(kim).toHaveTextContent('11 afirmações atribuídas')
    expect(kim).toHaveTextContent('Precisão média estimada de identificação: 79,6%')
    expect(within(kim).getByRole('img')).toHaveAccessibleName(/1 Fato e 3 Papos/)
    expect(screen.getByText(/20 afirmações fora dos gráficos/)).toBeInTheDocument()
  })
})
