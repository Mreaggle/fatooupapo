import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { reportSchema } from '../src/lib/report-schema.ts'
import { parseTranscript, transcriptMarkdown } from './analysis/transcript.ts'
import { verdictLabel } from '../src/lib/verdict-label.ts'

if (!process.argv.includes('--reviewed')) throw new Error('Confira imports/quemmentiu antes de executar com --reviewed. Não há importação automática de novas conclusões.')
const videos = [
  { id: 'RugVB17uRVM', title: 'FLÁVIO BOLSONARO X LULA: DEBATE PRESIDENCIAL DO 2º TURNO | ÍNTEGRA', channel: 'Band Jornalismo' },
  { id: '6BBZWwq2juE', title: 'DEBATE COMPLETO na Globo | LULA e FLÁVIO BOLSONARO | 24 de Outubro, 2026 | SEGUNDO TURNO ao vivo', channel: 'Carlos Batista' },
]
const normalize = (kind) => ({ true: 'Verdadeiro', false: 'Falso', context: 'Impreciso ou fora de contexto', misleading: 'Impreciso ou fora de contexto', unsubstantiated: 'Inconclusivo', unverifiable: 'Inconclusivo' })[kind] ?? 'Inconclusivo'
const secure = (value) => { try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password } catch { return false } }
const permalink = (value) => { const url = new URL(value); return url.pathname !== '/' || url.hash.length > 1 }
await mkdir('transcripts', { recursive: true })
await mkdir('snapshots', { recursive: true })
for (const video of videos) {
  const imported = JSON.parse(await readFile(`imports/quemmentiu/${video.id}.json`, 'utf8'))
  const source = await readFile(`requests/${video.id}.srt`, 'utf8')
  const cues = parseTranscript(source)
  const groups = []
  const used = new Set()
  for (const check of imported.reviewed) {
    if (used.has(check.id)) continue
    const duplicateIds = imported.duplicateGroups.find((ids) => ids.includes(check.id)) ?? [check.id]
    const group = imported.reviewed.filter((item) => duplicateIds.includes(item.id))
    if (new Set(group.map((item) => item.candidate)).size !== 1) throw new Error('Não mescle falas de candidatos diferentes.')
    group.forEach((item) => used.add(item.id))
    groups.push(group)
  }
  const claims = groups.map((group) => {
    const first = group[0]
    const [cueStart, cueEnd] = first.range
    const range = cues.slice(cueStart - 1, cueEnd)
    if (range.length !== cueEnd - cueStart + 1) throw new Error(`Intervalo inválido: ${first.id}`)
    const checks = group.flatMap((item) => item.sources?.length ? item.sources : [{ ...item.source, verdict: item.verdict, summary: item.summary }])
      .filter((item) => secure(item.url))
      .filter((item, index, all) => all.findIndex((other) => other.url === item.url && other.verdict?.kind === item.verdict?.kind) === index)
    const editorial = checks.filter((item) => !item.isAi && permalink(item.url))
    const verdicts = new Set(editorial.map((item) => normalize(item.verdict?.kind)))
    const mismatch = group.some((item) => item.transcriptionMismatch)
    const verdict = !mismatch && verdicts.size === 1 ? [...verdicts][0] : 'Inconclusivo'
    const reason = mismatch ? 'Há divergência relevante entre a citação publicada e a legenda automática. A conclusão depende de conferência do áudio.'
      : verdicts.size > 1 ? 'As fontes editoriais reunidas divergem na classificação. A divergência foi preservada; não foi escolhido um vencedor por maioria.'
        : !editorial.length ? 'Não há neste registro uma checagem editorial com link específico suficiente para uma conclusão própria. Classificações automatizadas ou links genéricos foram preservados como contexto.'
          : `Classificação reaproveitada de ${editorial.map((item) => item.name ?? first.source.name).join(', ')}. Esta importação não representa uma nova apuração independente.`
    const title = first.statement.replace(/\[[^\]]*\]/g, '').replace(/[“”"]/g, '').replace(/\s+/g, ' ').trim()
    const summaries = group.map((item) => item.explanation?.map((part) => part.text).join(' ') || item.summary).filter(Boolean)
    return {
      id: `import-${first.id}`, title: title.length > 150 ? `${title.slice(0, 147)}…` : title,
      topic: first.topic, quote: range.map((cue) => cue.text).join(' '),
      speaker: first.candidate, speakerOrigin: 'fact-check-source', timestampSeconds: Math.floor(range[0].start), cueStart, cueEnd,
      verdict, explanation: `${reason} ${summaries[0] ?? ''}`.trim(),
      evidence: checks.map((item) => ({ title: `Checagem de ${item.name ?? first.source.name}`, url: item.url, publisher: item.name ?? first.source.name, position: 'context' })),
      importedChecks: checks.map((item) => ({ publisher: item.name ?? first.source.name, url: item.url, automated: Boolean(item.isAi), label: verdictLabel(normalize(item.verdict?.kind)) })),
      limitations: [first.alignmentReview, 'Locutor atribuído pela checagem citada, sem reconhecimento acústico. A citação reproduz o SRT fornecido, inclusive possíveis erros.', group.length > 1 ? `${group.length} registros sobre a mesma afirmação foram reunidos em um único item, sem multiplicar fontes nos gráficos.` : '', 'Consulte os veículos para o texto completo e as fontes primárias; resumos de origem não substituem os documentos.'].filter(Boolean).join(' '),
    }
  }).sort((a, b) => a.timestampSeconds - b.timestampSeconds || a.id.localeCompare(b.id))
  const report = reportSchema.parse({
    schemaVersion: 1, video: { ...video, url: `https://www.youtube.com/watch?v=${video.id}`, thumbnailUrl: `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg` },
    analyzedAt: '2026-10-29T00:00:00.000Z', status: 'completed', claims,
    participants: [
      { id: 'flavio-bolsonaro', name: 'Flávio Bolsonaro', aliases: ['Flávio'], role: 'guest', source: 'video-title' },
      { id: 'lula', name: 'Lula', aliases: ['Luiz Inácio Lula da Silva'], role: 'guest', source: 'video-title' },
    ],
    summary: `O debate discute economia, segurança, políticas sociais e serviços públicos. Cada afirmação tem sua conclusão e as fontes citadas, com as divergências e incertezas indicadas.`,
    coverage: { kind: 'selected-claims', description: `A transcrição completa de ${cues.length} blocos foi preservada. Foram alinhados ${imported.reviewed.length} dos ${imported.reviewed.length + imported.unmatched.length} registros do acervo de origem, resultando em ${claims.length} afirmações após reunir duplicatas. ${imported.unmatched.length} registros sem correspondência textual segura ficaram fora do relatório e dos gráficos e foram registrados na revisão editorial. Isso não certifica que todas as afirmações do vídeo tenham sido checadas.`, transcriptPath: `transcripts/${video.id}.md`, firstTimestamp: cues[0].start, lastTimestamp: cues.at(-1).start, cueCount: cues.length },
    limitations: [
      'Os juízos pertencem aos veículos citados; não houve nova apuração independente de todas as fontes primárias.',
      'A transcrição fornecida é automática e foi mantida integralmente, sem revisão integral do áudio. Números, nomes, negações e identificação de voz podem conter erros.',
      'O acervo de origem já agrupa fontes. Não use maioria de veículos como prova factual. Divergências editoriais foram mantidas inconclusivas.',
      'Uma checagem automatizada isolada e uma página inicial sem permalink não sustentam conclusão própria; aparecem como contexto com classificação inconclusiva.',
      'As contagens se referem às afirmações importadas e com autoria indicada pela fonte. Não representam a proporção de todas as falas do debate nem intenção de mentir.',
      `Evento no acervo de origem: ${imported.event.date}. O título do vídeo pode indicar a data de retransmissão em outro fuso.`,
    ],
  })
  await writeFile(`transcripts/${video.id}.md`, transcriptMarkdown(video.id, source, cues, 'SRT integral fornecido pelo responsável pelo projeto (DownSub; legenda automática)'))
  await writeFile(`snapshots/${video.id}.md`, [
    `<!-- fato-ou-papo:json\n${JSON.stringify(report, null, 2)}\n-->`, '', `# ${video.title}`, '',
    report.summary, '', '## Origem e revisão', '',
        `Transcrição integral: [${video.id}.md](../transcripts/${video.id}.md).`, '',
    report.coverage.description, '',
    ...claims.flatMap((claim) => [`## ${claim.id} · ${verdictLabel(claim.verdict)} · blocos ${claim.cueStart}–${claim.cueEnd}`, '', `Locutor conforme fonte: ${claim.speaker}.`, '', `> ${claim.quote}`, '', claim.explanation, '', ...claim.evidence.map((item) => `- [${item.publisher}](${item.url})`), '', claim.limitations, '']),
    '## Limitações', '', ...report.limitations.map((item) => `- ${item}`), '',
  ].join('\n'))
  console.log(`${video.id}: ${claims.length} afirmações; ${cues.length} blocos integrais; ${imported.unmatched.length} registros não alinhados.`)
}
