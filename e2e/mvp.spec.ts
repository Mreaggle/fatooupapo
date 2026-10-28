import { test, expect } from '@playwright/test'

test('home minimalista, consulta por ID, evidências e link compartilhado', async ({ page }, testInfo) => {
  const failures: string[] = []
  const apiRequests: string[] = []
  page.on('pageerror', (error) => failures.push(error.message))
  page.on('request', (request) => { if (request.method() === 'POST') apiRequests.push(request.url()) })
  await page.goto('./')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Você assiste enós checamos.')
  await expect(page.getByRole('heading')).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Verificar fatos' })).toBeDisabled()
  await page.screenshot({ path: testInfo.outputPath('home.png'), fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

  await page.getByLabel('Link do vídeo do YouTube').fill('https://youtu.be/q4T7plSBdJE?si=teste')
  await page.getByRole('button', { name: 'Verificar fatos' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('KIM KATAGUIRI X JONES MANOEL')
  await expect(page.getByText('48 afirmações analisadas')).toBeVisible()
  await expect(page).toHaveURL(/\?v=q4T7plSBdJE$/)
  await expect(page.getByRole('article')).toHaveCount(48)
  expect(apiRequests).toEqual([])
  await page.screenshot({ path: testInfo.outputPath('relatorio-inicio.png'), fullPage: false })
  await page.getByRole('article').first().locator('summary').click()
  await expect(page.getByRole('article').first().getByRole('link', { name: /tramitação e votação/i })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('relatorio.png'), fullPage: false })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

  await page.getByLabel('Buscar afirmações').fill('agentes')
  await expect(page.getByRole('article')).toHaveCount(2)
  await page.reload()
  await expect(page.getByText('48 afirmações analisadas')).toBeVisible()
  const transcript = await page.request.get('./transcripts/q4T7plSBdJE.md')
  expect(transcript.ok()).toBe(true)
  expect(await transcript.text()).toContain('bloco 5224')

  await page.getByRole('button', { name: 'Nova consulta' }).click()
  await page.getByRole('button', { name: 'Metodologia', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: 'Fechar', exact: true }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  expect(failures).toEqual([])
})

test('URL inválida e vídeo fora do acervo têm mensagens claras', async ({ page }) => {
  await page.goto('./')
  const input = page.getByLabel('Link do vídeo do YouTube')
  await input.fill('https://example.com/video')
  await page.getByRole('button', { name: 'Verificar fatos' }).click()
  await expect(page.getByRole('alert')).toContainText('Insira um link válido')
  await input.fill('https://youtube.com/watch?v=dQw4w9WgXcQ')
  await page.getByRole('button', { name: 'Verificar fatos' }).click()
  await expect(page.getByRole('alert')).toContainText('Este vídeo ainda não está no acervo')
})
