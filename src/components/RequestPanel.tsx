import { useEffect, useRef, useState } from 'react'
import { dailyCredits, estimateCredits } from '../lib/analysis-credits'
import { analysisRequestLinks } from '../lib/analysis-requests'
import { parseYouTubeUrl } from '../lib/youtube'
import { parseTranscript } from '../lib/subtitles'
import { readCreditBalance } from '../services/processing'
import { ProcessingTracker } from './ProcessingTracker'

export function RequestPanel({ videoUrl, queueUrl }: { videoUrl: string; queueUrl: string }) {
  const [duration, setDuration] = useState('180')
  const [file, setFile] = useState<{ characters: number; bytes: number } | null>(null)
  const [fileError, setFileError] = useState('')
  const [login, setLogin] = useState('')
  const [balance, setBalance] = useState<Awaited<ReturnType<typeof readCreditBalance>> | null>(null)
  const [balanceError, setBalanceError] = useState('')
  const [registrationStarted, setRegistrationStarted] = useState(false)
  const [rejected, setRejected] = useState(false)
  const balanceRequest = useRef<AbortController | null>(null)
  const fileRequest = useRef(0)
  useEffect(() => () => { balanceRequest.current?.abort(); fileRequest.current += 1 }, [])
  const minutes = Number(duration)
  const valid = Number.isInteger(minutes) && minutes > 0 && minutes <= 240
  const estimate = valid ? estimateCredits({ durationSeconds: minutes * 60, textCharacters: file?.characters, fileBytes: file?.bytes }) : null
  const links = analysisRequestLinks(videoUrl, valid ? minutes : undefined)
  const video = parseYouTubeUrl(videoUrl)
  if (!links || !video) return null
  const number = new Intl.NumberFormat('pt-BR')
  if (rejected) return <p role="alert" className="mt-4 text-sm text-muted">Este vídeo não requer fact-checking.</p>

  return <section aria-label="Solicitar nova análise" className="mt-4 rounded-lg border border-white/20 p-4 text-sm leading-6 text-[#d2dbd8]">
    <p>Este vídeo ainda não está no acervo. Confirme o pedido usando sua conta do GitHub. Após o envio, a validação e os lotes de processamento começam automaticamente, conforme a cota disponível. Volte a esta página para acompanhar. O relatório é publicado após revisão.</p>
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-xs">Duração do vídeo em minutos
        <input className="rounded border border-white/25 bg-black/20 px-3 py-2 text-white" type="number" min={1} max={240} step={1} value={duration} onChange={(event) => setDuration(event.target.value)} />
      </label>
      <label className="flex flex-col gap-1 text-xs">Legenda para estimar o custo (opcional)
        <input className="max-w-full rounded border border-white/25 px-2 py-2" type="file" accept=".srt,.vtt" onChange={async (event) => {
          const selected = event.target.files?.[0]
          const sequence = ++fileRequest.current
          setFile(null); setFileError('')
          if (!selected) return
          if (selected.size > 1_000_000 || !/\.(srt|vtt)$/i.test(selected.name)) { setFileError('Use SRT/VTT de até 1 MB e 4 horas.'); return }
          try {
            const cues = parseTranscript(await selected.text())
            if (sequence !== fileRequest.current) return
            setFile({ characters: cues.map((cue) => cue.text).join(' ').length, bytes: selected.size })
          } catch (caught) { if (sequence === fileRequest.current) setFileError(caught instanceof Error ? caught.message : 'Legenda inválida.') }
        }} />
      </label>
    </div>
    {fileError && <p role="alert" className="mt-2 text-xs text-red-300">{fileError}</p>}
    {!valid && <p role="alert" className="mt-2 text-xs text-red-300">Informe de 1 a 240 minutos.</p>}
    {estimate && <div className="mt-3 rounded bg-white/5 p-3">
      <p className="font-medium text-white">{estimate.credits} créditos {estimate.estimated ? 'estimados' : 'calculados'} · {dailyCredits} créditos por conta a cada 24h</p>
      <p className="mt-1 text-xs">{number.format(estimate.textCharacters)} caracteres de fala · {number.format(estimate.fileBytes)} bytes de legenda · cerca de {estimate.estimatedClaims} afirmações previstas para planejar o esforço.</p>
      <p className="mt-1 text-[11px] opacity-75">A previsão não limita as afirmações checadas. O custo é confirmado com o arquivo e a duração aprovados. Vídeos a partir de 3 horas usam a cota inteira. Consultas ao acervo e retomadas do mesmo pedido são gratuitas.</p>
    </div>}
    <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={async (event) => {
      event.preventDefault(); balanceRequest.current?.abort()
      const controller = new AbortController(); balanceRequest.current = controller
      setBalance(null); setBalanceError('')
      try { const value = await readCreditBalance(login.trim(), controller.signal); if (!controller.signal.aborted) setBalance(value) }
      catch (caught) { if (!controller.signal.aborted) setBalanceError(caught instanceof Error ? caught.message : 'Saldo indisponível.') }
    }}>
      <label className="flex flex-col gap-1 text-xs">Sua conta do GitHub
        <input className="rounded border border-white/25 bg-black/20 px-3 py-2 text-white" value={login} autoCapitalize="none" onChange={(event) => { setLogin(event.target.value); setBalance(null); setBalanceError(''); balanceRequest.current?.abort() }} placeholder="Seu nome de usuário" />
      </label>
      <button type="submit" className="rounded border border-white/25 px-3 py-2 text-xs text-white">Consultar saldo</button>
    </form>
    {balance && <p role="status" className="mt-2 text-xs">Saldo registrado: {balance.remaining}/{dailyCredits} créditos.{balance.resetsAt ? ` Renovação: ${new Date(balance.resetsAt).toLocaleString('pt-BR')}.` : ' A janela de 24h começa no primeiro débito.'} O débito usa a conta que efetivamente abrir o pedido.</p>}
    {balanceError && <p role="alert" className="mt-2 text-xs text-red-300">{balanceError}</p>}
    <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
      {valid && <a className="text-white underline underline-offset-4" href={links.request} target="_blank" rel="noreferrer" onClick={() => setRegistrationStarted(true)}>Confirmar pedido com GitHub ↗</a>}
      <a className="text-white underline underline-offset-4" href={queueUrl} target="_blank" rel="noreferrer">Ver pedidos enviados ↗</a>
    </div>
    <p className="mt-2 text-[11px] opacity-75">O pedido e os materiais são públicos. O arquivo escolhido acima fica no navegador, apenas para estimativa. O serviço tenta obter uma legenda disponível; se não conseguir, será necessário fornecer SRT/VTT. O débito ocorre no início do processamento, sem novo débito a cada lote.</p>
    <ProcessingTracker videoId={video.videoId} discover={registrationStarted} onRejected={() => setRejected(true)} />
  </section>
}
