# Dez vídeos — revisão de 30/10/2026

Foram lidos todos os **38.912 blocos** dos dez SRTs fornecidos. Os inventários registram **1.202 entradas**, das quais **993 afirmações** entram nos relatórios; opiniões e repetições ficam documentadas e não acrescentam votos. Há 450 conclusões inconclusivas: isso significa evidência insuficiente, não falsidade nem comprovação de inocência.

A revisão foi assistida por IA, com pesquisa documental. Não houve revisão humana independente nem conferência acústica integral. Locutores são atribuídos pelo contexto textual; a ausência de autoria segura mantém o trecho fora do placar individual. Erros prováveis de reconhecimento não são tratados automaticamente como erro do participante. As classificações são sobre os trechos e seus recortes, não sobre a honestidade das pessoas.

Nos debates religiosos, crenças, milagres, juízos morais e interpretações filosóficas não recebem certificação empírica. Verificar o conteúdo de um texto é diferente de comprovar os acontecimentos sobrenaturais narrados. Nas sabatinas, propostas, resultados executados, investigações e condenações são distinguidos. As referências históricas seguem a data do vídeo; textos posteriores são usados apenas quando esclarecem retrospectivamente o período, com a ressalva pertinente.

## Inventários e cobertura

| Vídeo | Blocos | Entradas | Afirmações publicadas | Primeiro tempo SRT | Fim do último bloco | Duração do player (s) |
|---|---:|---:|---:|---|---|---:|
| [Pavanato × Abner Henrique](https://mreaggle.github.io/fatooupapo/?v=xejucP41-P8) | 4.765 | 126 | 109 | 00:00:38.645 | 02:21:12.080 | 8473 |
| [MC Smith × Arthur do Val](https://mreaggle.github.io/fatooupapo/?v=HhWQCedS81g) | 5.069 | 150 | 131 | 00:03:12.799 | 03:00:00.000 | 10798 |
| [Sabatina: Renan Santos](https://mreaggle.github.io/fatooupapo/?v=9P1Lqrt_j2M) | 3.230 | 98 | 85 | 00:01:59.760 | 01:40:12.920 | 6020 |
| [Sabatina: Lula](https://mreaggle.github.io/fatooupapo/?v=Lfz5UPiuM4I) | 1.239 | 74 | 65 | 00:00:00.000 | 00:42:02.489 | 2530 |
| [Sabatina: Flávio Bolsonaro](https://mreaggle.github.io/fatooupapo/?v=-2kJfglKuY8) | 1.414 | 92 | 82 | 00:00:01.400 | 00:45:01.000 | 2699 |
| [Sabatina: Lula no Flow](https://mreaggle.github.io/fatooupapo/?v=y-KdHRZ9Ggo) | 3.713 | 148 | 136 | 00:00:07.400 | 01:56:13.200 | 6994 |
| [Evangélicos × Católicos](https://mreaggle.github.io/fatooupapo/?v=mQRx1epMpMs) | 4.888 | 120 | 85 | 00:01:42.310 | 03:04:18.000 | 11056 |
| [Cristãos × Judeus](https://mreaggle.github.io/fatooupapo/?v=YKVtqHoake0) | 5.734 | 137 | 89 | 00:04:28.080 | 03:46:11.199 | 13570 |
| [Capitalismo × Socialismo](https://mreaggle.github.io/fatooupapo/?v=b-dvcPHV8ck) | 5.743 | 181 | 158 | 00:00:00.000 | 03:32:26.650 | 12767 |
| [Cristão × Ateu](https://mreaggle.github.io/fatooupapo/?v=l6g0GOCiWVs) | 3.117 | 76 | 53 | 00:00:03.929 | 01:39:12.040 | 5952 |

**Leitura integral refere-se ao SRT fornecido.** Alguns arquivos começam após o início do vídeo, especialmente os debates cristãos/judeus, MC Smith/Arthur, católicos/evangélicos e a sabatina de Renan. Não foram inventadas legendas para preencher os intervalos ausentes. Há diferenças de até aproximadamente 21 segundos entre o fim das legendas e o player; alguns SRTs ultrapassam a duração em cerca de 2 segundos. Todos os tempos originais foram preservados. A sincronização do player acompanha esses tempos e herda eventuais diferenças da legenda automática.

O [manifesto](manifest.json) mapeia o nome de cada arquivo original para sua cópia em `requests/`, hash SHA-256, quantidade de blocos e contagens finais. Os dez arquivos `.metadata.json` guardam os resultados públicos do oEmbed e do player do YouTube usados para título, canal, publicação e duração. Os originais entregues na raiz não foram alterados.

## Fontes e reprodução

O catálogo consolidado é [sources-2026-10-30.json](../sources-2026-10-30.json), com 599 chaves; os inventários deste lote referenciam 601 chaves distintas, incluindo documentos compartilhados do catálogo anterior. Cada conclusão indica seus vínculos específicos. Citações da fala são extraídas diretamente dos intervalos do SRT. A existência de uma fonte não implica que ela confirme toda a fala ou uma relação causal sugerida nela.

Os registros `source-audit-*.json`, `source-access-economia-seguranca.json` e `source-check-religiao.json` documentam verificações de acesso. Alguns servidores bloqueiam ferramentas automáticas com 403, CAPTCHA ou timeout; esses registros não alegam que todos os links retornaram 200. A pesquisa web e outras apresentações institucionais do mesmo documento complementaram tais casos. PDFs e HTML integrais de terceiros usados localmente na pesquisa não são publicados neste lote.

Para regenerar os artefatos canônicos:

```sh
npm run snapshots:editorial
npm run snapshots:build
```

O primeiro comando valida os inventários reviewed, hashes, varredura completa, intervalos, participantes, repetições e vínculos de fontes, e gera `reviews/ID.md`, `snapshots/ID.md` e `transcripts/ID.md`. O segundo valida os relatórios e gera o índice estático com 16 vídeos no acervo. A galeria mostra todos; o carrossel mantém seis destaques.

Os testes do lote conferem a reprodução exata desses arquivos, preservação de citações e timestamps, exclusão de opiniões/repetições e limites editoriais relevantes. Os testes de navegador abrem os dez novos relatórios em desktop e celular e exercitam a sincronização com o contrato da API do YouTube simulado.

O [arquivo de continuidade](CONTINUACAO.md) registra a situação operacional de testes e deploy. Ele é um checkpoint; o sucesso da publicação deve ser conferido no GitHub Actions e no site, não inferido da existência dos arquivos locais.

## Validação local

`npm test`: 156 testes passaram. `npm run lint` e `npm run build`: passaram. `npm run test:e2e -- --workers=2`: 54 testes passaram em desktop e celular. Evidências visuais: [galeria desktop](../../docs/images/acervo-2026-desktop.png) e [galeria celular](../../docs/images/acervo-2026-mobile.png). A publicação é acompanhada separadamente no arquivo de continuidade.
