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
  speakerOrigin?: 'fact-check-source'
  speakerAttribution?: SpeakerAttribution
  timestampSeconds: number
  cueStart?: number
  cueEnd?: number
  verdict: Verdict
  explanation: string
  evidence: Evidence[]
  limitations?: string
  importedChecks?: {
    publisher: string
    url: string
    label: string
    automated: boolean
  }[]
}

export interface Participant {
  id: string
  name: string
  aliases: string[]
  role: 'guest' | 'host'
  source: 'video-title' | 'self-introduction'
}

export interface SpeakerAttribution {
  participantId: string
  name: string
  score: number
  scoreKind: 'uncalibrated-text-evidence'
  method: 'text-rules-v1'
  needsReview: true
  anchor: {
    kind: 'self-introduction' | 'named-handoff' | 'reply-transition'
    cueStart: number
    cueEnd: number
    text: string
  }
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
  participants?: Participant[]
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

export interface RecentDebate {
  video: AnalysisReport['video']
  analyzedAt: string
  claimCount: number
  coverageKind?: NonNullable<AnalysisReport['coverage']>['kind']
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
