# Fato ou Papo

Plataforma de checagem de afirmações em vídeos do YouTube. React, TypeScript, Vite e Tailwind CSS 4. A interface valida o link e consulta o acervo pelo ID do vídeo, sem nova chamada à IA quando existe um snapshot.

A parte inferior da página inicial mostra até seis debates checados recentemente, consultados no índice publicado do acervo e ordenados por data de análise. Cada cartão abre o relatório e informa sua cobertura, sem consumir créditos ou fazer chamadas à IA.

MVP publicado: https://mreaggle.github.io/fatooupapo/

Tipografia: AnthropicSerif variável em títulos, citações e destaques, com versões Roman e Italic hospedadas localmente. Pesos, contextos e origem dos arquivos em [docs/TYPOGRAPHY.md](docs/TYPOGRAPHY.md).

## Primeiro debate

Vídeo: https://www.youtube.com/watch?v=q4T7plSBdJE

O acervo inclui **48 afirmações selecionadas**, com classificação, fontes, contexto e timestamps, e **a transcrição completa fornecida** (5.224 blocos). O relatório é uma primeira revisão parcial; não certifica todas as falas do debate. As legendas são automáticas, sem diarização, e não houve revisão integral do áudio.

Locutores são sugeridos por regras determinísticas de autoapresentação e passagem de palavra. O percentual mostrado é um índice textual não calibrado, explicado por hover, foco ou toque. A revisão de nomes é local e reversível. Não há sequência fixa de Vilela, Jones e Kim nem reconhecimento acústico. Veja [docs/SPEAKERS.md](docs/SPEAKERS.md).

- `transcripts/q4T7plSBdJE.md` — transcrição integral, timestamps e SHA-256 do SRT.
- `snapshots/q4T7plSBdJE.md` — relatório legível e dados estruturados consumidos pela aplicação.
- `mvp/*.srt` — arquivo original fornecido, preservado.
- `mvp/q4T7plSBdJE.review.mjs` — decisões editoriais e referências usadas na primeira revisão.

Link compartilhável: https://mreaggle.github.io/fatooupapo/?v=q4T7plSBdJE

## Desenvolvimento

Requer Node.js 22.18 ou superior.

```bash
npm install
npm run dev
```

Comandos principais:

- `npm test` — testa URLs, estados, consulta estática e integridade das citações.
- `npx playwright install --with-deps chromium` — prepara o navegador de teste.
- `npm run test:e2e` — testa a aplicação compilada em desktop e celular (execute o build antes).
- `npm run lint` — verifica TypeScript e React com ESLint.
- `npm run build` — valida snapshots, compila e gera `dist/`.
- `npm run preview` — serve localmente o build de produção.

## Integrações

O caminho da v1 usa **Pages + Issues + Actions**, sem servidor próprio ou Cloudflare. Vídeos fora do acervo recebem um formulário de pedido no GitHub, estimativa de créditos e acompanhamento de lotes. O processamento percorre a transcrição inteira de vídeos de até 4h e checa até 8 afirmações por execução, retomando o progresso até concluir o inventário. Somente relatórios revisados entram no acervo.

Cada conta recebe **100 créditos por 24h**, com débito único por pedido aprovado. O MVP calibra o custo; vídeos a partir de 3h consomem a cota inteira. Créditos do produto são distintos de tokens reais do modelo. Configuração dos secrets do Gemini, fontes, limites e publicação: [docs/ANALYSIS_PIPELINE.md](docs/ANALYSIS_PIPELINE.md).

A interface usa “Fato” e “Papo”, incluindo as classificações intermediárias; os valores de esquema `Verdadeiro` e `Falso` permanecem compatíveis com o acervo existente.

Deixe `VITE_ANALYSIS_API_URL` vazia para a v1. A integração opcional com backend HTTPS continua disponível para outro modo de operação. Essa variável é pública; credenciais devem permanecer no servidor ou nos secrets do Actions.

O contrato esperado está em [docs/API.md](docs/API.md). O formato do acervo está em [snapshots/README.md](snapshots/README.md).

## Atualização do acervo

O Markdown é a fonte publicada. `npm run snapshots:build` valida o contrato, os IDs e a correspondência literal das citações com a transcrição; depois gera o índice JSON e copia os arquivos Markdown para a distribuição. Erros de esquema ou citações divergentes interrompem o build.

Para reproduzir a primeira transcrição: `node scripts/import-transcript.mjs q4T7plSBdJE 'caminho/arquivo.srt'`. Para regenerar o primeiro relatório a partir das decisões editoriais, execute `npm run snapshot:debate`. Esse comando não pesquisa, não usa IA e não cria novas conclusões. Alterações factuais precisam de nova revisão das fontes.

As revisões são preservadas no histórico Git. Um link `?v=ID` aponta para a versão publicada mais recente daquele vídeo; um commit identifica uma versão imutável do Markdown.

## Publicação

O workflow `.github/workflows/deploy-pages.yml` testa e publica `dist/` no GitHub Pages a cada push para `main`.

O workflow `analyze-video.yml` é acionado manualmente por um responsável: `process` aprova/retoma o próximo lote de uma issue; `publish-reviewed` prepara uma análise já revisada para a PR. `check-pr.yml` valida PRs sem credenciais de IA. Nenhuma análise nova é publicada automaticamente.
