# Revisões editoriais

Os inventários registram os trechos identificados na leitura integral dos SRTs, a data de referência e a decisão editorial de cada item. Uma conclusão inconclusiva registra o que não foi possível estabelecer; não significa falsidade. Opiniões, publicidade, regras e repetições não geram votos adicionais nos gráficos.

As citações publicadas são extraídas literalmente dos blocos indicados. As legendas fornecidas podem conter erros de reconhecimento. A autoria é revisada pelo contexto textual, sem reconhecimento acústico e sem atribuir uma porcentagem artificial de precisão.

Os arquivos em elaboração não são carregados pela página. Somente relatórios revisados em `snapshots/` entram no acervo público.

Os três inventários de 2025 foram concluídos por revisão assistida por IA com pesquisa documental, sem revisão humana independente. A referência histórica corresponde ao início da transmissão no YouTube: 19/09/2025 para o Flow, 11/08/2025 para o RedCast e 20/11/2025 para Jabbour × Marçal no Inteligência Ltda. O episódio de áudio do RedCast foi republicado depois; essa data não substitui a da transmissão. A data de revisão está separada da data de referência.

`npm run snapshots:editorial` reproduz os relatórios, as transcrições em Markdown e os inventários legíveis a partir dos SRTs em `requests/`, dos inventários JSON com nome de ID de vídeo e dos catálogos `sources-*.json`. O gerador exige revisão concluída, hash idêntico do arquivo integral, varredura até o último bloco, intervalos válidos, referências de repetições e fontes para conclusões diferentes de Inconclusivo. Catálogos com a mesma chave e conteúdo divergente são recusados. Ele não faz novas consultas nem executa o Gemini.

O Flow tem 140 entradas, das quais 135 geram afirmações publicadas; o RedCast tem 106 entradas, das quais 92 geram afirmações; Jabbour × Marçal tem 184 entradas, das quais 156 geram afirmações. As demais são opiniões ou repetições documentadas nos arquivos Markdown. Revisão integral significa examinar o inventário identificado em toda a duração, não garantir que toda afirmação possível tenha sido identificada ou resolvida. Inconclusivos continuam visíveis na distribuição, sem virar Fato ou Papo no medidor.

As fontes são vinculadas em cada item. As conclusões distinguem decisões, propostas, acusações e estatísticas preliminares e evitam aplicar retroativamente mudanças de lei. Algumas páginas consolidadas contêm alterações posteriores; vale a redação histórica explicitada no item. Datas de publicação que não foram confirmadas não foram preenchidas por estimativa.

`video-metadata.json` guarda título, canal, publicação e duração consultados no oEmbed e no player público do YouTube. A duração de reprodução é de 7.128 segundos no Flow, 6.749 segundos no RedCast e 10.559 segundos em Jabbour × Marçal; os respectivos SRTs chegam a 7.123,44, 6.748,72 e 10.555,72 segundos. A proximidade do último bloco à duração do vídeo é conferida nos testes, além do hash e da quantidade integral de blocos.

O [lote de 30/10/2026](batch-2026-10-30/README.md) acrescenta dez vídeos. Seus metadados, hashes, limites de cobertura e contagens ficam registrados separadamente. Crenças e interpretações teológicas não são certificadas como fatos empíricos; afirmações sobre o conteúdo de um documento podem ser verificadas sem validar o evento sobrenatural narrado.
