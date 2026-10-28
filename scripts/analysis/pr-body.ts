import { readFile, writeFile } from 'node:fs/promises'

const videoId = process.env.VIDEO_ID
const issueNumber = process.env.ISSUE_NUMBER
if (!/^[\w-]{11}$/.test(videoId ?? '') || !/^[1-9]\d*$/.test(issueNumber ?? '')) throw new Error('Identificação inválida.')
const progress = await readFile(`drafts/${videoId}/progress.md`, 'utf8')
await writeFile('.analysis-work/pr-body.md', [
  `Processamento do vídeo https://www.youtube.com/watch?v=${videoId}, relacionado à issue #${issueNumber}.`, '',
  `Acompanhar no site: https://mreaggle.github.io/fatooupapo/?v=${videoId}&pedido=${issueNumber}`, '',
  progress, '',
  'A transcrição inteira alimenta um inventário de afirmações. Cada execução retoma o checkpoint e checa até 8 itens, respeitando o orçamento de chamadas. Nenhum rascunho é publicado automaticamente.', '',
  'Revise source.txt, transcript.md, state.json (inclusive omissões e duplicatas), provenance.jsonl e report.json. As fontes de busca exigem leitura dos documentos originais. Não atribua falas sem identificação segura nem use contagens parciais para comparar debatedores.', '',
  'Quando o inventário estiver completo e todas as afirmações processadas, edite o resumo editorial em report.json e revise as limitações. Execute o workflow com publish-reviewed e a confirmação de revisão para preparar snapshots/ e transcripts/ nesta PR. Depois confira os checks e faça o merge para publicar no Pages.', '',
  'Configuração, limites e operação: docs/ANALYSIS_PIPELINE.md.', '',
].join('\n'))
