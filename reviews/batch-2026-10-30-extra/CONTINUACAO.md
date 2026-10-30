# Continuação — lote adicional e cards

Pedidos atendidos na interface: busca no acervo; retirada da lista manual do README raiz; exportação PNG por fala com argumento, conclusão e gauge categórico, sem citação literal; marca Fato ou Papo na base central do gauge; autor destacado antes do argumento, respeitando revisões locais.

A interface e a organização dos SRTs estão publicadas no commit `c5e52397cc82cadb3b8bb04f708e8c9bec94873e`; workflow 41093273462 concluído. Os cinco SRTs estão em `requests/ID.srt`, com bytes e hashes preservados. Dez duplicatas antigas permanecem ignoradas em `requests/originals/`. Não apagar originais ou incluir caches no commit.

Os cinco inventários agora estão concluídos por leitura integral e revisão documental assistida por IA, sem validação acústica nem revisão humana independente. Total: 25.627 blocos, 631 entradas, 517 afirmações publicadas, 178 inconclusivas. JSONs canônicos em `reviews/ID.json`; artefatos gerados em `reviews/ID.md`, `snapshots/ID.md` e `transcripts/ID.md`. O manifesto e o README deste lote registram as contagens por vídeo. Fontes adicionais em `reviews/sources-2026-10-30-extra.json`.

MJEYLvrZJV0: nazismo, 5.530 blocos, 147 entradas, 120 publicadas.
foDB0XU9XQM: feminismo, 5.855 blocos, 142 entradas, 111 publicadas.
FDeAWt5m3Mw: alienígenas, 4.445 blocos, 101 entradas, 87 publicadas.
Z7pP0rDXdBM: marxismo, 4.991 blocos, 126 entradas, 100 publicadas.
zqmYUQJz17k: futuro do Brasil, 4.806 blocos, 115 entradas, 99 publicadas.

Validação local em 30/10/2026: 172 testes em 23 arquivos aprovados; lint e build com 21 vídeos aprovados; 70 testes de navegador em desktop e celular aprovados, incluindo os cinco relatórios, busca, sincronização e exportação de cards. Os 16 objetos de relatórios anteriores permanecem idênticos no índice. A diferença de aproximadamente 19 segundos finais sem legenda no vídeo de alienígenas está documentada, com o SRT original preservado.

Publicação: o push deste commit em `main` aciona o workflow [Deploy GitHub Pages](https://github.com/Mreaggle/fatooupapo/actions/workflows/deploy-pages.yml). Este checkpoint registra a validação antes do push; a conclusão do deploy deve ser conferida na execução correspondente ao commit, seguida da verificação do [site publicado](https://mreaggle.github.io/fatooupapo/).

Regras: shell sempre com `rtk`; staging explícito, sem `git add .`; preservar `Hero Fato ou Papo.pdf`, intermediários antigos em `reviews/batch-2026-10-30/` e `.analysis-work/` fora do commit. Não há autorização para subagentes. Deploy ao Pages já autorizado de forma permanente pelo AGENTS.md. Conferir preservação dos 16 objetos de relatórios do índice anterior.

Pesquisa e notas locais completas em `.analysis-work/batch-five-2026-10-30/`: cues, leituras agrupadas, inventários provisórios/finais e caches. Não publicar esses intermediários. O arquivo histórico do lote de dez vídeos não deve ser reescrito como se fosse o checkpoint atual.
