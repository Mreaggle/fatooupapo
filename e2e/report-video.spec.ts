import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import snapshots from '../public/snapshots/index.json' with { type: 'json' }
import manifest from '../reviews/batch-2026-10-30/manifest.json' with { type: 'json' }
import { verdictLabel } from '../src/lib/verdict-label'
import type { AnalysisReport, Verdict } from '../src/types'

// Exercise the IFrame API contract without depending on external video availability.
async function mockVideo(page: Page) {
  await page.route('https://www.youtube.com/iframe_api', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: `
      window.YT = { Player: class {
        constructor(target, options) {
          this.seconds = 0;
          this.options = options;
          this.iframe = document.createElement('iframe');
          this.iframe.srcdoc = '<html style="background:#080808;color:#aaa;font:14px sans-serif"><body style="display:grid;place-items:center;height:90vh;margin:0">Player do YouTube simulado para teste</body></html>';
          target.replaceWith(this.iframe);
          this.onTime = (event) => { this.seconds = event.detail; };
          window.addEventListener('test:video-time', this.onTime);
          queueMicrotask(() => options.events.onReady({ target: this }));
        }
        getCurrentTime() { return this.seconds; }
        getIframe() { return this.iframe; }
        seekTo(seconds) {
          this.seconds = seconds;
          this.options.events.onStateChange({ target: this, data: 2 });
        }
        destroy() {
          window.removeEventListener('test:video-time', this.onTime);
          this.iframe.remove();
        }
      }};
      window.onYouTubeIframeAPIReady();
    `,
  }))
}

test.beforeEach(async ({ page }) => {
  await page.route('https://www.googletagmanager.com/gtag/js?**', (route) => route.fulfill({ contentType: 'application/javascript', body: '' }))
  await page.route('https://api.github.com/repos/Mreaggle/fatooupapo/issues?**', (route) => route.fulfill({ contentType: 'application/json', body: '[]' }))
  await mockVideo(page)
})

test('logo e botão de topo continuam acessíveis durante a leitura', async ({ page }, testInfo) => {
  await page.goto('./?v=q4T7plSBdJE')
  await expect(page.getByRole('article')).toHaveCount(48)
  const logo = page.getByRole('button', { name: 'Fato ou Papo — início' })
  const backToTop = page.getByRole('button', { name: 'Voltar ao topo' })
  await page.getByRole('article').nth(12).scrollIntoViewIfNeeded()
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(1000)
  await expect(logo).toBeInViewport()
  await expect(backToTop).toBeInViewport()
  const logoBounds = (await logo.boundingBox())!
  const topBounds = (await backToTop.boundingBox())!
  expect(logoBounds.x).toBeLessThanOrEqual(32)
  expect(logoBounds.y).toBeLessThan(80)
  expect(topBounds.x).toBeGreaterThan(page.viewportSize()!.width - 100)
  expect(topBounds.y).toBeGreaterThan(page.viewportSize()!.height - 100)
  await page.screenshot({ path: testInfo.outputPath('navegacao-fixa.png') })
  await backToTop.click()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
  await page.getByRole('article').nth(12).scrollIntoViewIfNeeded()
  await logo.click()
  await expect(page.getByLabel('Link do vídeo do YouTube')).toBeVisible()
  await expect(page).not.toHaveURL(/\?v=/)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
})

