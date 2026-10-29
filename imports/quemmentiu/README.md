# Importação de 29/10/2026

Origem solicitada pelo responsável: https://mreaggle.github.io/quemmentiu/.

| Evento | Vídeo | Registros de origem | Alinhados | Afirmações após agrupar duplicatas | Sem correspondência segura |
|---|---|---:|---:|---:|---:|
| Band, 18/10/2026 | RugVB17uRVM | 81 | 80 | 74 | 1 |
| Globo, 23/10/2026 | 6BBZWwq2juE | 207 | 195 | 175 | 12 |

Os JSONs conservam o SHA-256 dos feeds consultados, a data do evento, os registros importados, os intervalos conferidos no SRT, agrupamentos de duplicatas e exclusões. Os arquivos originais de legenda fornecidos foram movidos sem alterações para `requests/VIDEO_ID.srt`; a versão navegável por blocos está em `transcripts/`.

A conferência desta importação abrange correspondência textual, URLs e divergências entre classificações existentes. Não representa uma nova apuração independente de todos os documentos primários. As classificações editoriais são atribuídas aos veículos; classificações exclusivamente automatizadas, divergências editoriais e links genéricos sem apuração específica não geram uma conclusão própria.

Alguns SRTs corrompem números ou nomes (PIB de 2010, população com fome, pontos de internet e numeração de mortes na pandemia). Esses casos foram mantidos inconclusivos e a legenda original não foi corrigida por inferência. Uma autoria evidentemente invertida no acervo de origem — a pergunta de Lula sobre a defesa de um policial — foi corrigida pelo contexto e registrada no JSON.

Os registros excluídos não contam nos gráficos. Tampouco se presume que todas as demais falas do vídeo já tenham sido checadas. O relatório declara cobertura parcial apesar de preservar a transcrição inteira.

Reprodução editorial explícita: `node scripts/import-quemmentiu.mjs --reviewed`. O comando não consulta IA nem adiciona novas fontes. Não automatize esse comando para feeds novos sem revisar os intervalos e as classificações.
