import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

export type InfoPage = 'Como funciona' | 'Metodologia' | 'Sobre o projeto'

export function InfoDialog({ page, onClose }: { page: InfoPage | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (page) ref.current?.showModal()
    else ref.current?.close()
  }, [page])

  return (
    <dialog ref={ref} onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose() }} className="info-dialog" aria-labelledby="info-title">
      <div className="flex items-center justify-between gap-4 border-b border-line pb-5">
        <h2 id="info-title" className="font-serif text-xl font-semibold">{page}</h2>
        <button className="icon-button" type="button" onClick={onClose} aria-label="Fechar"><X size={18} /></button>
      </div>
      <div className="space-y-4 pt-5 text-sm leading-7 text-muted">
        {page === 'Como funciona' && <>
          <p>Cole o link de um vídeo do YouTube. Se já houver uma checagem no acervo, ela abre diretamente, sem uma nova chamada à IA.</p>
          <p>Se o vídeo ainda não estiver no acervo, abra um pedido na fila do GitHub. É preciso uma conta para enviar o formulário, e os pedidos são públicos. A equipe aprova o processamento e revisa a transcrição, as afirmações e as fontes antes da publicação. Não há prazo garantido.</p>
          <p>Cada conta recebe 100 créditos de análise por 24 horas. O custo é estimado antes do pedido; vídeos a partir de 3 horas usam a cota inteira. Consultar o acervo e retomar o mesmo pedido não gera novo débito.</p>
          <p>Novos pedidos percorrem a transcrição inteira e checam as afirmações identificadas por lotes. O processamento pode depender de um arquivo SRT ou VTT fornecido pelo responsável quando a extração estiver indisponível. O relatório informa sua cobertura e pode conter itens inconclusivos; o debate inicial ainda é uma revisão parcial.</p>
        </>}
        {page === 'Metodologia' && <>
          <p>Checamos afirmações factuais. Opiniões, propostas e previsões não recebem classificação de verdade ou falsidade. Cada análise deve considerar a data e o contexto da fala; no debate inicial, a referência temporal é 1º de outubro de 2024.</p>
          <dl className="space-y-3">
            {[
              ['Fato', 'As fontes sustentam a afirmação no recorte indicado.'],
              ['Majoritariamente fato', 'O ponto central se sustenta, com ressalvas relevantes.'],
              ['Impreciso ou fora de contexto', 'O recorte, a comparação ou uma omissão altera a interpretação.'],
              ['Majoritariamente papo', 'Há um elemento correto, mas os erros comprometem o ponto central.'],
              ['Papo', 'Evidências verificáveis contradizem diretamente o ponto checado.'],
              ['Inconclusivo', 'Não há elementos suficientes para uma conclusão responsável.'],
            ].map(([title, text]) => <div key={title}><dt className="font-medium text-foreground">{title}</dt><dd>{text}</dd></div>)}
          </dl>
          <p>A legenda automática pode transcrever nomes e números incorretamente. Os trechos são preservados e o vídeo original continua sendo a referência. O relatório indica explicitamente a cobertura e as limitações.</p>
          <p>Os nomes dos locutores são sugestões de regras textuais que procuram apresentações e passagens de palavra. O percentual mede a força dessas pistas, com desconto pela distância até o trecho; não é uma probabilidade calibrada nem a certeza da checagem factual. O título fornece candidatos, sem determinar a ordem das falas. Use “Revisar locutor” para conferir e corrigir no seu navegador.</p>
          <p>Uma fonte oficial comprova o documento ou dado que publicou; sozinha, não comprova causalidade nem neutralidade. Estatísticas de governos sobre os próprios programas são identificadas como tal.</p>
        </>}
        {page === 'Sobre o projeto' && <>
          <p>Fato ou Papo é um projeto aberto de checagem de afirmações em vídeo. O acervo preserva transcrições e relatórios em Markdown, versionados pelo ID do YouTube.</p>
          <p>As análises têm apoio automatizado e podem conter erros. Consulte as evidências e o contexto de cada conclusão.</p>
          <a className="text-foreground underline underline-offset-4" href="https://github.com/Mreaggle/fatooupapo" target="_blank" rel="noreferrer">Código, fontes e correções no GitHub ↗</a>
        </>}
      </div>
    </dialog>
  )
}
