# Ponto de retomada — dez checagens

Atualizado em 2026-10-30T15:17:53.320433+00:00. **Lote publicado e verificado em produção. Nenhuma implementação pendente.**

## Estado atual

- Dez SRTs lidos integralmente, 38.912 blocos. Dez inventários `reviewed`, com 1.202 entradas e 993 afirmações publicáveis (450 Inconclusivo; opiniões fora do placar). Revisão assistida por IA com pesquisa documental, sem revisão humana independente nem conferência acústica integral.
- Gerados os 10 novos relatórios e preservados os 6 anteriores, com comparação de igualdade dos objetos antigos no índice. Acervo local: 16 vídeos.
- `npm run snapshots:editorial` passou (13 inventários editoriais: 3 antigos + 10 novos).
- `npm run build` passou e gerou índice de 16 snapshots e dist. `npm run lint` passou.
- `npm test` passou: 156 testes em 22 arquivos, incluindo hashes, citações/timestamps literais, metadados, reprodução exata dos artefatos e ressalvas editoriais.
- `npm run test:e2e -- --workers=2` PASSOU: 54 testes em desktop e celular, em 2,7 minutos. Screenshots da galeria estão em docs/images/acervo-2026-desktop.png e acervo-2026-mobile.png.
- Commit de conteúdo `d35a9d2be299cb7a82931e0b3a4eb15bb86408f8` enviado a `main`. [Workflow 41078716107](https://github.com/Mreaggle/fatooupapo/actions/runs/41078716107) concluído com sucesso: 156 testes unitários, lint, build, 54 testes Playwright e deploy.
- Produção verificada em https://mreaggle.github.io/fatooupapo/: índice idêntico ao local, 16 relatórios, 993 afirmações novas (450 inconclusivas), dez relatórios Markdown e dez transcrições com HTTP 200 e bytes idênticos. Assets referenciados pelo HTML acessíveis e correspondentes ao build do Actions.
- Mais 28 testes Playwright passaram diretamente contra o site publicado, em desktop e celular: dez novos relatórios, galeria com todos os vídeos, sincronização, logo fixa, voltar ao topo e botão EM MANUTENÇÃO desabilitado. O player foi simulado nesses testes; isso não comprova disponibilidade externa do YouTube nem conferência acústica.

## Inventários finais

| Vídeo | ID | Entradas | Publicáveis |
|---|---|---:|---:|
| Pavanato × Abner Henrique | `xejucP41-P8` | 126 | 109 |
| MC Smith × Arthur do Val | `HhWQCedS81g` | 150 | 131 |
| Sabatina: Renan Santos | `9P1Lqrt_j2M` | 98 | 85 |
| Sabatina: Lula | `Lfz5UPiuM4I` | 74 | 65 |
| Sabatina: Flávio Bolsonaro | `-2kJfglKuY8` | 92 | 82 |
| Sabatina: Lula no Flow | `y-KdHRZ9Ggo` | 148 | 136 |
| Evangélicos × Católicos | `mQRx1epMpMs` | 120 | 85 |
| Cristãos × Judeus | `YKVtqHoake0` | 137 | 89 |
| Capitalismo × Socialismo | `b-dvcPHV8ck` | 181 | 158 |
| Cristão × Ateu | `l6g0GOCiWVs` | 76 | 53 |

Todos os agentes concluíram: `/root/sabatinas`, `/root/debates_religiao`, `/root/debates_economia_seguranca`. Não há tarefa editorial delegada pendente. O usuário autorizou expressamente trabalho em paralelo.

## Onde estão os arquivos

- `requests/ID.srt`: cópias canônicas byte a byte; os originais fornecidos na raiz estão intactos.
- `reviews/ID.json`: inventários canônicos e conclusões; `reviews/ID.md`: auditoria legível, incluindo opiniões excluídas.
- `snapshots/ID.md`: relatório publicável com JSON; `transcripts/ID.md`: texto integral fornecido e seus timestamps.
- `public/snapshots/index.json`: índice estático gerado,16 relatórios.
- `reviews/sources-2026-10-30.json`: catálogo final consolidado,599 chaves. O lote também referencia documentos de `sources-2025.json`; por isso601 chaves distintas usadas ao incluir o catálogo anterior.
- Subpasta deste arquivo: `manifest.json` com hashes, arquivo original e contagens finais;10 arquivos `ID.metadata.json` com oEmbed/player públicos do YouTube. Catálogos de trabalho separados `sources-root.json`, `sources-sabatinas.json`, `sources-economia-seguranca.json`, `sources-religiao.json` foram consolidados. Não editar só um catálogo de trabalho após o fechamento sem atualizar o consolidado e regenerar os relatórios.
- `README.md` desta subpasta: metodologia, tabela de cobertura e fontes. `source-audit-*.json`, `source-access-economia-seguranca.json`, `source-check-religiao.json`, `validation-sabatinas.json`: registros de consultas/validação. São históricos; URLs substituídos podem continuar no registro antigo.
- `.analysis-work/source-audit/`: caches locais de PDF/HTML de pesquisa. NÃO adicionar esses caches ao git.
- `.cues.json`, `.txt`, `.compact.txt`, `.grouped.txt`, `.draft.json`, TSVs e progressos antigos na subpasta são intermediários; não adicionar indiscriminadamente. Os JSONs canônicos ficam na raiz reviews.

## Mudanças de código e documentação

- `scripts/analysis/editorial.ts`: aceita limitations e coverageNotes opcionais e as expõe no relatório; relatórios anteriores sem campos continuam idênticos.
- `scripts/build-editorial-debates.mjs`: descobre reviews/ID.json e carrega catálogos sources-*.json da raiz, recusando colisões divergentes. Drafts são recusados deliberadamente.
- `src/services/snapshots.ts`: lista todo acervo; `src/components/Home.tsx`: carrossel mantém6 destaques; galeria mostra todos16.
- Ajustes em `src/App.test.tsx`, `src/services/snapshots.test.ts`, novo `scripts/analysis/batch-2026.test.ts` e extensão de `e2e/report-video.spec.ts` para os 10 relatórios.
- `README.md`, `reviews/README.md`, `docs/DEVELOPMENT.md`: documentação atualizada. README principal já lista os 10 links.

## Cuidados editoriais já resolvidos

- Pesquisa histórica respeita datas de referência dos vídeos; não converter acusação, investigação, projeção ou proposta em resultado ocorrido/culpa comprovada.
- Crenças e hipóteses metafísicas ficam fora do placar; checagem de documento não comprova evento sobrenatural.
- Não penalizar hipérbole óbvia, autocorreção e erro provável da legenda. Revisão cruzada corrigiu MC97,7%pobres; NZ/Austrália; independência energética versus saldo EIA; comparação Valeixo versus total de trocas da PF.
- Root corrigiu recortes indevidos antes de publicar: funções Civil/PM, Brasil abaixo da média tributária OCDE, humor/intenção como opinião, livros de Umbanda sem material identificado como Inconclusivo e risco médico sem imputar certeza a quem disse pode.
- CFM2427/2025 e COI março2026 têm regras específicas; liminar individual do adolescente13anos não é revogação geral do CFM. Norma antiga2265/2019 admitia pesquisa após TannerII e vedava pré-púbere. Não inferir fertilidade/diagnóstico de atleta a partir de medalha ou nome.
- PubMed17457851 é Phillips/Stein2007 (amostra clínica), não meta-análise Ano/Vasconcelles; corrigido. Fontes extras de Haydn, Karnal e Tolkien integradas.
- Fonte atual de fome2022: RedePENSSAN `/wp-content/uploads/2026/01/Relatorio-II-VIGISAN-2022_compressed.pdf`. ICPR prisão provisória: `https://eprints.bbk.ac.uk/id/eprint/55685/2/working_prisoners_in_brazil.pdf`.
- Pé-de-Meia:43% abandono nacional,66% Sergipe e62% reprovação são medidas distintas; não confundir500mil abandonos históricos com desistências causalmente evitadas.

## Lacunas temporais declaradas

Leitura integral é do material fornecido, não garantia de cobertura acústica do vídeo inteiro. Começos de SRT: Pavanato00:38.645; MC03:12.799; Renan01:59.760; LulaGlobo00:00; Flávio00:01.400; LulaFlow00:07.400; católicos/evangélicos01:42.310; cristãos/judeus04:28.080; capitalismo00:00; cristão/ateu00:03.929. Há diferenças pequenas no fim, até cerca de21s antes do player e até2s além. Tempos foram preservados. A tabela completa está no README do lote.

## Fechamento da publicação

- Os dois avisos de espaço ao fim de linha foram corrigidos no inventário canônico de MC Smith e os relatórios foram regenerados antes do commit. `git diff --cached --check` passou. Os seis relatórios anteriores foram comparados como objetos completos e permaneceram idênticos.
- Foram incluídos 88 caminhos explícitos no commit de conteúdo. O PDF da raiz, os dez SRTs originais, caches e intermediários permaneceram fora do commit. Não foi usado `git add .`.
- SHA-256 do índice conferido em produção: `95432716a8f6cdd6b8529fa2cc67b255fd5674c5d852526c274577b498377f27`.
- Comando da verificação em produção: `PLAYWRIGHT_BASE_URL=https://mreaggle.github.io/fatooupapo/ npm run test:e2e -- --workers=2 --grep 'nova checagem|galeria dá acesso|logo e botão|vídeo sincroniza|verificação fica em manutenção'` — 28 testes aprovados em 52,2 segundos.
- Este fechamento operacional é registrado em commit de documentação posterior ao commit de conteúdo. A publicação desse commit passa pelo mesmo workflow do Pages; o run acima identifica a entrega de conteúdo já concluída e verificada.
- Não há tarefa editorial, correção de código ou publicação de conteúdo pendente deste lote. Para conferir a última execução, use `gh run list --repo Mreaggle/fatooupapo --workflow deploy-pages.yml`.

## Regras de execução persistentes

- Pasta `/home/user/fatooupapo`. Ler AGENTS.md e `/root/.codex/RTK.md`; comandos shell SEMPRE com rtk.
- Node 22.23.2 instalado. Comandos: `rtk npm test`, `rtk npm run lint`, `rtk npm run build`, `rtk npm run test:e2e -- --workers=2`, `rtk proxy gh ...`.
- Preferência permanente do usuário: deploy no Pages após cada implementação/correção/atualização. Não enviar mensagens externas não solicitadas nem criar comentários em issues.
- Manter atualizações breves em português durante trabalho. Pedido mais recente foi salvar este ponto de retomada; ele não cancelou o objetivo de concluir e publicar os dez vídeos.
