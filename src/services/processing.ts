import { z } from 'zod'
import { creditWindowMs, dailyCredits } from '../lib/analysis-credits'

const rawRepository = 'https://raw.githubusercontent.com/Mreaggle/fatooupapo/refs/heads'
const progressSchema = z.object({
  phase: z.enum(['inventory', 'checking', 'completed']),
  nextWindow: z.number().int().nonnegative(), totalWindows: z.number().int().positive(),
  inventory: z.array(z.unknown()), claims: z.array(z.unknown()),
}).refine((state) => state.nextWindow <= state.totalWindows && state.claims.length <= state.inventory.length)
const noticeSchema = z.object({ interrupted: z.boolean(), message: z.string(), runUrl: z.url().refine((value) => value.startsWith('https://github.com/Mreaggle/fatooupapo/actions/runs/')) })

export async function readProcessingProgress(videoId: string, issueNumber: string, signal: AbortSignal) {
  if (!/^[\w-]{11}$/.test(videoId) || !/^[1-9]\d{0,8}$/.test(issueNumber)) throw new Error('Número de pedido inválido.')
  const prefix = `${rawRepository}/analysis/issue-${issueNumber}/drafts/${videoId}`
  const response = await fetch(`${prefix}/state.json`, { signal })
  const status = await fetch(`${prefix}/status.json`, { signal })
  const notice = status.ok ? noticeSchema.safeParse(await status.json()) : null
  const notification = notice?.success ? notice.data : null
  if (response.status === 404) return notification ? { phase: 'inventory' as const, nextWindow: 0, totalWindows: 0, inventory: [], claims: [], notice: notification } : null
  if (!response.ok) throw new Error('Não foi possível acessar o progresso. Tente novamente mais tarde.')
  return { ...progressSchema.parse(await response.json()), notice: notification }
}

export async function readCreditBalance(login: string, signal: AbortSignal) {
  if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(login)) throw new Error('Informe um nome de usuário válido do GitHub.')
  const response = await fetch(`${rawRepository}/analysis/credits/analysis-quota.json`, { signal })
  if (response.status === 404) return { remaining: dailyCredits, resetsAt: null }
  if (!response.ok) throw new Error('Saldo indisponível. A cota será conferida no processamento.')
  const ledger = z.object({ users: z.record(z.string(), z.object({ login: z.string(), spent: z.number().int().min(0).max(100), windowStartedAt: z.number().int().nonnegative() })) }).parse(await response.json())
  const user = Object.values(ledger.users).find((entry) => entry.login.toLowerCase() === login.toLowerCase())
  if (!user || Date.now() >= user.windowStartedAt + creditWindowMs) return { remaining: dailyCredits, resetsAt: null }
  return { remaining: dailyCredits - user.spent, resetsAt: new Date(user.windowStartedAt + creditWindowMs).toISOString() }
}
