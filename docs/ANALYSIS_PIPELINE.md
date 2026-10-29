# Análises sem servidor próprio

A v1 usa GitHub Pages para consulta, Issues para pedidos, Actions para processamento e branches/PRs para persistência e revisão. Não requer Cloudflare, banco externo, máquina local ligada ou chaves no navegador. O Actions chama a API do Gemini e, opcionalmente, uma ferramenta de busca disponível no modelo/plano escolhido.

## Configuração inicial

1. Em **Settings → Secrets and variables → Actions**, crie o secret `GEMINI_API_KEY`. Não coloque a chave em variável `VITE_*`, issue, arquivo ou conversa.
2. Crie a variável `GEMINI_MODEL` com um modelo disponível na sua conta, compatível com `generateContent` e saída JSON estruturada. Confira a cota no AI Studio; o projeto não escolhe um modelo pago automaticamente.
3. Escolha como fornecer evidências. Por padrão, a consulta pública (`ANALYSIS_PUBLIC_SOURCES_ENABLED=true`) recupera até três revisões históricas da Wikipédia por afirmação, anteriores à data de referência. Ela usa uma API gratuita, sem chave, e fornece fontes secundárias; cabe ao revisor conferir os documentos primários. Você também pode adicionar documentos revisados em `requests/VIDEO_ID.sources.json`. Para pesquisa automática, configure `GEMINI_SEARCH_ENABLED=true` somente se a ferramenta Google Search estiver disponível e for compatível com a cota que deseja usar. Inferência gratuita não garante busca gratuita. Não há ativação automática de cobrança nem troca de provedor.
4. Em **Settings → Actions → General → Workflow permissions**, permita que Actions crie pull requests. O workflow solicita escrita em conteúdo e PRs, leitura de issues e execuções; não precisa aprovar reviews. Se a organização bloquear criação de PRs, a branch e os artefatos preservam o trabalho, e a PR pode ser aberta manualmente.
5. Publique estes workflows na branch padrão para que apareçam na aba Actions. A configuração da v1 deixa `VITE_ANALYSIS_API_URL` vazia.

Para conferir a configuração real sem criar um relatório ou debitar créditos, execute **Actions → Validar integração Gemini → Run workflow**. O teste consulta o catálogo de modelos e faz uma chamada de JSON estruturado. Marque `check_search` para uma segunda chamada de busca, somente quando houver cota disponível. Não registra a chave nem o corpo das respostas. Ative `GEMINI_SEARCH_ENABLED=true` após confirmar que a busca funciona na cota escolhida. Aparecer no catálogo não garante acesso à execução: o Google restringe a família 2.5 a projetos com uso anterior, inclusive quando o catálogo ainda lista esses modelos. Para novos projetos, use um modelo atual, como `gemini-3.8-flash`, e confirme separadamente a disponibilidade de busca na sua cota. Sem busca disponível, forneça documentos revisados no formato descrito abaixo.

Na ativação deste repositório, `gemini-3.8-flash` gerou JSON estruturado corretamente, mas Google Search respondeu HTTP 429. A configuração inicial usa `GEMINI_SEARCH_ENABLED=false`, sem novas tentativas de busca após esse limite. A consulta pública sem chave permite iniciar o processamento sem Google Search. O sucesso da inferência não implica disponibilidade da ferramenta Google Search.

