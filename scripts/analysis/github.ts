export const repository = process.env.GITHUB_REPOSITORY ?? ''

export async function github(path: string, options: RequestInit = {}) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository) || !process.env.GH_TOKEN) throw new Error('Execute esta operação no GitHub Actions.')
  const response = await fetch(`https://api.github.com/repos/${repository}/${path}`, {
    ...options, redirect: 'error', signal: AbortSignal.timeout(20_000),
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${process.env.GH_TOKEN}`, 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
  })
  if (!response.ok && response.status !== 404) throw new Error(`GitHub indisponível (HTTP ${response.status}). Nenhuma nova chamada de IA será feita.`)
  return response
}

export async function readContent(path: string, branch: string): Promise<{ value: unknown; sha: string } | null> {
  const response = await github(`contents/${path}?ref=${encodeURIComponent(branch)}`)
  if (response.status === 404) return null
  const file = await response.json() as { content: string; sha: string }
  return { value: JSON.parse(Buffer.from(file.content, 'base64').toString('utf8')), sha: file.sha }
}

export async function writeContent(path: string, branch: string, value: unknown, message: string, sha?: string) {
  if ((await github(`git/ref/heads/${encodeURIComponent(branch)}`)).status === 404) {
    const created = await github('git/refs', { method: 'POST', body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: process.env.GITHUB_SHA }) })
    if (!created.ok) throw new Error('Falha ao criar o registro persistente. Nenhuma chamada de IA será feita.')
  }
  const saved = await github(`contents/${path}`, { method: 'PUT', body: JSON.stringify({ branch, message,
    content: Buffer.from(`${JSON.stringify(value, null, 2)}\n`).toString('base64'), ...(sha ? { sha } : {}) }) })
  if (!saved.ok) throw new Error('Falha ao persistir o orçamento. Nenhuma chamada de IA será feita.')
}
