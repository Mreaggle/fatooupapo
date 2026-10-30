import type { AnalysisReport, Claim, Verdict } from '../types'
import { formatTimestamp } from './youtube'
import { verdictLabel } from './verdict-label'

const gauge: Array<{ verdict: Verdict; color: string }> = [
  { verdict: 'Falso', color: '#edb4b4' },
  { verdict: 'Majoritariamente falso', color: '#e7b09d' },
  { verdict: 'Impreciso ou fora de contexto', color: '#e7d39d' },
  { verdict: 'Majoritariamente verdadeiro', color: '#b8d8bb' },
  { verdict: 'Verdadeiro', color: '#b4dfbb' },
]

// Wrap measured text, including long URLs, so the exported card never crops it.
function wrapText(context: CanvasRenderingContext2D, text: string, width: number): string[] {
  return text.split('\n').flatMap((paragraph) => {
    const lines: string[] = []
    let line = ''
    for (const word of paragraph.trim().split(/\s+/)) {
      const next = line ? `${line} ${word}` : word
      if (context.measureText(next).width <= width) { line = next; continue }
      if (line) { lines.push(line); line = '' }
      for (const letter of word) {
        if (line && context.measureText(line + letter).width > width) { lines.push(line); line = '' }
        line += letter
      }
    }
    lines.push(line)
    return lines
  })
}

export async function createClaimCard(claim: Claim, video: AnalysisReport['video'], reportUrl: string): Promise<File> {
  await document.fonts.load('600 56px "AnthropicSerif"')
  await document.fonts.ready
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Não foi possível criar a imagem neste navegador.')

  const width = 1080
  const padding = 80
  const contentWidth = width - padding * 2
  context.font = '600 56px "AnthropicSerif", Georgia, serif'
  const title = wrapText(context, claim.title || claim.topic || 'Afirmação checada', contentWidth)
  context.font = '32px Arial, sans-serif'
  const conclusion = wrapText(context, claim.explanation, contentWidth)
  context.font = '24px Arial, sans-serif'
  const source = wrapText(context, video.title, contentWidth)
  const address = wrapText(context, reportUrl.replace(/^https?:\/\//, ''), contentWidth)
  const gaugeTop = 146 + title.length * 68 + 48
  const gaugeBase = gaugeTop + 232
  const conclusionTop = gaugeBase + 130
  const footerTop = conclusionTop + 56 + conclusion.length * 48 + 60
  canvas.width = width
  canvas.height = footerTop + source.length * 34 + address.length * 34 + 188

  context.fillStyle = '#111111'
  context.fillRect(0, 0, width, canvas.height)
  context.fillStyle = '#181919'
  context.fillRect(32, 32, width - 64, canvas.height - 64)
  const color = gauge.find((item) => item.verdict === claim.verdict)?.color ?? '#bdc7d4'
  context.fillStyle = color
  context.fillRect(padding, 80, 64, 5)
  context.font = '600 23px Arial, sans-serif'
  context.fillStyle = '#a5a5a0'
  context.fillText('ARGUMENTO EM DESTAQUE', padding, 126)
  context.font = '600 56px "AnthropicSerif", Georgia, serif'
  context.fillStyle = '#f4f3ee'
  title.forEach((line, index) => context.fillText(line, padding, 194 + index * 68))

  for (const [index, item] of gauge.entries()) {
    const start = Math.PI + index * Math.PI / gauge.length + 0.025
    const end = Math.PI + (index + 1) * Math.PI / gauge.length - 0.025
    context.beginPath()
    context.arc(width / 2, gaugeBase, 230, start, end)
    context.lineWidth = 30
    context.strokeStyle = claim.verdict === 'Inconclusivo' ? '#bdc7d4' : item.color
    context.globalAlpha = item.verdict === claim.verdict ? 1 : 0.22
    context.stroke()
    if (item.verdict === claim.verdict) {
      const angle = (start + end) / 2
      context.beginPath()
      context.arc(width / 2 + Math.cos(angle) * 230, gaugeBase + Math.sin(angle) * 230, 12, 0, Math.PI * 2)
      context.fillStyle = '#f4f3ee'
      context.fill()
    }
  }
  context.globalAlpha = 1
  context.textAlign = 'center'
  context.font = '600 34px Arial, sans-serif'
  context.fillStyle = color
  const classification = wrapText(context, verdictLabel(claim.verdict), 300)
  classification.forEach((line, index) => context.fillText(line, width / 2, gaugeBase - 112 + index * 43))
  context.font = '600 32px "AnthropicSerif", Georgia, serif'
  context.fillStyle = '#f4f3ee'
  context.fillText('Fato ou Papo', width / 2, gaugeBase - 10)
  const brandWidth = context.measureText('Fato ou Papo').width
  context.fillStyle = '#93b4e8'
  context.fillText('.', width / 2 + brandWidth / 2 + 5, gaugeBase - 10)
  context.font = '23px Arial, sans-serif'
  context.fillStyle = '#edb4b4'
  context.fillText('Papo', width / 2 - 230, gaugeBase + 48)
  context.fillStyle = '#b4dfbb'
  context.fillText('Fato', width / 2 + 230, gaugeBase + 48)
  if (claim.verdict === 'Inconclusivo') {
    context.fillStyle = '#bdc7d4'
    context.fillText('Evidência insuficiente', width / 2, gaugeBase + 48)
  }

  context.textAlign = 'left'
  context.fillStyle = '#303130'
  context.fillRect(padding, conclusionTop - 38, contentWidth, 1)
  context.font = '600 23px Arial, sans-serif'
  context.fillStyle = '#a5a5a0'
  context.fillText('CONCLUSÃO', padding, conclusionTop)
  context.font = '32px Arial, sans-serif'
  context.fillStyle = '#f4f3ee'
  conclusion.forEach((line, index) => context.fillText(line, padding, conclusionTop + 56 + index * 48))
  context.fillStyle = '#303130'
  context.fillRect(padding, footerTop - 32, contentWidth, 1)
  context.font = '24px Arial, sans-serif'
  context.fillStyle = '#a5a5a0'
  source.forEach((line, index) => context.fillText(line, padding, footerTop + index * 34))
  const referenceTop = footerTop + source.length * 34 + 22
  context.fillText(`Trecho em ${formatTimestamp(claim.timestampSeconds)} · Leia a checagem e as fontes:`, padding, referenceTop)
  context.fillStyle = '#93b4e8'
  address.forEach((line, index) => context.fillText(line, padding, referenceTop + 42 + index * 34))
  context.font = '21px Arial, sans-serif'
  context.fillStyle = '#858580'
  context.fillText('Análise assistida por IA. Consulte o contexto e as fontes.', padding, canvas.height - 70)

  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => {
    if (result) resolve(result)
    else reject(new Error('Não foi possível gerar o PNG. Tente novamente.'))
  }, 'image/png'))
  return new File([blob], `fato-ou-papo-${video.id}-${claim.id}.png`, { type: 'image/png' })
}