Documentação dos provedores: [saída estruturada](https://ai.google.dev/gemini-api/docs/generate-content/structured-output), [grounding](https://ai.google.dev/gemini-api/docs/generate-content/google-search), [preços e disponibilidade](https://ai.google.dev/gemini-api/docs/pricing), [Actions em repositórios públicos](https://docs.github.com/en/billing/concepts/product-billing/github-actions).

## Limites

| Limite | Política inicial |
|---|---|
| Duração | Até 240 minutos; responsável confirma a duração real |
| Legenda | Até 600 mil caracteres, 20 mil blocos e timestamps até 4h |
| Cobertura | Todas as janelas da transcrição fornecida; sem amostragem |
| Lote de checagem | Até 8 afirmações por execução; sem teto de 8 por vídeo |
| Chamadas de IA | Até 20 por execução, contando busca e classificação |
| Intervalo | Mínimo de 15 segundos entre chamadas; pode ser aumentado |
| Execuções simultâneas | Uma por repositório |
| Orçamento global | Até 2 lotes com reserva persistente por dia UTC; consultas vazias e publicação editorial não usam a reserva |
| Tempo de execução | Até 40 minutos; extração de legenda até 3 minutos |
| Cota do usuário | 100 créditos por identidade numérica do GitHub em janela de 24h |

As variáveis `ANALYSIS_BATCH_SIZE` (1–8), `ANALYSIS_MAX_CALLS` (1–20), `ANALYSIS_INTERVAL_SECONDS` (15–120) e `ANALYSIS_DAILY_RUN_LIMIT` (1–2) permitem reduzir consumo ou aumentar o intervalo, sem superar os tetos. O limite do provedor também se aplica. HTTP 429 interrompe o lote sem repetição automática. Erros de rede não são repetidos na mesma execução; uma retomada futura pode ocorrer após pelo menos seis horas. Respostas bloqueadas ou truncadas exigem intervenção.

O orçamento global é reservado em `analysis-run-budget.json`, na branch `analysis/credits`, antes do débito e das chamadas de IA. Falhas após a reserva consomem a tentativa; re-runs também contam. Consultas vazias e recusas anteriores à reserva não a consomem. Não existe promessa de conclusão no mesmo dia: inventário e checagem de debates longos podem ocupar vários dias. O crédito do usuário autoriza um pedido; não representa disponibilidade de execução imediata nem tokens reais do modelo.

Não use o Actions como servidor HTTP ou processo permanente. Os trabalhos são finitos e preparam o conteúdo deste site. Evite disparar vários workflows enquanto outro está em execução: a fila de concorrência do GitHub pode substituir uma execução pendente. A fila durável continua sendo a lista de issues, e os checkpoints permitem retomar.

## Créditos por conta

A referência está em `src/lib/analysis-credits.ts`, calibrada pelo SRT original do MVP:

- Vídeo `q4T7plSBdJE`: último bloco termina em 03:10:55,840.
- 5.224 blocos; 196.216 caracteres de fala normalizados; 390.242 bytes no arquivo UTF-8.
- 48 afirmações da revisão inicial, usadas apenas como estimativa de esforço, sem limitar o inventário novo.

O custo considera o maior fator entre duração (referência de 3h), caracteres de fala, bytes do arquivo e esforço previsto. O esforço usa uma estimativa determinística de janelas, afirmações e tokens; não chama a IA para precificar e não alega reproduzir a tokenização/cobrança do provedor. O resultado é arredondado para faixas de 10 créditos, de 10 até 100. Com volume de legenda proporcional ao MVP:

| Duração | Créditos estimados |
|---|---:|
| 30 minutos | 20 |
| 1 hora | 40 |
| 2 horas | 70 |
| De 3 a 4 horas | 100 |

Uma legenda mais volumosa pode elevar o custo de um vídeo curto até 100. O navegador mostra uma estimativa; com arquivo fornecido, mede caracteres e bytes localmente. O arquivo não é enviado pelo site. O responsável precisa fornecer a mesma legenda na issue ou no repositório. O débito usa as medidas do arquivo aprovado e a duração declarada, conferida pelo responsável. A API oEmbed fornece título/canal, mas não confirma duração ou completude da legenda; essa conferência continua sendo humana.

O Actions lê o autor real da issue e usa seu ID numérico estável. Digitar outro nome na consulta de saldo não altera quem é debitado; renomear a conta não cria outra cota. A janela começa no primeiro débito e renova integralmente após 24h, sem acúmulo.

O registro fica em `analysis-quota.json`, na branch `analysis/credits`. A reserva é persistida pela API Contents com SHA anterior e antes da inferência. Todas as execuções são serializadas; conflito ou falha de persistência impede chamadas de IA. A mesma issue e o mesmo vídeo/legenda/data reutilizam a reserva, inclusive em dias posteriores. Um segundo pedido para o mesmo vídeo é recusado e encaminhado ao pedido existente. Consultar o acervo é gratuito.

A consulta pública de saldo pode refletir o cache do GitHub; ela é informativa. O débito usa o registro atual da API autenticada, e não o saldo exibido pelo navegador.

Não há débito por clique no site ou por abertura de issue: só quando um pedido aceito pela validação, com legenda e configuração válidas, entra em processamento. Uma interrupção por cota do modelo não cobra novamente na retomada. Reservas são públicas e versionadas; não guardam IPs. Abandono/cancelamento ou mudança do material exige decisão do responsável sobre liberação da reserva, por revisão explícita do registro; não há estorno automático explorável por repetidas chamadas.

Os créditos protegem uso por conta, não impedem criação de múltiplas contas. Validação de elegibilidade, limite global persistente, intervalo e teto por execução protegem o orçamento real. A revisão humana continua obrigatória antes de publicar conclusões.

## Enviar e processar um pedido

1. O visitante consulta o vídeo. Se não houver snapshot, o site mostra estimador de créditos e confirmação com GitHub. O Pages não recebe chaves nem autentica chamadas privilegiadas. Remover a confirmação nativa depende de uma API de autenticação externa.
2. O formulário solicita URL, duração, data, consentimento e legenda opcional. O envio é público. O site localiza o pedido automaticamente pela API pública ao retornar; o código do pedido continua sendo alternativa de acompanhamento.
3. O evento `issues: opened/reopened` inicia o workflow automaticamente. O agendamento a cada seis horas recupera pedidos que ficaram na fila e retoma checkpoints. Só o código da branch padrão executa; texto de issue não vira comandos ou caminhos arbitrários.
4. Metadados são obtidos diretamente do YouTube. A política de admissão fica nos scripts do Actions e não é enviada ao frontend. Uma recusa aparece ao visitante apenas como “Este vídeo não requer fact-checking.” Nenhum filtro garante autenticidade do vídeo; a revisão editorial continua necessária. O código do repositório é público, portanto não se promete sigilo absoluto dos critérios.
5. Com consentimento, o serviço tenta obter a legenda uma vez. A biblioteca `youtube-transcript-api` pode falhar por bloqueio do YouTube ou ausência de legendas; não há contorno por proxies/cookies. Nessa situação, o estado informa interrupção e a equipe precisa fornecer SRT/VTT em `requests/VIDEO_ID.srt` ou no pedido e retomar. A transcrição passa por validação antes de consumir créditos.
6. O workflow reserva o orçamento diário persistente e depois os créditos do autor real do pedido. Um orçamento esgotado preserva o pedido até a próxima janela. São até 20 chamadas de IA por lote e oito checagens, mantendo os demais itens no inventário.
7. Checkpoints e estado ficam em `analysis/issue-N`. Quando há inventário, uma PR draft permite revisão. Nenhuma conclusão é publicada automaticamente. HTTP 429 pausa a retomada por pelo menos 24 horas. Indisponibilidade HTTP 5xx ou timeout da IA preserva o pedido para outra janela, após pelo menos seis horas e dentro do teto diário. Não há repetição na mesma execução. Outros erros de integração pedem intervenção.
8. Ao terminar o inventário e as checagens, um responsável revisa relatório, fontes e omissões. `publish-reviewed`, com confirmação explícita e permissão de escrita, prepara o snapshot na PR. O merge publica no Pages.

Todas as janelas contíguas, com sobreposição de dois blocos, são percorridas antes de começar a checagem. O inventário não escolhe uma amostra de oito afirmações nem fixa uma quantidade por debatedor. Os oito itens limitam apenas o trabalho de uma execução. Janelas, fontes de busca já recuperadas e checagens concluídas são preservadas para a retomada. O inventário automatizado ainda pode omitir ou duplicar afirmações: precisa de revisão, mesmo quando a transcrição inteira foi percorrida.

## Evidências fornecidas pelo responsável

Formato de `requests/VIDEO_ID.sources.json` (até 12 documentos, trechos de até 2 mil caracteres):

```json
[
  {
    "id": "documento-1",
    "title": "Título real do documento revisado",
    "url": "https://instituicao.example/documento",
    "publisher": "Instituição responsável",
    "publishedAt": "2024-01-01",
    "excerpt": "Trecho literal conferido no documento original, relevante para a afirmação."
  }
]
```

O domínio acima ilustra o formato; não é uma fonte real a reutilizar. Confirme documento, URL, data e trecho antes de adicionar. O código não acessa URLs sugeridas na issue. Na busca automática, só aceita URLs HTTPS presentes nos metadados de grounding e associadas a segmentos de resposta. Esses segmentos são sínteses do provedor, não transcrições literais das páginas; o revisor deve abrir os originais. URLs inventadas pela classificação são recusadas. Fontes apenas contextuais não autorizam conclusão direcional.

Com consulta pública habilitada, o inventário pode iniciar sem um arquivo de fontes. Se a consulta pública e Google Search estiverem desativados e não houver documentos revisados, o lote falha antes do débito. A consulta pública recupera no máximo três documentos históricos por item e fixa o domínio da API, sem seguir URLs arbitrárias. Um checkpoint de evidências evita repetir uma pesquisa já salva. Quando uma busca configurada não encontra apoio suficiente para um item, o resultado é `Inconclusivo`. O sistema não usa a memória do modelo como fonte. O retorno bruto, as fontes e os dados de consumo efetivamente informados pelo modelo ficam em `provenance.jsonl`; credenciais e corpos de erro do provedor não são registrados.

## Acompanhar e revisar

O site localiza automaticamente o pedido ao retornar do GitHub e também aceita `?v=VIDEO_ID&pedido=NUMERO`. Também é possível informar o número do pedido no painel de acompanhamento. A barra lê o checkpoint público a cada minuto; o arquivo só muda quando o Actions salva a branch ao final do lote. Inventário ocupa a primeira etapa, checagem a seguinte; 90% significa processamento concluído, aguardando revisão/publicação. A barra não estima duração, nem simula avanço enquanto espera. Depois da publicação, faça nova consulta ao vídeo para abrir o relatório.

Arquivos em `drafts/VIDEO_ID/`:

- `source.txt`, `transcript.md`, `request.json`, `video.json`: dados de origem, hash, data e metadados.
- `state.json`: cursor de todas as janelas, inventário completo/pendente, afirmações checadas e eventual pesquisa aguardando classificação.
- `progress.md`: contagens e fase para acompanhamento humano.
- `status.json`: interrupções, último lote salvo e link para os logs públicos; não contém corpos de erro do provedor.
- `provenance.jsonl`, `credit-receipt.json`: origem das respostas, consumo do modelo quando fornecido e reserva de créditos.
- `report.json`, `review.md`: gerados somente depois de todo o inventário ser processado, para revisão editorial.

Revise áudio, transcrição integral, data, omissões, duplicatas, cada afirmação, conclusões e documentos originais. Não faça ranking de participantes a partir de amostras ou atribuições inseguras. A fila não identifica locutores e não interpreta uma conclusão factual como intenção de mentir.

Se encontrar uma omissão, acrescente a origem ao fim de `state.json.inventory`, sem reordenar o prefixo já checado, mude `phase` para `checking` e remova `report.json`/`review.md` gerados para regenerar após a retomada. Preserve os registros de proveniência. Alterações editoriais maiores, exclusões de duplicatas ou reordenação exigem manter inventário, claims e relatório correspondentes, por revisão explícita. Nunca marque um checkpoint incompleto como concluído para contornar a publicação.

Depois da revisão, edite o resumo e as limitações de `report.json`, removendo textos de instrução de rascunho. Execute o workflow com `publish-reviewed` e a confirmação explícita da revisão. O comando de promoção confere completude, IDs, cobertura, citações e timestamps; prepara `snapshots/` e `transcripts/` na PR. Não sobrescreve snapshots existentes. O responsável confere os checks, marca a PR como pronta e faz merge para publicar pelo workflow do Pages. Não há merge ou publicação automática de uma conclusão gerada por IA.

Para reproduzir comandos em ambiente descartável ou no próprio Actions:

```bash
npm run analysis:prepare
npm run analysis:run
npm run analysis:promote -- VIDEO_ID --reviewed
```

Os dois primeiros usam `.analysis-work/issue.json` e os arquivos preparados; a inferência usa secrets/variáveis do ambiente. A operação completa não depende da execução destes comandos numa máquina local.

## Verificação

`npm test`, `npm run lint`, `npm run build` e `npm run test:e2e` cobrem os fluxos locais. Testes de IA usam respostas controladas, sem rede, cobrança, conclusões reais ou snapshots novos. Uma execução real exige o secret e um modelo/ferramenta disponíveis. Os limites gratuitos dos provedores e a extração em IPs de nuvem precisam ser confirmados na conta antes de disponibilizar o serviço amplamente.
