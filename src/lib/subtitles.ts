export interface Cue {
  id: number
  start: number
  end: number
  text: string
}

export function timestamp(seconds: number) {
  const ms = Math.round(seconds * 1000)
  return `${String(Math.floor(ms / 3600000)).padStart(2, '0')}:${String(Math.floor(ms / 60000) % 60).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`
}

function seconds(value: string) {
  const match = value.match(/^(?:(\d{2,}):)?([0-5]\d):([0-5]\d)[,.](\d{3})$/)
  if (!match) throw new Error('Timestamp SRT/VTT inválido.')
  return Number(match[1] ?? 0) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(match[4]) / 1000
}

export function parseTranscript(source: string): Cue[] {
  if (!source.trim() || source.length > 600_000) throw new Error('Legenda vazia ou maior que 600 mil caracteres.')
  const blocks = source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim().split(/\n\s*\n/)
  const cues: Cue[] = []
  for (const block of blocks) {
    if (/^(WEBVTT(?:\s|$)|NOTE(?:\s|$)|STYLE(?:\s|$)|REGION(?:\s|$))/.test(block)) continue
    const lines = block.split('\n')
    const timingIndex = lines[0].includes('-->') ? 0 : 1
    const match = lines[timingIndex]?.match(/^(\S+)\s+-->\s+(\S+)(?:\s+.*)?$/)
    if (!match) throw new Error('Bloco sem intervalo SRT/VTT válido.')
    const start = seconds(match[1])
    const end = seconds(match[2])
    const text = lines.slice(timingIndex + 1).join(' ')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<\/?(?:b|i|u|c|v|lang|ruby|rt)(?:[. \t][^>]*)?>/gi, '')
      .replace(/<\d{2}:\d{2}(?::\d{2})?\.\d{3}>/g, '')
      .replace(/\s+/g, ' ').trim()
    if (!text || end <= start || end > 4 * 3600 || (cues.length && start < cues.at(-1)!.start)) {
      throw new Error('Legenda com texto vazio, intervalo inválido ou blocos fora de ordem.')
    }
    cues.push({ id: cues.length + 1, start, end, text })
  }
  if (!cues.length || cues.length > 20_000) throw new Error('Quantidade de blocos de legenda inválida.')
  return cues
}

export function transcriptWindows(cues: Cue[], maxChars = 8000) {
  const windows: Cue[][] = []
  let current: Cue[] = []
  let size = 0
  for (const cue of cues) {
    if (cue.text.length > maxChars) throw new Error('Bloco de legenda excede o tamanho de uma janela.')
    if (size + cue.text.length + 40 > maxChars && current.length) {
      windows.push(current)
      current = current.slice(-2)
      size = current.reduce((total, item) => total + item.text.length + 40, 0)
    }
    current.push(cue)
    size += cue.text.length + 40
  }
  if (current.length) windows.push(current)
  return windows
}
