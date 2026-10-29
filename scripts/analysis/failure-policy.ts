export function failurePolicy(message: string, now: number) {
  if (/429|Cota .*excedida|Créditos insuficientes/.test(message)) return { kind: 'quota', retryAt: new Date(now + 86400000).toISOString() }
  if (/HTTP 50[0234]|Falha de rede ou timeout da IA/.test(message)) return { kind: 'transient', retryAt: new Date(now + 6 * 3600000).toISOString() }
  return { kind: 'failed' }
}
