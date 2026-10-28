export type Verdict =
  | 'Verdadeiro'
  | 'Majoritariamente verdadeiro'
  | 'Impreciso ou fora de contexto'
  | 'Majoritariamente falso'
  | 'Falso'
  | 'Inconclusivo'

export interface Evidence {
  title: string
  url: string
  publisher: string
  publishedAt?: string
  position: 'supports' | 'contradicts' | 'context'
}

export interface Claim {
  id: string
  title?: string
  topic?: string
  quote: string
  speaker?: string
  timestampSeconds: number
  cueStart?: number
  cueEnd?: number
  verdict: Verdict
  explanation: string
  evidence: Evidence[]
  limitations?: string
}

export interface AnalysisReport {
  schemaVersion: 1
  video: {
    id: string
    url: string
    title: string
    channel: string
    thumbnailUrl: string
  }
  analyzedAt: string
  status: 'completed'
  claims: Claim[]
  summary: string
  coverage?: {
    kind: 'selected-claims' | 'all-identified-claims'
    description: string
    transcriptPath: string
    firstTimestamp: number
    lastTimestamp: number
    cueCount: number
  }
  limitations?: string[]
}

export interface SnapshotIndex {
  generatedAt: string
  reports: Record<string, AnalysisReport>
}

export type ProgressStage =
  | 'snapshot'
  | 'transcript'
  | 'claims'
  | 'evidence'
  | 'report'

export interface AnalysisProgress {
  stage: ProgressStage
  message: string
}
