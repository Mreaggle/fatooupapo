import { createHash } from 'node:crypto'
import { timestamp, type Cue } from '../../src/lib/subtitles.ts'
export { parseTranscript, transcriptWindows } from '../../src/lib/subtitles.ts'
export type { Cue } from '../../src/lib/subtitles.ts'

export function transcriptMarkdown(videoId: string, source: string, cues: Cue[], origin: string) {
  return [
    `# Transcrição — ${videoId}`, '',
    `- Vídeo: https://www.youtube.com/watch?v=${videoId}`,
    `- Origem: ${origin}`,
    '- Texto de legenda, sem revisão integral do áudio e sem diarização.',
    '- Blocos renumerados sequencialmente; marcações de formatação removidas.',
    `- SHA-256 do arquivo: \`${createHash('sha256').update(source).digest('hex')}\``,
    `- Blocos: ${cues.length}. Primeiro: ${timestamp(cues[0].start)}. Último: ${timestamp(cues.at(-1)!.start)}.`, '',
    ...cues.flatMap((cue) => [`### ${timestamp(cue.start)} · bloco ${cue.id}`, '', cue.text, '']),
  ].join('\n')
}
