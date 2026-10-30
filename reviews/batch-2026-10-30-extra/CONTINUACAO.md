# Continuação — cinco vídeos adicionais e autoria nos cards

Pedido: destacar o autor antes do argumento nos cards, respeitando revisões locais de locutor; checar e publicar cinco novos vídeos; organizar os diretórios e mover os SRTs da raiz.

IDs: MJEYLvrZJV0 (nazismo); foDB0XU9XQM (feminismo); FDeAWt5m3Mw (alienígenas); Z7pP0rDXdBM (marxismo); zqmYUQJz17k (futuro do Brasil).

Os cinco novos SRTs foram movidos sem alteração para `requests/ID.srt`. Metadados públicos do YouTube, nomes originais, hashes e contagens estão neste lote. Dez duplicatas antigas da raiz foram preservadas em `requests/originals/`, com igualdade de bytes verificada contra suas cópias canônicas. Não apagar os originais locais nem incluí-los novamente no commit.

Autoria implementada: nome azul em destaque antes do argumento no PNG e no relatório; respeita revisões locais e usa “Locutor não identificado” quando necessário. Passaram 162 testes unitários, lint, build e quatro testes de navegador de autoria/exportação.

Trabalho pendente: leitura/revisão documental completa dos cinco inventários; geração dos relatórios e testes; commit/push/deploy e verificação em produção. Nenhum novo snapshot foi publicado nesta etapa.

Leituras auxiliares completas em `.analysis-work/batch-five-2026-10-30/ID.txt`, `ID.grouped.txt` e `ID.cues.json`. Não publicar caches nem intermediários. Os inventários finais devem ser canônicos em `reviews/ID.json`, seguindo `scripts/analysis/editorial.ts` e o catálogo `sources-*.json`. Nunca marcar revisão concluída antes de realizá-la.

Regras: shell sempre com `rtk`; staging explícito, sem `git add .`; testes, lint, build, navegador e deploy no Pages obrigatórios. Não há autorização atual para delegação a subagentes. Não extrair credenciais do GitHub. Manter atualizações breves em português durante todo o trabalho.

Leitura: FDeAWt5m3Mw lido integralmente (4.445 blocos), com 88 notas de inventário em `.analysis-work/batch-five-2026-10-30/FDeAWt5m3Mw.inventory.tsv`; revisão documental em andamento, ainda não concluída. Os outros quatro vídeos ainda não foram lidos.
