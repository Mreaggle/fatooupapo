import type { AnalysisProgress, AnalysisReport, SnapshotIndex } from '../types'
import type { ParsedYouTubeUrl } from '../lib/youtube'

const API_URL = (import.meta.env.VITE_ANALYSIS_API_URL as string | undefined)?.replace(/\/$/, '')

export class AnalysisError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'integration_unavailable'
      | 'video_unavailable'
      | 'transcript_unavailable'
      | 'service_failure'
      | 'invalid_response',
  ) {
    super(message)
  }
}

function assertReport(value: unknown, videoId: string): AnalysisReport {
  const report = value as Partial<AnalysisReport> | null
  if (
    !report ||
    report.schemaVersion !== 1 ||
    report.status !== 'completed' ||
    report.video?.id !== videoId ||
    !Array.isArray(report.claims)
  ) {
    throw new AnalysisError('O serviço retornou um relatório em formato inválido.', 'invalid_response')
  }
  return report as AnalysisReport
}

async function findSnapshot(videoId: string, signal: AbortSignal): Promise<AnalysisReport | null> {
  const response = await fetch(`${import.meta.env.BASE_URL}snapshots/index.json`, {
    signal,
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) return null

  const index = (await response.json()) as SnapshotIndex
  const report = index.reports?.[videoId]
  return report ? assertReport(report, videoId) : null
}

function errorFromStatus(status: number): AnalysisError {
  if (status === 404 || status === 410) {
    return new AnalysisError('O vídeo não está disponível ou não pode ser acessado.', 'video_unavailable')
  }
  if (status === 422) {
    return new AnalysisError(
      'A transcrição deste vídeo não está disponível por um meio autorizado.',
      'transcript_unavailable',
    )
  }
  return new AnalysisError(
    'O serviço de análise falhou temporariamente. Tente novamente mais tarde.',
    'service_failure',
  )
}

async function wait(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(resolve, milliseconds)
    signal.addEventListener('abort', () => {
      window.clearTimeout(timer)
      reject(new DOMException('Operação cancelada', 'AbortError'))
    }, { once: true })
  })
}

async function requestBackend(
  video: ParsedYouTubeUrl,
  signal: AbortSignal,
  onProgress: (progress: AnalysisProgress) => void,
): Promise<AnalysisReport> {
  if (!API_URL) {
    throw new AnalysisError(
      'O backend de transcrição e checagem ainda não foi configurado. Este vídeo também não está no acervo de snapshots.',
      'integration_unavailable',
    )
  }

  onProgress({ stage: 'transcript', message: 'Solicitando a transcrição autorizada do vídeo…' })
  const response = await fetch(`${API_URL}/v1/analyses`, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ videoId: video.videoId, url: video.canonicalUrl }),
  })

  if (!response.ok) throw errorFromStatus(response.status)
  const initial = await response.json() as { report?: unknown; statusUrl?: string }
  if (initial.report) return assertReport(initial.report, video.videoId)
  if (!initial.statusUrl) {
    throw new AnalysisError('O serviço não informou como acompanhar a análise.', 'invalid_response')
  }

  const statusUrl = new URL(initial.statusUrl, API_URL).toString()
  while (!signal.aborted) {
    await wait(1800, signal)
    const statusResponse = await fetch(statusUrl, { signal, headers: { Accept: 'application/json' } })
    if (!statusResponse.ok) throw errorFromStatus(statusResponse.status)

    const job = await statusResponse.json() as {
      state: 'queued' | 'transcript' | 'claims' | 'evidence' | 'report' | 'completed' | 'failed'
      message?: string
      report?: unknown
    }
    if (job.state === 'completed' && job.report) return assertReport(job.report, video.videoId)
    if (job.state === 'completed') {
      throw new AnalysisError('A análise terminou sem um relatório válido.', 'invalid_response')
    }
    if (job.state === 'failed') throw errorFromStatus(500)
    if (job.state !== 'queued') {
      onProgress({ stage: job.state, message: job.message ?? 'Processando a análise…' })
    }
  }

  throw new DOMException('Operação cancelada', 'AbortError')
}

export async function analyzeVideo(
  video: ParsedYouTubeUrl,
  signal: AbortSignal,
  onProgress: (progress: AnalysisProgress) => void,
): Promise<{ report: AnalysisReport; source: 'snapshot' | 'backend' }> {
  onProgress({ stage: 'snapshot', message: 'Procurando uma análise no acervo de snapshots…' })
  try {
    const snapshot = await findSnapshot(video.videoId, signal)
    if (snapshot) return { report: snapshot, source: 'snapshot' }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    // Uma falha no arquivo estático não deve impedir a tentativa no serviço principal.
  }

  const report = await requestBackend(video, signal, onProgress)
  return { report, source: 'backend' }
}
