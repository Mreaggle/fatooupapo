import { z } from 'zod'
import { creditPolicyVersion, creditWindowMs, dailyCredits, estimateCredits } from '../../src/lib/analysis-credits.ts'

const userSchema = z.object({ login: z.string().min(1), windowStartedAt: z.number().int().nonnegative(), spent: z.number().int().min(0).max(dailyCredits) })
const chargeSchema = z.object({
  userId: z.string().regex(/^\d+$/), videoId: z.string().regex(/^[\w-]{11}$/),
  transcriptHash: z.string().regex(/^[a-f0-9]{64}$/), referenceDate: z.iso.date(),
  durationSeconds: z.number().positive().max(14400), textCharacters: z.number().int().positive(), fileBytes: z.number().int().positive(),
  credits: z.number().int().min(10).max(100), chargedAt: z.number().int().nonnegative(), policy: z.literal(creditPolicyVersion),
})
export const ledgerSchema = z.object({ version: z.literal(1), users: z.record(z.string().regex(/^\d+$/), userSchema), requests: z.record(z.string().regex(/^\d+$/), chargeSchema) })
export type CreditLedger = z.infer<typeof ledgerSchema>

export function chargeRequest(ledger: CreditLedger, input: {
  issueNumber: number; userId: number; login: string; videoId: string; transcriptHash: string
  referenceDate: string; durationSeconds: number; textCharacters: number; fileBytes: number; now: number
}) {
  if (!Number.isSafeInteger(input.issueNumber) || input.issueNumber < 1 || !Number.isSafeInteger(input.userId) || input.userId < 1 || !Number.isSafeInteger(input.now) || input.now < 0) throw new Error('Identidade ou horário inválido para débito.')
  const estimate = estimateCredits(input)
  const userId = String(input.userId)
  const requestId = String(input.issueNumber)
  const existing = ledger.requests[requestId]
  if (existing) {
    if (existing.userId !== userId || existing.videoId !== input.videoId || existing.transcriptHash !== input.transcriptHash || existing.referenceDate !== input.referenceDate || existing.durationSeconds !== input.durationSeconds) throw new Error('O pedido mudou após o débito. Confira a reserva existente antes de continuar.')
    return { ledger, changed: false, receipt: existing }
  }
  const duplicate = Object.entries(ledger.requests).find(([, charge]) => charge.videoId === input.videoId)
  if (duplicate) throw new Error(`Este vídeo já tem processamento reservado na issue #${duplicate[0]}. Acompanhe o pedido existente, sem novo débito.`)
  const prior = ledger.users[userId]
  const user = prior && input.now < prior.windowStartedAt + creditWindowMs
    ? { ...prior, login: input.login }
    : { login: input.login, windowStartedAt: input.now, spent: 0 }
  if (user.spent + estimate.credits > dailyCredits) throw new Error(`Créditos insuficientes: ${dailyCredits - user.spent} disponíveis; custo ${estimate.credits}. Renovação: ${new Date(user.windowStartedAt + creditWindowMs).toISOString()}.`)
  const receipt = chargeSchema.parse({
    userId, videoId: input.videoId, transcriptHash: input.transcriptHash, referenceDate: input.referenceDate,
    durationSeconds: input.durationSeconds, textCharacters: input.textCharacters, fileBytes: input.fileBytes,
    credits: estimate.credits, chargedAt: input.now, policy: creditPolicyVersion,
  })
  return {
    changed: true, receipt,
    ledger: ledgerSchema.parse({ ...ledger, users: { ...ledger.users, [userId]: { ...user, spent: user.spent + estimate.credits } }, requests: { ...ledger.requests, [requestId]: receipt } }),
  }
}
