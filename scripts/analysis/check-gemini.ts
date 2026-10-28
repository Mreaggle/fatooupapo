import { z } from 'zod'
import { GeminiClient } from './gemini.ts'
import { groundedSources } from './pipeline.ts'

// Runs only through a manually dispatched workflow. No reports, quota debits or
// provider response bodies are published by this connectivity check.
const client = new GeminiClient({
  key: process.env.GEMINI_API_KEY ?? '',
  model: process.env.GEMINI_MODEL ?? '',
  maxCalls: 2,
})
const structured = await client.structured('Responda com o status ok.', z.object({ status: z.enum(['ok']) }))
console.log(`Saída JSON estruturada validada. Modelo: ${structured.raw.modelVersion ?? client.model}.`)
const research = await client.generate('Use Google Search para encontrar a página oficial do IBGE sobre o Censo Demográfico 2022. Responda brevemente em português e cite a fonte oficial encontrada.', { search: true })
const sources = groundedSources(research)
if (!sources.length) throw new Error('A busca não retornou fontes HTTPS associadas à resposta. Não habilite a busca automática antes de conferir a disponibilidade na conta.')
console.log(`Busca validada: ${sources.length} fonte(s) HTTPS associada(s) à resposta; ${client.calls} chamadas no total. Nenhum relatório foi publicado.`)
