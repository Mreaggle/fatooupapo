# Contrato do serviço de análise

A v1 opera sem este backend: usa a fila de Issues, processamento no Actions e cota por identidade do GitHub. A barra e o saldo consultam checkpoints públicos nas branches de análise; não usam este polling de três minutos. Veja [ANALYSIS_PIPELINE.md](ANALYSIS_PIPELINE.md). Este contrato permanece para o modo opcional com `VITE_ANALYSIS_API_URL` configurada.

O frontend estático não recebe chaves de API. Configure `VITE_ANALYSIS_API_URL` somente com a URL pública de um backend HTTPS que implemente proteção contra abuso, rate limiting e validação de origem.

## Criar análise

`POST /v1/analyses`

```json
{
  "videoId": "ID_DE_11_CARACTERES",
  "url": "https://www.youtube.com/watch?v=ID_DE_11_CARACTERES"
}
```

O backend pode retornar um relatório final em `report` ou um trabalho assíncrono:

```json
{ "statusUrl": "/v1/analyses/trabalho-123" }
```

## Acompanhar análise

`GET /v1/analyses/trabalho-123` retorna `state` com um destes valores: `queued`, `transcript`, `claims`, `evidence`, `report`, `completed` ou `failed`. Somente `completed` deve conter `report`.

O relatório usa `schemaVersion: 1` e segue as interfaces em `src/types.ts`. O serviço deve devolver `404`/`410` para vídeo indisponível e `422` para transcrição indisponível. Não retorne conclusões sem evidências suficientes; use a classificação `Inconclusivo`.

Os valores de contrato `Verdadeiro`, `Majoritariamente verdadeiro`, `Falso` e `Majoritariamente falso` são exibidos como “Fato”, “Majoritariamente fato”, “Papo” e “Majoritariamente papo”. Não migre os valores de snapshots antigos apenas para mudar seus rótulos na interface.

O esquema validado em execução está em `src/lib/report-schema.ts`. Uma conclusão diferente de `Inconclusivo` precisa de pelo menos uma fonte HTTPS. O campo opcional `coverage` distingue seleção parcial de cobertura de todas as afirmações identificadas. Um trabalho finalizado (`status: completed`) não significa que toda fala do vídeo foi checada. `cueStart` e `cueEnd` permitem auditar cada citação no Markdown da transcrição. Não inclua `speaker` sem identificação segura.

Sugestões de locutor usam `participants` e `claims[].speakerAttribution`, com `method: text-rules-v1`, `scoreKind: uncalibrated-text-evidence`, `needsReview: true` e uma pista textual com blocos de origem. O índice não deve ser interpretado como probabilidade de identidade vocal ou confiança da checagem factual. O contrato valida a identidade do candidato e a anterioridade da pista. Correções no navegador não são enviadas a esta API.

O frontend rejeita URLs de acompanhamento de outra origem e interrompe o polling após três minutos. Cancelar interrompe a consulta no navegador; sem um contrato de cancelamento no servidor, isso não garante que o trabalho remoto pare de executar.

## Responsabilidades do backend

- Obter metadados e transcrições por meios autorizados.
- Manter credenciais exclusivamente no servidor.
- Bloquear destinos arbitrários para evitar SSRF; aceite apenas o ID normalizado.
- Limitar requisições por origem/IP e aplicar filas e timeouts.
- Registrar origem, data e versão dos dados usados na análise.
- Persistir o Markdown revisável que alimentará `snapshots/`.
