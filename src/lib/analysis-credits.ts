export const dailyCredits = 100
export const creditWindowMs = 24 * 60 * 60 * 1000
export const creditPolicyVersion = 'mvp-v1'

// Measured from the original MVP SRT; credits are product units, not model tokens.
export const mvpCalibration = {
  videoId: 'q4T7plSBdJE', durationSeconds: 11455.84,
  textCharacters: 196216, fileBytes: 390242, cues: 5224, reviewedClaims: 48,
}

function effort(durationSeconds: number, characters: number) {
  const estimatedClaims = Math.max(1, Math.ceil(mvpCalibration.reviewedClaims * Math.max(durationSeconds / mvpCalibration.durationSeconds, characters / mvpCalibration.textCharacters)))
  const estimatedWindows = Math.max(1, Math.ceil(characters / 7000))
  return {
    estimatedClaims,
    estimatedCalls: estimatedWindows + 2 * estimatedClaims,
    // Conservative planning unit: characters/4, repeated evidence context and output.
    estimatedModelTokens: Math.ceil(characters / 4) + estimatedWindows * 1000 + estimatedClaims * 5000,
  }
}

export function estimateCredits(input: { durationSeconds: number; textCharacters?: number; fileBytes?: number }) {
  if (!Number.isFinite(input.durationSeconds) || input.durationSeconds <= 0 || input.durationSeconds > 14400) throw new Error('Informe uma duração de até 240 minutos (4 horas).')
  for (const value of [input.textCharacters, input.fileBytes]) {
    if (value !== undefined && (!Number.isInteger(value) || value < 1)) throw new Error('Tamanho de legenda inválido.')
  }
  const ratio = input.durationSeconds / mvpCalibration.durationSeconds
  const textCharacters = input.textCharacters ?? Math.max(1, Math.ceil(mvpCalibration.textCharacters * ratio))
  const fileBytes = input.fileBytes ?? Math.max(1, Math.ceil(mvpCalibration.fileBytes * ratio))
  const estimated = effort(input.durationSeconds, textCharacters)
  const reference = effort(mvpCalibration.durationSeconds, mvpCalibration.textCharacters)
  const workload = Math.max(input.durationSeconds / 10800, textCharacters / mvpCalibration.textCharacters, fileBytes / mvpCalibration.fileBytes, estimated.estimatedModelTokens / reference.estimatedModelTokens)
  const credits = Math.min(dailyCredits, Math.max(10, Math.ceil(workload * dailyCredits / 10) * 10))
  return { policy: creditPolicyVersion, credits, durationSeconds: input.durationSeconds, textCharacters, fileBytes, estimated: input.textCharacters === undefined || input.fileBytes === undefined, ...estimated }
}
