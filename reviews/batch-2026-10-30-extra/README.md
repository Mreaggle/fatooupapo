# Cinco vídeos adicionais — revisão de 30/10/2026

Foram lidos todos os **25.627 blocos** dos cinco SRTs fornecidos. Os inventários registram **631 entradas**, das quais **517 afirmações** entram nos relatórios. Há **178** conclusões inconclusivas; elas indicam evidência insuficiente, não falsidade. Opiniões, anúncios, regras e repetições ficam documentados e não acrescentam votos.

A revisão foi assistida por IA, com leitura textual e pesquisa documental, sem revisão humana independente ou validação acústica. Trechos com autoria incerta ficam sem placar individual. A referência histórica segue a publicação original do vídeo, não a data da revisão. Fontes posteriores são usadas apenas quando documentam retrospectivamente o período, com a ressalva pertinente.

## Inventários

| Vídeo | Blocos | Entradas | Afirmações | Inconclusivas | Referência histórica |
|---|---:|---:|---:|---:|---|
| [Nazismo — Breno Altman × Flavio Morgenstern](https://mreaggle.github.io/fatooupapo/?v=MJEYLvrZJV0) | 5530 | 147 | 120 | 35 | 2025-04-09 |
| [Feminismo × Masculinismo](https://mreaggle.github.io/fatooupapo/?v=foDB0XU9XQM) | 5855 | 142 | 111 | 30 | 2025-07-01 |
| [Alienígenas — Sacani × Edison Boaventura](https://mreaggle.github.io/fatooupapo/?v=FDeAWt5m3Mw) | 4445 | 101 | 87 | 45 | 2023-06-29 |
| [Marxismo × Conservadorismo](https://mreaggle.github.io/fatooupapo/?v=Z7pP0rDXdBM) | 4991 | 126 | 100 | 33 | 2025-02-25 |
| [Futuro do Brasil](https://mreaggle.github.io/fatooupapo/?v=zqmYUQJz17k) | 4806 | 115 | 99 | 35 | 2026-08-26 |

## Organização e reprodução

Os SRTs foram movidos sem alteração da raiz para `requests/ID.srt`. Dez duplicatas anteriores foram preservadas localmente em `requests/originals/`, fora do versionamento. O [manifesto](manifest.json) registra nomes originais, hashes SHA-256, limites temporais e contagens. Os cinco `.metadata.json` guardam título, canal, publicação e duração do player consultados no YouTube.

A leitura integral refere-se ao arquivo fornecido. Há vídeos cujos primeiros minutos não estão no SRT; esses intervalos não foram reconstruídos. As citações e tempos são extraídos dos blocos originais e herdam possíveis erros da legenda automática. No debate sobre alienígenas, faltam aproximadamente 19 segundos finais em relação ao player; nos outros quatro, a diferença final é menor que seis segundos. Nenhum texto foi inventado para preencher essas diferenças.

O catálogo [sources-2026-10-30-extra.json](../sources-2026-10-30-extra.json) reúne as referências adicionais. Os inventários também reutilizam documentos de catálogos anteriores. As conclusões distinguem conteúdo documental de prova do evento: relatório de objeto aéreo não é prova extraterrestre, medida judicial provisória não é condenação final, taxa mundial não é contagem nacional e ausência de condenação não comprova denúncia falsa. Figuras e documentos apenas citados no programa não foram automaticamente autenticados.

A pesquisa incluiu documentos oficiais, legislação histórica, estudos originais, acórdãos e tabelas nas seções pertinentes. Alguns servidores bloquearam acesso automatizado; pesquisa institucional, reproduções documentais e fontes alternativas foram usadas com o alcance indicado em cada item. Não se afirma que todos os links responderam HTTP 200. Caches de pesquisa e cópias integrais de terceiros não são publicados.

```sh
npm run snapshots:editorial
npm run snapshots:build
```

Esses comandos reproduzem os relatórios, os inventários legíveis e as transcrições a partir dos JSONs revisados e SRTs, validando hashes, intervalos, varredura e fontes. O índice passa a ter 21 vídeos. Os 16 relatórios anteriores são preservados.

## Validação e publicação

Os testes verificam reprodução exata, citações, tempos, proximidade com a duração do player, exclusão de opiniões/repetições e regressões de recorte e cronologia. O navegador abre os cinco relatórios em desktop e celular, além de exercitar a galeria, busca e exportação dos cards. A API de vídeo é simulada nos testes para permitir verificar a sincronização sem depender da disponibilidade externa.

O [checkpoint](CONTINUACAO.md) registra o estado efetivo dos testes e do deploy. A presença dos arquivos locais não equivale à publicação no GitHub Pages.
