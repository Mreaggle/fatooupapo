import type { AnalysisReport } from '../types'
import { chartVerdicts, debateStats } from '../lib/debate-stats'

export function DebateCharts({ report, speakers }: { report: AnalysisReport; speakers: Record<string, string | null | undefined> }) {
  const stats = debateStats(report, speakers)
  if (!stats.speakers.length) return null
  return <section aria-labelledby="debate-charts-title" className="mb-8 rounded-xl border border-line p-4 sm:p-6">
    <h2 id="debate-charts-title" className="font-serif text-xl">Classificações por debatedor</h2>
    <p className="mt-2 text-xs leading-6 text-muted">{report.coverage?.kind === 'selected-claims' ? 'Cobertura parcial. ' : ''}Contagem das afirmações deste relatório com locutor detectado automaticamente, indicado pelas fontes ou revisado por você. Não é uma nota do debate inteiro nem mede intenção de mentir.</p>
    <div className="mt-6 grid gap-7 sm:grid-cols-2">
      {stats.speakers.map((speaker) => {
        const angle = speaker.factPercent === null ? 0 : 180 - speaker.factPercent * 1.8
        const x = 100 + 65 * Math.cos(angle * Math.PI / 180)
        const y = 90 - 65 * Math.sin(angle * Math.PI / 180)
        const factsLabel = `${speaker.facts} ${speaker.facts === 1 ? 'Fato' : 'Fatos'}`
        const talkLabel = `${speaker.talk} ${speaker.talk === 1 ? 'Papo' : 'Papos'}`
        return <div key={speaker.name} role="group" aria-label={`Resumo de ${speaker.name}`} className="min-w-0">
          <h3 className="text-sm font-medium">{speaker.name}</h3>
          <p className="mt-2 text-[11px] leading-5 text-muted">{speaker.attributionScoreAverage === null ? 'Identificação do locutor sem índice numérico.' : <>Precisão média estimada de identificação: <span className="font-medium text-foreground">{new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(speaker.attributionScoreAverage)}%</span><br />Média de {speaker.scoredAttributions} de {speaker.total} afirmações atribuídas.</>}</p>
          <figure className="mt-4" aria-label={`Medidor de ${speaker.name}`}>
            <svg viewBox="0 0 200 115" role="img" aria-label={speaker.factPercent === null ? `${speaker.name}: sem Fatos ou Papos com autoria atribuída` : `${speaker.name}: ${factsLabel} e ${talkLabel}; ${speaker.factPercent}% de Fatos entre essas classificações`} className="mx-auto w-full max-w-56">
              <path d="M 20 90 A 80 80 0 0 1 180 90" fill="none" stroke="#94a3b8" strokeWidth="14" opacity={speaker.factPercent === null ? 0.25 : 0.12} />
              {speaker.factPercent !== null && <>
                <path d="M 20 90 A 80 80 0 0 1 100 10" fill="none" stroke="#f87171" strokeWidth="14" />
                <path d="M 100 10 A 80 80 0 0 1 180 90" fill="none" stroke="#34d399" strokeWidth="14" />
                <line x1="100" y1="90" x2={x} y2={y} stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                <circle cx="100" cy="90" r="5" fill="currentColor" />
              </>}
              <text x="18" y="112" fill="#f87171" fontSize="11">Papo</text><text x="180" y="112" fill="#34d399" fontSize="11" textAnchor="end">Fato</text>
            </svg>
            <figcaption className="mt-1 text-center text-xs leading-5 text-muted">{speaker.factPercent === null ? 'Sem base para o medidor' : <>{speaker.factPercent}% de Fatos entre Fato/Papo<br />{factsLabel} · {talkLabel}</>}</figcaption>
          </figure>
          <ul className="mt-5 space-y-3" aria-label={`Distribuição de ${speaker.name}`}>
            {chartVerdicts.map(({ verdict, label, color }) => <li key={verdict}>
              <div className="flex justify-between gap-2 text-[11px]"><span>{label}</span><span>{speaker.counts[verdict]}</span></div>
              <div aria-hidden="true" className="mt-1 h-2 overflow-hidden rounded bg-white/5"><div className="h-full rounded" style={{ width: `${speaker.total ? speaker.counts[verdict] / speaker.total * 100 : 0}%`, backgroundColor: color }} /></div>
            </li>)}
          </ul>
          <p className="mt-3 text-[11px] text-faint">{speaker.total} afirmações atribuídas</p>
        </div>
      })}
    </div>
    <p className="mt-5 text-[11px] leading-5 text-muted">O medidor calcula Fatos ÷ (Fatos + Papos), incluindo “majoritariamente” nos respectivos grupos. Imprecisas e inconclusivas aparecem nas barras e ficam fora do medidor. Cada afirmação conta uma vez; fontes adicionais não somam votos.</p>
    <p className="mt-2 text-[11px] leading-5 text-muted">A precisão média de identificação é a média aritmética dos índices textuais de autoria das falas contabilizadas. É uma estimativa não calibrada, independente da veracidade das afirmações. Atribuições sem índice numérico ficam fora dessa média. Ao trocar o locutor, o índice da detecção original não é transferido para a outra pessoa.</p>
    {stats.unattributed > 0 && <p className="mt-2 text-[11px] leading-5 text-muted">{stats.unattributed} afirmações fora dos gráficos por não terem atribuição a um debatedor. As detecções automáticas são contabilizadas e podem ser corrigidas em “Revisar locutor”.</p>}
  </section>
}