test('vídeo sincroniza as checagens e mantém a análise completa com busca e fontes', async ({ page }, testInfo) => {
  const report = snapshots.reports.q4T7plSBdJE
  const [first, second] = report.claims
  await page.goto('./?v=q4T7plSBdJE')
  const synced = page.getByRole('region', { name: 'Assista com as checagens' })
  await expect(synced.getByText('Sincronizado com o vídeo')).toBeVisible()
  await expect(page.getByRole('article')).toHaveCount(48)
  await synced.getByRole('button', { name: 'Ir à primeira checagem' }).click()
  await expect(synced.getByRole('heading', { name: first.title })).toBeVisible()
  await expect(synced).toContainText(first.explanation)
  await synced.getByRole('button', { name: 'Próxima checagem' }).click()
  await expect(synced.getByRole('heading', { name: second.title })).toBeVisible()
  await page.evaluate((seconds) => window.dispatchEvent(new CustomEvent('test:video-time', { detail: seconds })), first.timestampSeconds)
  await expect(synced.getByRole('heading', { name: first.title })).toBeVisible()
  await synced.scrollIntoViewIfNeeded()
  await page.screenshot({ path: testInfo.outputPath('video-sincronizado.png') })
  await page.getByLabel('Buscar afirmações').fill('busca-sem-nenhuma-correspondencia')
  await expect(page.getByRole('article')).toHaveCount(0)
  await expect(synced.getByRole('heading', { name: first.title })).toBeAttached()
  await synced.getByRole('link', { name: 'Ver checagem completa e fontes' }).click()
  await expect(page.getByRole('article')).toHaveCount(48)
  await expect(page.getByLabel('Buscar afirmações')).toHaveValue('')
  const fullClaim = page.locator(`article[id="${first.id}"]`)
  await expect(fullClaim).toBeFocused()
  expect((await fullClaim.boundingBox())!.y).toBeGreaterThanOrEqual(80)
  await fullClaim.locator('summary').click()
  await expect(fullClaim.getByRole('link', { name: /tramitação e votação/i })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('galeria dá acesso aos dez novos vídeos e preserva os relatórios anteriores', async ({ page }, testInfo) => {
  await page.goto('./')
  const gallery = page.getByRole('region', { name: 'Debates checados recentemente' })
  await expect(gallery.getByRole('link')).toHaveCount(Object.keys(snapshots.reports).length)
  await expect(page.getByRole('region', { name: 'Debates em destaque' }).getByRole('link')).toHaveCount(6)
  for (const { videoId } of manifest) {
    await expect(gallery.locator(`a[href="?v=${videoId}"]`)).toHaveCount(1)
  }
  await gallery.screenshot({ path: testInfo.outputPath('acervo-completo.png') })
})

test('exporta cards com argumento, conclusão e gauge em todas as classificações, sem transcrição literal', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    const capture = window as typeof window & { cardText: string[] }
    capture.cardText = []
    const draw = CanvasRenderingContext2D.prototype.fillText
    CanvasRenderingContext2D.prototype.fillText = function (...args: Parameters<typeof draw>) {
      capture.cardText.push(args[0])
      return draw.apply(this, args)
    }
  })
  const verdicts: Verdict[] = ['Verdadeiro', 'Majoritariamente verdadeiro', 'Impreciso ou fora de contexto', 'Majoritariamente falso', 'Falso', 'Inconclusivo']
  for (const verdict of verdicts) {
    const report = (Object.values(snapshots.reports) as AnalysisReport[]).find((report) => report.claims.some((claim) => claim.verdict === verdict))!
    const position = report.claims.findIndex((claim) => claim.verdict === verdict)
    const claim = report.claims[position]
    await page.goto(`./?v=${report.video.id}`)
    await page.getByRole('article').nth(position).getByRole('button', { name: 'Compartilhar card', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Compartilhar checagem' })
    const preview = dialog.getByRole('img')
    await expect(preview).toBeVisible()
    await expect.poll(() => preview.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1080)
    expect(await preview.evaluate((img: HTMLImageElement) => img.naturalHeight)).toBeGreaterThan(900)
    const drawn = await page.evaluate(() => (window as typeof window & { cardText: string[] }).cardText.join(' ').replace(/\s+/g, ' '))
    expect(drawn).toContain(claim.title!.replace(/\s+/g, ' '))
    expect(drawn).toContain(claim.explanation.replace(/\s+/g, ' '))
    expect(drawn).toContain(verdictLabel(verdict))
    expect(drawn).toContain('Fato ou Papo')
    expect(drawn).not.toContain(claim.quote.replace(/\s+/g, ' '))
    const downloading = page.waitForEvent('download')
    await dialog.getByRole('link', { name: 'Baixar PNG' }).click()
    const download = await downloading
    const imagePath = testInfo.outputPath(download.suggestedFilename())
    await download.saveAs(imagePath)
    expect((await readFile(imagePath)).subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
    if (verdict === 'Verdadeiro') await page.screenshot({ path: testInfo.outputPath('compartilhar-card.png') })
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
    await expect(page.getByRole('article').nth(position).getByRole('button', { name: 'Compartilhar card', exact: true })).toBeFocused()
  }
})

for (const { videoId } of manifest) {
  test(`nova checagem ${videoId}: íntegra e sincronização`, async ({ page }) => {
    const reports = snapshots.reports as Record<string, (typeof snapshots.reports)['q4T7plSBdJE']>
    const report = reports[videoId]
    await page.goto(`./?v=${videoId}`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(report.video.title)
    await expect(page.getByRole('article')).toHaveCount(report.claims.length)
    const synced = page.getByRole('region', { name: 'Assista com as checagens' })
    await synced.getByRole('button', { name: 'Ir à primeira checagem' }).click()
    await expect(synced.getByRole('heading', { name: report.claims[0].title, exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: /Transcrição \.md/i })).toHaveAttribute('href', new RegExp(`transcripts/${videoId}\\.md`))
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  })
}
