> Documentação técnica para quem mantém o projeto. Para conhecer e usar a plataforma, consulte o [README principal](../README.md).

# Desenvolvimento e operação

Plataforma de checagem de afirmações em vídeos do YouTube. React, TypeScript, Vite e Tailwind CSS 4. A interface valida o link e consulta o acervo pelo ID do vídeo, sem nova chamada à IA quando existe um snapshot.

A parte inferior da página inicial mostra todos os debates publicados, consultados no índice do acervo e ordenados por data de análise. O carrossel de destaque mantém os seis mais recentes. A opção “Pesquisar no acervo” leva à galeria, cuja busca filtra títulos e canais sem distinguir maiúsculas ou acentos; palavras podem ser combinadas em qualquer ordem. Cada cartão abre o relatório e informa sua cobertura, sem consumir créditos ou fazer chamadas à IA.

Plataforma publicada: https://mreaggle.github.io/fatooupapo/

Tipografia: AnthropicSerif variável em títulos, citações e destaques, com versões Roman e Italic hospedadas localmente. Pesos, contextos e origem dos arquivos em [tipografia](TYPOGRAPHY.md).

## Primeiro debate e cobertura histórica

Vídeo: https://www.youtube.com/watch?v=q4T7plSBdJE

O primeiro relatório inclui **48 afirmações selecionadas**, com classificação, fontes, contexto e timestamps, e **a transcrição completa fornecida** (5.224 blocos). Esse relatório é uma primeira revisão parcial; não certifica todas as falas do debate. As legendas são automáticas, sem diarização, e não houve revisão integral do áudio.

Locutores são sugeridos por regras determinísticas de autoapresentação e passagem de palavra. O percentual mostrado é um índice textual não calibrado, explicado por hover, foco ou toque. A revisão de nomes é local e reversível. Não há sequência fixa de Vilela, Jones e Kim nem reconhecimento acústico. Veja [docs/SPEAKERS.md](SPEAKERS.md).

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

O caminho da v1 usa **Pages + Issues + Actions**, sem servidor próprio ou Cloudflare. Vídeos fora do acervo recebem um formulário de pedido no GitHub, estimativa de créditos e acompanhamento de lotes. O processamento percorre a transcrição inteira de vídeos de até 4h e checa até 8 afirmações por execução, retomando o progresso até concluir o inventário. Somente relatórios revisados entram no acervo. A validação de elegibilidade roda no Actions antes do débito. Conteúdo recusado recebe apenas a mensagem “Este vídeo não requer fact-checking.” no site.

Cada conta recebe **100 créditos por 24h**, com débito único por pedido aceito para processamento. O MVP calibra o custo; vídeos a partir de 3h consomem a cota inteira. Créditos do produto são distintos de tokens reais do modelo. Configuração dos secrets do Gemini, fontes, limites e publicação: [docs/ANALYSIS_PIPELINE.md](ANALYSIS_PIPELINE.md).

A interface usa “Fato” e “Papo”, incluindo as classificações intermediárias; os valores de esquema `Verdadeiro` e `Falso` permanecem compatíveis com o acervo existente.

Deixe `VITE_ANALYSIS_API_URL` vazia para a v1. A integração opcional com backend HTTPS continua disponível para outro modo de operação. Essa variável é pública; credenciais devem permanecer no servidor ou nos secrets do Actions.

O contrato esperado está em [docs/API.md](API.md). O formato do acervo está em [snapshots/README.md](../snapshots/README.md).

## Vídeo e checagens sincronizadas

O topo do relatório incorpora o vídeo com a [YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference), sem chave de API ou reprodução automática. O componente `SyncedVideo` consulta `getCurrentTime()` a cada 250 ms e seleciona o último `timestampSeconds` alcançado. A checagem fica em destaque até a próxima; antes da primeira, a interface informa quando ela aparecerá. Ao adiantar, pausar ou voltar o vídeo, a seleção acompanha a posição real do player, incluindo timestamps fracionários. Afirmações com o mesmo timestamp aparecem juntas.

Os controles de trecho usam `seekTo()`. O link para a checagem completa limpa filtros e busca, posiciona o artigo abaixo do cabeçalho fixo e transfere o foco para ele. O relatório completo, as fontes e os gráficos continuam abaixo do vídeo, sem depender da disponibilidade do YouTube. Falhas de carregamento ou incorporação mostram nova tentativa e acesso ao vídeo original. Ao sair do relatório, o player é destruído e a consulta periódica é encerrada.

A logo permanece no canto superior esquerdo durante a leitura e retorna à página inicial no topo. O botão no canto inferior direito volta ao início do relatório, respeitando a preferência por movimento reduzido. Os testes de navegador cobrem os dois controles e a sincronização em desktop e celular com uma simulação da API; eles não verificam a disponibilidade dos vídeos no YouTube.

## Atualização do acervo

