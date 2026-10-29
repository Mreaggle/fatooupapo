// @vitest-environment node
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, it, vi } from 'vitest'

const paths: string[] = []
afterEach(async () => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); await Promise.all(paths.splice(0).map((path) => rm(path, { recursive: true, force: true }))); vi.resetModules() })
async function setup(eventName = 'schedule') {
  const path = await mkdtemp(join(tmpdir(), 'fato-queue-'))
  paths.push(path)
  await writeFile(join(path, 'event.json'), JSON.stringify({ repository: { default_branch: 'main' } }))
  vi.stubEnv('GITHUB_EVENT_PATH', join(path, 'event.json'))
  vi.stubEnv('GITHUB_EVENT_NAME', eventName)
  vi.stubEnv('GITHUB_REPOSITORY', 'Mreaggle/fatooupapo')
  vi.stubEnv('GH_TOKEN', 'test-token')
  vi.stubEnv('GITHUB_OUTPUT', join(path, 'outputs'))
  return path
}
const issue = (number: number, id = '06WU-H3jICE') => ({ number, title: `[Análise] ${id}`, state: 'open', body: `### Vídeo do YouTube\n\nhttps://youtu.be/${id}\n\n### Duração em minutos\n\n180\n\n### Data de referência\n\n2026-10-21\n\n### Publicação e uso do material\n\n- [x] Entendo que o pedido é público e que os materiais fornecidos precisam estar autorizados.`, user: { id: 10, login: 'test-user' } })
const content = (value: unknown) => Response.json({ content: Buffer.from(JSON.stringify(value)).toString('base64'), sha: 'abc' })

describe('seleção automática e autorização editorial', () => {
  it('retoma um pedido antigo sem exigir um novo clique manual no workflow', async () => {
    const directory = await setup()
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (url) => String(url).includes('/issues?') ? Response.json([issue(2)]) : new Response('', { status: 404 }))
    vi.stubGlobal('fetch', fetcher)
    const { selectRequest } = await import('./select-request.ts')
    await selectRequest(directory)
    expect(JSON.parse(await readFile(join(directory, 'issue.json'), 'utf8')).number).toBe(2)
    expect(await readFile(join(directory, 'outputs'), 'utf8')).toContain('ready=true\nissue_number=2\noperation=process')
    expect(fetcher.mock.calls.every(([, init]) => !init?.method)).toBe(true)
  })
  it('pula recusas e pedidos em revisão e não deixa um pedido pausado travar o seguinte', async () => {
    const directory = await setup()
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockImplementation(async (url) => {
      const value = String(url)
      if (value.includes('/issues?')) return Response.json([issue(2), issue(3, 'RugVB17uRVM'), issue(4, '6BBZWwq2juE'), issue(5, 'q4T7plSBdJE')])
      if (value.includes('issue-2')) return content({ kind: 'rejected' })
      if (value.includes('issue-3')) return content({ kind: 'review' })
      if (value.includes('issue-4')) return content({ kind: 'queued', retryAt: '2099-01-01T00:00:00Z' })
      return new Response('', { status: 404 })
    }))
    const { selectRequest } = await import('./select-request.ts')
    await selectRequest(directory)
    expect(JSON.parse(await readFile(join(directory, 'issue.json'), 'utf8')).number).toBe(5)
  })
  it('recusa publicação manual por conta sem escrita, antes de ler o material', async () => {
    const directory = await setup('workflow_dispatch')
    vi.stubEnv('GITHUB_ACTOR', 'visitor'); vi.stubEnv('OPERATION', 'publish-reviewed'); vi.stubEnv('REVIEW_CONFIRMED', 'true')
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ permission: 'read' }))
    vi.stubGlobal('fetch', fetcher)
    const { selectRequest } = await import('./select-request.ts')
    await expect(selectRequest(directory)).rejects.toThrow(/permissão de escrita/)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})
