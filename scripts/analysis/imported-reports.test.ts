// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { reportSchema } from '../../src/lib/report-schema.ts'

const load = (id: string) => reportSchema.parse(JSON.parse(readFileSync(`snapshots/${id}.md`, 'utf8').match(/fato-ou-papo:json\n([\s\S]*?)\n-->/)![1]))

describe('integridade editorial das importações', () => {
  it('atribui as checagens aos veículos citados, sem prefixo ou menção ao agregador nos relatórios', () => {
    for (const id of ['RugVB17uRVM', '6BBZWwq2juE']) {
      const report = load(id)
      expect(JSON.stringify(report)).not.toMatch(/quem\s*mentiu|quemmentiu/i)
      expect(report.claims.some((claim) => claim.evidence.some((source) => source.publisher === 'Lupa'))).toBe(true)
    }
  })
  it.each([['RugVB17uRVM', 74, 3172], ['6BBZWwq2juE', 175, 3285]] as const)('preserva %s integral e declara o recorte sem inventar checagem exaustiva', (id, count, cueCount) => {
    const report = load(id)
    expect(report.claims).toHaveLength(count)
    expect(report.coverage).toMatchObject({ kind: 'selected-claims', cueCount })
    expect(readFileSync(`transcripts/${id}.md`, 'utf8')).toContain(`bloco ${cueCount}`)
    expect(new Set(report.claims.map((claim) => claim.id)).size).toBe(count)
    const imported = JSON.parse(readFileSync(`imports/quemmentiu/${id}.json`, 'utf8'))
    for (const group of imported.duplicateGroups as string[][]) expect(report.claims.filter((claim) => group.includes(claim.id.replace('import-', '')))).toHaveLength(1)
  })
  it('não converte automaticamente em Fato/Papo uma checagem exclusivamente de IA', () => {
    const report = load('6BBZWwq2juE')
    const automated = report.claims.filter((claim) => claim.importedChecks?.length && claim.importedChecks.every((check) => check.automated))
    expect(automated.length).toBeGreaterThan(20)
    expect(automated.every((claim) => claim.verdict === 'Inconclusivo')).toBe(true)
  })
  it('preserva inconclusivos os trechos com números corrompidos na legenda', () => {
    const report = load('RugVB17uRVM')
    expect(report.claims.find((claim) => claim.id === 'import-e312cecc3a10900b1f41')?.verdict).toBe('Inconclusivo')
    const globo = load('6BBZWwq2juE')
    expect(globo.claims.find((claim) => claim.id === 'import-50bd2e50edbd8713e363')?.verdict).toBe('Inconclusivo')
  })
})
