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
        <h2 id="info-title" className="text-lg font-semibold">{page}</h2>
        <button className="icon-button" type="button" onClick={onClose} aria-label="Fechar"><X size={18} /></button>
      </div>
      <div className="space-y-4 pt-5 text-sm leading-7 text-muted">
        {page === 'Como funciona' && <>
          <p>Cole o link de um vídeo do YouTube. Se já houver uma checagem no acervo, ela abre diretamente, sem uma nova chamada à IA.</p>
          <p>O MVP começa pelo debate entre Kim Kataguiri e Jones Manoel. Cada item mostra o trecho da legenda, o momento no vídeo, a conclusão e as fontes. Vídeos sem relatório têm sua indisponibilidade informada.</p>
        </>}
        {page === 'Metodologia' && <>
          <p>Checamos afirmações factuais. Opiniões, propostas e previsões não recebem classificação de verdade ou falsidade. A referência temporal deste debate é 1º de outubro de 2024.</p>
          <dl className="space-y-3">
            {[
              ['Verdadeiro', 'As fontes sustentam a afirmação no recorte indicado.'],
              ['Majoritariamente verdadeiro', 'O ponto central se sustenta, com ressalvas relevantes.'],
              ['Impreciso ou fora de contexto', 'O recorte, a comparação ou uma omissão altera a interpretação.'],
              ['Majoritariamente falso', 'Há um elemento correto, mas os erros comprometem o ponto central.'],
              ['Falso', 'Evidências verificáveis contradizem diretamente o ponto checado.'],
              ['Inconclusivo', 'Não há elementos suficientes para uma conclusão responsável.'],
            ].map(([title, text]) => <div key={title}><dt className="font-medium text-foreground">{title}</dt><dd>{text}</dd></div>)}
          </dl>
          <p>A legenda automática pode transcrever nomes e números incorretamente. Os trechos são preservados e o vídeo original continua sendo a referência. Não atribuímos falantes sem identificação segura. O relatório indica explicitamente a cobertura e as limitações.</p>
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