Cada afirmação oferece “Compartilhar card”. O PNG é desenhado localmente em Canvas, com o título do argumento, a conclusão integral, a classificação e a marca no centro inferior do gauge. A transcrição literal não é incluída. A altura acompanha o texto, preservando conclusões longas. O card inclui o título do vídeo, o tempo do trecho e o endereço do relatório para consultar as fontes. O gauge usa as categorias existentes, sem gerar porcentagens; Inconclusivo fica sem marcador na escala. A prévia permite baixar o arquivo, e navegadores compatíveis com compartilhamento de arquivos também oferecem a ação nativa. URLs temporárias são liberadas ao fechar o diálogo.

O Markdown é a fonte publicada. `npm run snapshots:build` valida o contrato, os IDs e a correspondência literal das citações com a transcrição; depois gera o índice JSON e copia os arquivos Markdown para a distribuição. Erros de esquema ou citações divergentes interrompem o build.

Para reproduzir a primeira transcrição: `node scripts/import-transcript.mjs q4T7plSBdJE 'caminho/arquivo.srt'`. Para regenerar o primeiro relatório a partir das decisões editoriais, execute `npm run snapshot:debate`. Esse comando não pesquisa, não usa IA e não cria novas conclusões. Alterações factuais precisam de nova revisão das fontes.

As revisões são preservadas no histórico Git. Um link `?v=ID` aponta para a versão publicada mais recente daquele vídeo; um commit identifica uma versão imutável do Markdown.

### Inventários com leitura integral

O acervo também inclui Cortez × Pavanato (`C0ucX3GZo-c`, 135 afirmações), Eduarda × Mandi (`l78NZP7riOA`, 92) e Jabbour × Marçal (`nPLJs6xPNWU`, 156). Os SRTs completos estão em `requests/`; decisões e fontes, em `reviews/`; relatórios publicados, em `snapshots/`.

```bash
npm run snapshots:editorial
npm test
npm run lint
npm run build
npm run test:e2e
```

Execute os comandos na raiz do repositório. O primeiro reproduz decisões já revisadas, confere o hash do SRT e gera os três relatórios e transcrições; não consulta a IA nem pesquisa fatos novos. Consulte o [registro das revisões](../reviews/README.md) para datas, exclusões, limitações e integridade dos arquivos.

## Publicação

O workflow `.github/workflows/deploy-pages.yml` testa e publica `dist/` no GitHub Pages a cada push para `main`.

O workflow `analyze-video.yml` inicia ao abrir/reabrir um pedido e verifica a fila a cada seis horas, retomando os lotes automaticamente. O orçamento persistente limita a dois lotes por dia UTC, inclusive tentativas com erro após a reserva. A operação manual `process` continua disponível; `publish-reviewed` exige um responsável e prepara uma análise já revisada para a PR. `check-pr.yml` valida PRs sem credenciais de IA. Nenhuma análise nova é publicada automaticamente.

## Acervos importados e gráficos

Os debates da Band (`RugVB17uRVM`) e Globo (`6BBZWwq2juE`) foram importados do projeto [Quem Mentiu](https://mreaggle.github.io/quemmentiu/), com 74 e 175 afirmações, respectivamente, após alinhar os SRTs e reunir duplicatas. As legendas integrais estão em `requests/` e `transcripts/`. O registro editorial em `imports/quemmentiu/` conserva os intervalos, as exclusões e os agrupamentos; a importação não gera novas apurações independentes. Para reproduzir decisões já conferidas: `node scripts/import-quemmentiu.mjs --reviewed`.

Cada relatório apresenta barras por classificação e um medidor por debatedor. O medidor usa Fatos ÷ (Fatos + Papos), incluindo “majoritariamente” nos grupos; imprecisos e inconclusivos ficam fora do denominador. Uma afirmação conta uma vez. Toda afirmação com locutor detectado, indicado pelas fontes ou revisado localmente entra nos gráficos do respectivo debatedor. A precisão média estimada de identificação é a média aritmética de todos os índices textuais disponíveis para as falas contabilizadas desse locutor, incluindo imprecisas e inconclusivas. A média não pondera as classificações factuais. Fontes/revisões sem índice não recebem um valor artificial; ao trocar uma autoria, o índice original não é transferido à outra pessoa. O recorte parcial e as limitações permanecem visíveis.

O modo gratuito padrão recupera revisões históricas da Wikipédia para subsidiar a revisão, sem chave ou Google Search pago. São fontes secundárias e não substituem documentos primários. Ausência de base mantém o item inconclusivo; nenhuma memória do modelo é usada como fonte. `ANALYSIS_PUBLIC_SOURCES_ENABLED=false` desativa essa consulta quando só se deseja usar documentos previamente revisados.

O Pages continua estático. A confirmação de identidade e envio ainda usa o formulário nativo do GitHub; o site localiza o pedido automaticamente ao retornar. Remover essa última etapa exige um serviço de autenticação/API externo, sem expor credenciais no frontend.
