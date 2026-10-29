import { writeFile } from 'node:fs/promises'
import { failurePolicy } from './failure-policy.ts'

const script = process.argv[2]
if (!['prepare', 'verify-video', 'charge-credits', 'run'].includes(script)) throw new Error('Operação inválida.')
try { await import(`./${script}.ts`) }
catch (error) {
  const message = error instanceof Error ? error.message : ''
  await writeFile('.analysis-work/failure.json', JSON.stringify(failurePolicy(message, Date.now())))
  // Provider wrappers expose only sanitized errors; do not serialize error objects.
  console.error(message || 'Não foi possível concluir esta etapa.')
  process.exitCode = 1
}
