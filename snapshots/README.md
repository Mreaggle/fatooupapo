# Acervo de snapshots

Cada análise concluída deve ser preservada como um arquivo Markdown nomeado pelo ID do vídeo, por exemplo `dQw4w9WgXcQ.md`. O texto pode ser lido e revisado por pessoas; um bloco JSON invisível torna os mesmos dados consumíveis pela interface.

Formato mínimo:

```md
<!-- fato-ou-papo:json
{
  "schemaVersion": 1,
  "video": {
    "id": "ID_DE_11_CARACTERES",
    "url": "https://www.youtube.com/watch?v=...",
    "title": "Título original",
    "channel": "Canal",
    "thumbnailUrl": "https://..."
  },
  "analyzedAt": "2026-01-01T00:00:00.000Z",
  "status": "completed",
  "claims": [],
  "summary": "Resumo editorial revisado"
}
-->

# Título original

Relatório legível, com afirmações, justificativas e fontes.
```

Execute `npm run snapshots:build` para validar todos os arquivos e gerar `public/snapshots/index.json`. Nunca inclua uma análise não revisada ou fontes inventadas.

O build usa `src/lib/report-schema.ts`, exige correspondência entre o nome do arquivo e `video.id` e confere citações contra os blocos da transcrição indicada em `coverage.transcriptPath`. O campo `coverage.kind: selected-claims` deixa explícito quando a revisão ainda é parcial. Transcrições integrais ficam em `transcripts/`; o build copia os Markdown para download no site.

No primeiro debate, `mvp/q4T7plSBdJE.review.mjs` preserva as decisões editoriais e `npm run snapshot:debate` reproduz o Markdown. Os textos citados vêm diretamente do SRT original. Opiniões não são classificadas. Trechos sem base suficiente recebem `Inconclusivo`, e falantes não são inferidos de uma legenda sem diarização.
