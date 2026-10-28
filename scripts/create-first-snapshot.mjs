import { readFile, readdir, writeFile } from 'node:fs/promises'
import { reviewedClaims } from '../mvp/q4T7plSBdJE.review.mjs'
import { reportSchema } from '../src/lib/report-schema.ts'
import { discoverParticipants, detectSpeakerAnchors, attributeSpeaker } from '../src/lib/speakers.ts'

const videoId = 'q4T7plSBdJE'
const videoTitle = 'DEBATE: KIM KATAGUIRI X JONES MANOEL — Inteligência Ltda. #1327'
const files = (await readdir('mvp')).filter((file) => file.endsWith('.srt'))
if (files.length !== 1) throw new Error('É necessário identificar explicitamente um único SRT do debate em mvp/')
const blocks = (await readFile(`mvp/${files[0]}`, 'utf8')).trim().split(/\r?\n\r?\n/)
const cues = blocks.map((block) => {
  const [id, timing, ...text] = block.split(/\r?\n/)
  const [start, end] = timing.split(' --> ')
  const toSeconds = (value) => { const [hours, minutes, seconds] = value.replace(',', '.').split(':').map(Number); return hours * 3600 + minutes * 60 + seconds }
  return { id: Number(id), timestampSeconds: Math.floor(toSeconds(start)), startSeconds: toSeconds(start), endSeconds: toSeconds(end), text: text.join(' ') }
})

const { hints } = JSON.parse(await readFile(`mvp/${videoId}.speakers.json`, 'utf8'))
const participants = discoverParticipants(videoTitle, cues, hints)
const anchors = detectSpeakerAnchors(cues, participants)

const claims = reviewedClaims.map((claim, index) => {
  const selected = cues.filter((cue) => cue.id >= claim.cueStart && cue.id <= claim.cueEnd)
  if (selected.length !== claim.cueEnd - claim.cueStart + 1) throw new Error(`Trecho ausente: ${claim.title}`)
  return { id: `afirmacao-${String(index + 1).padStart(2, '0')}`, ...claim, quote: selected.map((cue) => cue.text).join(' '), timestampSeconds: selected[0].timestampSeconds,
    speakerAttribution: attributeSpeaker(claim.cueStart, claim.cueEnd, cues, anchors, participants),
  }
}).sort((first, second) => first.timestampSeconds - second.timestampSeconds)

const report = reportSchema.parse({
  schemaVersion: 1,
  video: {
    id: videoId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    title: videoTitle,
    channel: 'Inteligência Ltda',
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  },
  analyzedAt: '2026-10-28T00:00:00.000Z',
  status: 'completed',
  coverage: {
    kind: 'selected-claims',
    description: 'Primeira revisão de afirmações selecionadas ao longo do debate de 01/10/2024. A transcrição fornecida foi preservada integralmente; a checagem ainda não é exaustiva. Trechos de encerramento, opiniões e repetições não receberam classificações próprias. As conclusões têm apoio automatizado e não foram revisadas por uma equipe independente.',
    transcriptPath: `transcripts/${videoId}.md`,
    firstTimestamp: cues[0].timestampSeconds,
    lastTimestamp: cues.at(-1).timestampSeconds,
    cueCount: cues.length,
  },
  summary: 'Afirmações sobre contas públicas, saúde, agrotóxicos, trabalho e políticas urbanas. Há dados sustentados por fontes, comparações que omitem o recorte e alegações que permanecem inconclusivas. Cada conclusão se refere ao ponto descrito, não ao participante ou à sua posição política.',
  claims,
  participants,
  limitations: [
    'Cobertura parcial: este snapshot não certifica todas as afirmações do debate nem representa uma nota geral para qualquer participante.',
    'Origem textual: SRT de legendas automáticas fornecido pelo responsável pelo projeto. Não houve conferência integral do áudio. Erros de transcrição podem afetar números, nomes e sentido.',
    'Locutores são sugeridos por apresentações e passagens de palavra encontradas na legenda. O título sugere nomes, não autoria. Não há reconhecimento acústico: os percentuais são índices heurísticos textuais, não probabilidades calibradas, e precisam de revisão.',
    'A referência temporal das falas é outubro de 2024. Documentos posteriores são usados apenas quando descrevem dados históricos, não para aplicar regras novas retroativamente.',
    'Uma fonte oficial não é garantia de inferência correta. Divulgações de resultados de um governo sobre os próprios programas são tratadas como informações institucionais.',
    'Sem acesso aos documentos ou à série pertinente, o item permanece inconclusivo. Ausência de evidência nesta revisão não é evidência de falsidade.',
  ],
})

const timestamp = (seconds) => [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map((value) => String(value).padStart(2, '0')).join(':')
const markdown = [
  `<!-- fato-ou-papo:json\n${JSON.stringify(report, null, 2)}\n-->`,
  '', '# Kim Kataguiri × Jones Manoel — primeira checagem', '',
  `Vídeo: ${report.video.url}`, '',
  `Data da checagem: ${report.analyzedAt.slice(0, 10)}. Debate: 01/10/2024.`, '',
  '## Cobertura', '', report.coverage.description, '',
  `Transcrição integral: [${videoId}.md](../transcripts/${videoId}.md).`, '',
  `${claims.length} afirmações analisadas; ${claims.filter((claim) => claim.verdict === 'Inconclusivo').length} inconclusivas.`, '',
  ...claims.flatMap((claim) => [
    `## ${timestamp(claim.timestampSeconds)} — ${claim.title}`, '',
    `**${claim.verdict}** · ${claim.topic}`, '',
    ...(claim.speakerAttribution ? [`Locutor sugerido: ${claim.speakerAttribution.name} (${claim.speakerAttribution.score}% de índice textual, não calibrado). Requer revisão.`, ''] : ['Locutor não identificado com pistas textuais suficientes.', '']),
    `> ${claim.quote}`, '',
    claim.explanation, '',
    ...claim.evidence.map((item) => `- [${item.title}](${item.url}) — ${item.publisher}${item.publishedAt ? `, ${item.publishedAt}` : ''} (${item.position}).`), '',
    ...(claim.limitations ? [`Ressalva: ${claim.limitations}`, ''] : []),
    `Blocos ${claim.cueStart}–${claim.cueEnd}. [Abrir trecho](${report.video.url}&t=${claim.timestampSeconds}s).`, '',
  ]),
  '## Limitações', '', ...report.limitations.map((item) => `- ${item}`), '',
].join('\n')
await writeFile(`snapshots/${videoId}.md`, markdown)
console.log(`Snapshot ${videoId}: ${claims.length} afirmações, sem chamadas a IA.`)
console.log(`${anchors.length} passagens/apresentações; ${claims.filter((claim) => claim.speakerAttribution).length} sugestões de locutor, todas revisáveis.`)
