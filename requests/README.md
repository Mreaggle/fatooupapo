# Transcrições recebidas

As entradas canônicas ficam nesta pasta, nomeadas pelo ID do YouTube: `VIDEO_ID.srt` ou `VIDEO_ID.vtt`. O conteúdo e os tempos fornecidos são preservados. O manifesto de cada lote em `reviews/` registra o nome original, o hash SHA-256 e o vídeo correspondente.

`originals/` preserva localmente cópias antigas que estavam duplicadas na raiz. Esses SRTs não são versionados novamente: suas versões canônicas já estão nesta pasta, e os hashes foram comparados antes da movimentação. Arquivos intermediários de pesquisa e leitura pertencem a `.analysis-work/`, sem entrar no commit.

As transcrições em Markdown para leitura ficam em `transcripts/`; os inventários e fontes, em `reviews/`; os relatórios publicados, em `snapshots/`. Receber uma transcrição não a publica automaticamente.
