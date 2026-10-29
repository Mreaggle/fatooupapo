# Locutores: identificação textual revisável

O SRT disponível não tem áudio nem diarização. A versão atual reconhece padrões de conversa no texto, sem IA, chamadas de rede ou ordem predefinida de participantes. Não é reconhecimento de voz.

## Funcionamento

1. O título fornece candidatos a convidados, separando nomes em expressões como `Ana x Bruno`. Isso não atribui nenhuma fala.
2. Autoapresentações identificam participantes e apresentadores. Dicionários opcionais resolvem variantes do ASR, como `Quim`/`Kim` e `Manuel`/`Manoel`; o dicionário não contém timestamps nem atribuições.
3. Passagens explícitas (`vamos lá Ana`, `cinco minutos para resposta Bruno`) marcam um contexto de locutor. Nomes mencionados numa acusação ou argumento não são suficientes.
4. Uma réplica explicitamente anunciada pode sugerir o outro participante quando há exatamente dois convidados e um contexto recente. Não há alternância baseada em posição no título ou contagem de falas.
5. Contexto expirado, nomes ambíguos e citações que atravessam uma troca permanecem sem atribuição.

O motor está em `src/lib/speakers.ts`. `npm run snapshot:debate` reproduz as sugestões e as preserva em Markdown. O build valida o nome no cadastro de participantes e a correspondência literal da pista com a transcrição.

## O percentual

É um **índice heurístico de evidência textual**, não uma probabilidade calibrada de identidade vocal. A escala inicial atribui força de 0,98 à autoapresentação, 0,94/0,90 à passagem nominal e até 0,78 à réplica inferida. Essas são decisões de projeto, não taxas de acerto medidas.

`índice = arredondar(100 × força × (1 − 0,2 × idade / janela))`

As janelas são de seis minutos para pistas nominais e quatro para réplicas. O motor se abstém abaixo de 65 ou após expiração. Os limites são conservadores e configuráveis; interrupções não sinalizadas e erros de legenda ainda podem produzir atribuições incorretas. Toda sugestão recebe `needsReview: true`, com o trecho que a motivou.

Uma leitura como “92% de chance de ser Jones” exigiria medir acertos em um conjunto independente de falas identificadas. Até haver essa calibração, a interface explica a natureza do índice e pede revisão. Referência: [calibração de probabilidades](https://scikit-learn.org/stable/modules/calibration.html).

## Revisão pelo usuário

O usuário pode confirmar, trocar, informar outro nome ou marcar como não identificado. A escolha fica somente no `localStorage` desse navegador, por vídeo, afirmação e texto. Não muda o relatório público nem vira um “100%” artificial. Se a citação mudar, a revisão antiga deixa de ser aplicada. É possível restaurar a sugestão original.

## Evolução com áudio autorizado

Para reconhecer a voz independentemente do assunto e da sequência de falas, é necessário áudio disponibilizado legalmente. Um caminho sem modelo generativo é detectar intervalos de voz, extrair características acústicas (por exemplo, coeficientes espectrais), agrupar segmentos semelhantes e associar os grupos a amostras iniciais confirmadas por pessoas. Sobreposição, ruído e vozes semelhantes exigem abstenção e validação. Esse caminho acústico ainda não está implementado; título e autoapresentação continuam sendo pistas de nomeação, não prova da voz.

## Contagem e precisão média nos gráficos

Os gráficos incluem as falas com locutor detectado automaticamente, mesmo antes da revisão, além das atribuições das fontes e revisões locais. Falas sem atribuição a um debatedor ficam fora da comparação. A revisão local atualiza a contagem, inclusive quando o usuário remove uma identificação.

A precisão média estimada de identificação é a média aritmética dos índices textuais de todas as afirmações contabilizadas com índice para aquela pessoa, independentemente da classificação factual. O percentual é exibido com uma casa decimal e acompanhado da quantidade de falas que entrou no cálculo. Ele mantém a natureza heurística não calibrada dos índices originais e não representa veracidade das afirmações nem acurácia medida.

Atribuições provenientes de fontes ou revisões sem índice permanecem contabilizadas, mas não recebem um 100% artificial nem entram na média. Confirmar a mesma pessoa mantém o índice da detecção; trocar por outra pessoa não transfere o índice original para ela. Não há ponderação das contagens de Fato/Papo pela precisão de autoria.
