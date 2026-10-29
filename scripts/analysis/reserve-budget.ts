import { appendFile, writeFile } from 'node:fs/promises'
import { readContent, writeContent } from './github.ts'
import { budgetSchema, reserveBudget } from './budget.ts'
import { boundedInteger } from './gemini.ts'

if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL) throw new Error('Configure GEMINI_API_KEY e GEMINI_MODEL antes de iniciar o processamento.')
const branch = 'analysis/credits'
const path = 'analysis-run-budget.json'
const file = await readContent(path, branch)
const value = budgetSchema.parse(file?.value ?? { version: 1, days: {} })
const result = reserveBudget(value, `${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT}`, boundedInteger(process.env.ANALYSIS_DAILY_RUN_LIMIT, 2, 2), new Date())
if (result.allowed) await writeContent(path, branch, result.ledger, 'chore: reservar orçamento diário de processamento', file?.sha)
else await writeFile('.analysis-work/queue-notice.json', JSON.stringify({ kind: 'queued', message: 'Pedido na fila. O processamento continua automaticamente quando houver cota disponível.', retryAt: result.retryAt }))
if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `allowed=${result.allowed}\n`)
console.log(result.allowed ? 'Orçamento de processamento reservado.' : 'Pedido preservado na fila para a próxima janela de processamento.')
