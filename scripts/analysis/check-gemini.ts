import { z } from 'zod'
import { GeminiClient } from './gemini.ts'
import { groundedSources } from './pipeline.ts'

// Runs only through a manually dispatched workflow. No reports, quota debits or
// provider response bodies are published by this connectivity check.
const apiKey = process.env.GEMINI_API_KEY ?? ''
if (!apiKey) throw new Error('Configure GEMINI_API_KEY nos Secrets do repositório.')
const catalog = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000', {
  headers: { 'x-goog-api-key': apiKey }, signal: AbortSignal.timeout(20_000),
})
if (!catalog.ok) throw new Error(`Catálogo Gemini indisponível (HTTP ${catalog.status}). Nenhuma inferência foi solicitada.`)
const available = await catalog.json() as { models?: { name?: string; supportedGenerationMethods?: string[] }[] }
const modelNames = (available.models ?? []).filter((model) => model.supportedGenerationMethods?.includes('generateContent'))
  .map((model) => model.name?.replace(/^models\//, '') ?? '').filter((name) => /^gemini-[a-zA-Z0-9._-]+$/.test(name))
console.log(`Modelos com generateContent disponíveis: ${modelNames.join(', ')}.`)
if (!modelNames.includes(process.env.GEMINI_MODEL ?? '')) throw new Error('O GEMINI_MODEL selecionado não está no catálogo disponível. Ajuste a variável antes de solicitar inferência.')
const client = new GeminiClient({
  key: apiKey,
  model: process.env.GEMINI_MODEL ?? '',
  maxCalls: 2,
})
const structured = await client.structured('Responda com o status ok.', z.object({ status: z.enum(['ok']) }))
console.log(`Saída JSON estruturada validada. Modelo: ${structured.raw.modelVersion ?? client.model}.`)
const research = await client.generate('Use Google Search para encontrar a página oficial do IBGE sobre o Censo Demográfico 2022. Responda brevemente em português e cite a fonte oficial encontrada.', { search: true })
const sources = groundedSources(research)
if (!sources.length) throw new Error('A busca não retornou fontes HTTPS associadas à resposta. Não habilite a busca automática antes de conferir a disponibilidade na conta.')
console.log(`Busca validada: ${sources.length} fonte(s) HTTPS associada(s) à resposta; ${client.calls} chamadas no total. Nenhum relatório foi publicado.`)
