import { z } from 'zod'

export const budgetSchema = z.object({ version: z.literal(1), days: z.record(z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.array(z.string().regex(/^\d+-\d+$/)).max(2)) })

export function reserveBudget(value: z.infer<typeof budgetSchema>, attempt: string, limit: number, now: Date) {
  if (!/^\d+-\d+$/.test(attempt) || !Number.isInteger(limit) || limit < 1 || limit > 2) throw new Error('Orçamento inválido.')
  const today = now.toISOString().slice(0, 10)
  const attempts = value.days[today] ?? []
  const retryAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)).toISOString()
  if (attempts.includes(attempt) || attempts.length >= limit) return { allowed: false, retryAt, ledger: value }
  return { allowed: true, retryAt, ledger: budgetSchema.parse({ version: 1,
    days: { ...Object.fromEntries(Object.entries(value.days).filter(([date]) => Date.parse(date) >= now.getTime() - 30 * 86400000)), [today]: [...attempts, attempt] } }) }
}
