# Tipografia

O projeto usa **AnthropicSerif** nas versões variáveis Roman e Italic. Os arquivos WOFF2 são servidos pelo próprio site, em `public/fonts/`; não dependem de Google Fonts ou de um CDN em tempo de execução. O Vite adapta os caminhos para o subdiretório do GitHub Pages.

## Aplicação

| Contexto | Peso e estilo |
| --- | --- |
| Hero e subtítulo | Regular, 400 |
| Palavra “checamos.” | Itálico real, 400 |
| Título do relatório | Medium, 500 |
| Títulos de afirmações e diálogos | Semibold, 600 |
| Citações e resumo | Regular, 400 |

Botões, campos, filtros, fontes consultadas e metadados preservam a família sem serifa. As duas versões têm eixo `wght` de 300 a 800, eixo óptico `opsz` de 16 a 48 e os caracteres acentuados usados em português. `font-optical-sizing: auto` adapta o desenho ao tamanho; `font-synthesis: none` evita pesos e itálicos artificiais. `font-display: swap` permite leitura durante o carregamento.

## Origem dos arquivos

Arquivos obtidos da folha de estilos pública de [anthropic.com](https://www.anthropic.com/), em 28/10/2026:

- [Roman original](https://www.anthropic.com/_next/static/media/AnthropicSerif_Roman_Web-s.p.0twp0vwi-lncj.woff2)
- [Italic original](https://www.anthropic.com/_next/static/media/AnthropicSerif_Italic_Web-s.p.1fjksu1uimpf3.woff2)

Metadados preservados: versão `26.043.1`, `Copyright 2025-2026 Anthropic PBC`, fabricante BSPK LLC e desenho BSPK × Geist × Anthropic. A fonte é um ativo de terceiros; este repositório não concede licença sobre ela nem a declara open source.

SHA-256:

```text
e96fe97bb7ba2190a9a227d27380e0c79894408bfc6acea5a511774d93a16f69  anthropic-serif-roman.woff2
7f61e32b5941ad6e5699aeb3e03390a43e5f04f3bff6a5853bed08c802596f83  anthropic-serif-italic.woff2
```
