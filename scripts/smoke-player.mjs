import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const require = createRequire(import.meta.url)
const { chromium } = require(resolve(
  import.meta.dirname,
  '../../games/2026/2026-07-15-stitch/node_modules/playwright-core',
))

const baseUrl = process.env.ARCADE_URL || 'http://127.0.0.1:4173'
const qaDir = resolve(import.meta.dirname, '../qa')
mkdirSync(qaDir, { recursive: true })

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--disable-gpu', '--no-sandbox'],
})
const page = await browser.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 })
const consoleErrors = []
const pageErrors = []
const failedRequests = []

page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text())
})
page.on('pageerror', (error) => pageErrors.push(String(error)))
page.on('requestfailed', (request) => failedRequests.push(`${request.url()} ${request.failure()?.errorText ?? ''}`))

try {
  await page.goto(`${baseUrl}/play/stitch?lang=ko`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await page.waitForFunction(() => {
    const frame = document.querySelector('#game-frame')
    return frame && !frame.hasAttribute('data-unavailable')
  })

  let runner = null
  for (let attempt = 0; attempt < 100 && !runner; attempt += 1) {
    runner = page.frames().find((frame) => frame.url().includes('/runner/v1/index.html')) ?? null
    if (!runner) await delay(50)
  }
  if (!runner) throw new Error('runner iframe did not connect')

  try {
    await runner.waitForSelector('.title-btn', { timeout: 30_000 })
  } catch (error) {
    process.stderr.write(`${JSON.stringify({
      frames: page.frames().map((frame) => frame.url()),
      runnerText: await runner.locator('body').innerText().catch(() => ''),
      notice: await page.locator('#notice-copy').textContent().catch(() => ''),
      consoleErrors,
      pageErrors,
      failedRequests,
    }, null, 2)}\n`)
    throw error
  }
  await page.waitForFunction(() => !document.querySelector('#pause-button')?.disabled, undefined, { timeout: 30_000 })
  const localeControlHidden = await runner.locator('.locale-btn').isHidden()
  if ((await runner.locator('.title-btn').textContent())?.trim() !== '실을 잇기') {
    throw new Error('Korean locale did not reach the game')
  }
  await page.locator('.player-language [data-locale="en"]').click()
  await page.waitForFunction(() => document.documentElement.lang === 'en')
  await runner.waitForFunction(() => document.querySelector('.title-btn')?.textContent?.trim() === 'THREAD THE NEEDLE')
  if ((await page.locator('#game-title').textContent())?.trim() !== 'STITCH') {
    throw new Error('English locale did not update the portal')
  }
  const runnerUrlBeforeLocaleChange = runner.url()
  await runner.locator('.title-btn').click()
  await runner.waitForSelector('canvas', { timeout: 30_000 })

  let pausedVerified = false
  let languageVerified = false
  let screenshotTaken = false
  let lastLogged = -1
  const startedAt = Date.now()
  let finalState = null

  while (Date.now() - startedAt < 90_000) {
    const state = await runner.evaluate(() => globalThis.__gameState ?? null)
    if (!state) {
      await delay(10)
      continue
    }
    finalState = state

    if (!languageVerified && state.stitches >= 1 && state.phase === 'travel') {
      const stitchesBeforeLocaleChange = state.stitches
      await page.locator('.player-language [data-locale="ko"]').click()
      await runner.waitForFunction(() => document.querySelector('.game-exit-btn')?.textContent?.trim() === '나가기')
      const afterLocaleChange = await runner.evaluate(() => globalThis.__gameState ?? null)
      if (runner.url() !== runnerUrlBeforeLocaleChange) throw new Error('runner reloaded during locale change')
      if ((afterLocaleChange?.stitches ?? -1) < stitchesBeforeLocaleChange) throw new Error('game reset during locale change')
      languageVerified = true
    }

    if (state.stitches !== lastLogged && state.stitches % 8 === 0) {
      lastLogged = state.stitches
      process.stdout.write(`stitches=${state.stitches} accuracy=${state.accuracy}\n`)
    }

    if (!pausedVerified && state.stitches >= 1 && state.phase === 'travel') {
      await page.locator('#pause-button').evaluate((button) => button.click())
      await delay(120)
      const paused = await runner.evaluate(() => globalThis.__gameState ?? null)
      if (!paused?.paused) throw new Error('host pause did not reach the game')
      const heldProgress = paused.progress
      await delay(140)
      const held = await runner.evaluate(() => globalThis.__gameState ?? null)
      if (held.progress !== heldProgress) throw new Error('simulation advanced while paused')
      await page.locator('#pause-button').evaluate((button) => button.click())
      pausedVerified = true
    }

    if (!screenshotTaken && state.stitches >= 20 && state.phase === 'travel') {
      await runner.locator('.mobile-frame-inner').screenshot({ path: resolve(qaDir, 'stitch-gameplay.png') })
      screenshotTaken = true
    }

    if (state.over) break
    if (
      state.phase === 'travel' &&
      state.progress >= state.targetProgress - 0.035 &&
      state.progress <= state.targetProgress + 0.04
    ) {
      await runner.locator('canvas').click({ position: { x: 195, y: 422 }, force: true })
      await delay(55)
    } else {
      await delay(7)
    }
  }

  await page.waitForFunction(
    () => ['완성', '실이 끊어졌어요', 'COMPLETE', 'THREAD BROKE'].includes(document.querySelector('#connection-status')?.textContent ?? ''),
    undefined,
    { timeout: 10_000 },
  )
  await page.screenshot({ path: resolve(qaDir, 'stitch-result.png'), fullPage: true })

  const terminalStatus = await page.locator('#connection-status').textContent()
  const terminalScore = await page.locator('#score-value').textContent()
  await page.locator('#mute-button').click()
  const muteVerified = await page.locator('#mute-button').getAttribute('aria-pressed') === 'true'
  await page.locator('#mute-button').click()
  await page.locator('#restart-button').click()
  await runner.waitForFunction(() => {
    const state = globalThis.__gameState
    return state?.phase === 'travel' && state?.stitches === 0 && !state?.over
  }, undefined, { timeout: 10_000 })
  const restartVerified = true

  const summary = {
    finalState,
    languageVerified,
    localeControlHidden,
    pausedVerified,
    screenshotTaken,
    muteVerified,
    restartVerified,
    portalStatus: terminalStatus,
    portalScore: terminalScore,
    consoleErrors,
    pageErrors,
    failedRequests,
  }
  writeFileSync(resolve(qaDir, 'smoke-result.json'), `${JSON.stringify(summary, null, 2)}\n`)
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`)

  if (!finalState?.over || finalState.stitches !== 48) throw new Error('autoplay did not finish all 48 stitches')
  if (!languageVerified || !localeControlHidden) throw new Error('locale contract did not reach the game')
  if (!muteVerified || !restartVerified) throw new Error('host controls did not reach the game')
  if (consoleErrors.length || pageErrors.length || failedRequests.length) throw new Error('browser errors were recorded')
} finally {
  await browser.close()
}
