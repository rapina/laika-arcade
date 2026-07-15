import { createRequire } from 'node:module'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'

const slug = process.argv[2]
if (!/^[a-z][a-z0-9-]{0,63}$/.test(slug ?? '')) {
  process.stderr.write('Usage: node scripts/smoke-player.mjs <slug> [driver-module]\n')
  process.exit(1)
}

const arcadeRoot = resolve(import.meta.dirname, '..')
const baseUrl = (process.env.ARCADE_URL || 'http://127.0.0.1:4173').replace(/\/+$/, '')
const protectionSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
const protectionHeaders = protectionSecret
  ? {
      'x-vercel-protection-bypass': protectionSecret,
      'x-vercel-set-bypass-cookie': 'samesitenone',
    }
  : {}
const catalogUrl = new URL('/catalog/games.json', `${baseUrl}/`)
catalogUrl.searchParams.set('smoke', String(Date.now()))
const catalogResponse = await fetch(catalogUrl, {
  cache: 'no-store',
  headers: { Accept: 'application/json', 'Cache-Control': 'no-cache', ...protectionHeaders },
})
if (!catalogResponse.ok) {
  throw new Error(`catalog request failed: ${catalogResponse.status} ${catalogUrl.origin}`)
}
const catalog = await catalogResponse.json()
if (catalog?.schemaVersion !== 2 || !Array.isArray(catalog.games)) {
  throw new Error(`catalog response is invalid: ${catalogUrl.origin}`)
}
const game = catalog.games.find((candidate) => candidate.slug === slug)
if (!game) throw new Error(`${slug}: catalog entry not found`)

const driverPath = process.argv[3]
  ? resolve(process.cwd(), process.argv[3])
  : resolve(import.meta.dirname, 'smoke-drivers', `${slug}.mjs`)
if (!existsSync(driverPath)) throw new Error(`${slug}: smoke driver not found at ${driverPath}`)
const { default: driver } = await import(pathToFileURL(driverPath))

for (const method of [
  'waitForReady',
  'assertLocale',
  'start',
  'readState',
  'hasProgressed',
  'progressValue',
  'pauseToken',
  'isPaused',
  'step',
  'isFinished',
  'shouldCapture',
  'screenshotLocator',
  'waitForRestart',
  'assertFinal',
]) {
  if (typeof driver?.[method] !== 'function') throw new Error(`${slug}: smoke driver is missing ${method}()`)
}

const require = createRequire(import.meta.url)
const playwrightCandidates = [
  process.env.PLAYWRIGHT_PATH,
  process.env.GAME_DIR
    ? resolve(process.env.GAME_DIR, 'node_modules/playwright-core')
    : null,
  game.artifact?.source?.repo
    ? resolve(arcadeRoot, game.artifact.source.repo, 'node_modules/playwright-core')
    : null,
  resolve(arcadeRoot, '../launchpad/node_modules/playwright-core'),
].filter(Boolean)
const playwrightPath = playwrightCandidates.find((candidate) => existsSync(candidate))
if (!playwrightPath) {
  throw new Error(`playwright-core not found; checked ${playwrightCandidates.join(', ')}`)
}
const { chromium } = require(playwrightPath)

const qaDir = resolve(arcadeRoot, 'qa')
mkdirSync(qaDir, { recursive: true })

const browser = await chromium.launch({
  channel: process.env.CHROME_CHANNEL || 'chrome',
  headless: true,
  args: ['--disable-gpu', '--no-sandbox'],
})
const page = await browser.newPage({
  viewport: driver.viewport ?? { width: 430, height: 932 },
  deviceScaleFactor: 1,
  extraHTTPHeaders: protectionHeaders,
})
const consoleErrors = []
const pageErrors = []
const failedRequests = []

page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text())
})
page.on('pageerror', (error) => pageErrors.push(String(error)))
page.on('requestfailed', (request) => failedRequests.push(`${request.url()} ${request.failure()?.errorText ?? ''}`))

const context = { page, runner: null, delay, game, slug, qaDir }

async function waitForRunner() {
  const runnerPath = `/runner/${game.artifact.runnerVersion}/index.html`
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const runner = page.frames().find((frame) => frame.url().includes(runnerPath))
    if (runner) return runner
    await delay(50)
  }
  throw new Error('runner iframe did not connect')
}

async function selectLocale(locale) {
  await page.locator(`.player-language [data-locale="${locale}"]`).click()
  await page.waitForFunction((expected) => document.documentElement.lang === expected, locale)
  const expectedTitle = game.content?.[locale]?.title
  if (expectedTitle) {
    await page.waitForFunction(
      (title) => document.querySelector('#game-title')?.textContent?.trim() === title,
      expectedTitle,
    )
  }
  await driver.assertLocale(context, locale)
}

async function waitForMuteState(expected) {
  if (typeof driver.isMuted !== 'function') return null
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const state = await driver.readState(context)
    if (driver.isMuted(state) === expected) return true
    await delay(50)
  }
  throw new Error(`host mute=${expected} did not reach the game`)
}

async function verifyMuteControl() {
  await page.locator('#mute-button').click()
  if (await page.locator('#mute-button').getAttribute('aria-pressed') !== 'true') {
    throw new Error('portal mute control did not enter the muted state')
  }
  const transportVerified = await waitForMuteState(true)
  await page.locator('#mute-button').click()
  if (await page.locator('#mute-button').getAttribute('aria-pressed') !== 'false') {
    throw new Error('portal mute control did not leave the muted state')
  }
  if (transportVerified) await waitForMuteState(false)
  return transportVerified
}

try {
  await page.goto(`${baseUrl}/play/${encodeURIComponent(slug)}?lang=ko`, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  })
  context.runner = await waitForRunner()

  try {
    await driver.waitForReady(context)
  } catch (error) {
    process.stderr.write(`${JSON.stringify({
      frames: page.frames().map((frame) => frame.url()),
      runnerText: await context.runner.locator('body').innerText().catch(() => ''),
      notice: await page.locator('#notice-copy').textContent().catch(() => ''),
      consoleErrors,
      pageErrors,
      failedRequests,
    }, null, 2)}\n`)
    throw error
  }

  await page.waitForFunction(() => !document.querySelector('#pause-button')?.disabled, undefined, { timeout: 30_000 })
  const localeControls = context.runner.locator(driver.localeControlSelector ?? '.locale-btn')
  const localeControlHidden = await localeControls.count() === 0 || await localeControls.evaluateAll(
    (controls) => controls.every((control) => control.hidden || getComputedStyle(control).display === 'none'),
  )

  await driver.assertLocale(context, 'ko')
  await selectLocale('en')
  const runnerUrlBeforeLocaleChange = context.runner.url()
  await driver.start(context)
  await driver.assertLocale(context, 'en')

  let pausedVerified = false
  let languageVerified = false
  let muteVerified = false
  let muteTransportVerified = null
  let screenshotTaken = false
  const startedAt = Date.now()
  let finalState = null

  while (Date.now() - startedAt < (driver.timeoutMs ?? 90_000)) {
    const state = await driver.readState(context)
    if (!state) {
      await delay(10)
      continue
    }
    finalState = state

    if (!languageVerified && driver.hasProgressed(state)) {
      const progressBefore = driver.progressValue(state)
      await selectLocale('ko')
      let afterLocaleChange = await driver.readState(context)
      for (let attempt = 0; attempt < 100 && driver.progressValue(afterLocaleChange) < progressBefore; attempt += 1) {
        await delay(50)
        afterLocaleChange = await driver.readState(context)
      }
      if (context.runner.url() !== runnerUrlBeforeLocaleChange) throw new Error('runner reloaded during locale change')
      if (driver.progressValue(afterLocaleChange) < progressBefore) throw new Error('game reset during locale change')
      languageVerified = true
    }

    if (!pausedVerified && driver.hasProgressed(state) && !driver.isFinished(state)) {
      await page.locator('#pause-button').evaluate((button) => button.click())
      let paused = null
      for (let attempt = 0; attempt < 100; attempt += 1) {
        paused = await driver.readState(context)
        if (driver.isPaused(paused)) break
        await delay(50)
      }
      if (!driver.isPaused(paused)) throw new Error('host pause did not reach the game')
      const heldToken = JSON.stringify(driver.pauseToken(paused))
      await delay(180)
      const held = await driver.readState(context)
      if (JSON.stringify(driver.pauseToken(held)) !== heldToken) throw new Error('simulation advanced while paused')
      await page.locator('#pause-button').evaluate((button) => button.click())
      pausedVerified = true
    }

    if (!muteVerified && driver.hasProgressed(state) && !driver.isFinished(state)) {
      muteTransportVerified = await verifyMuteControl()
      muteVerified = true
    }

    if (!screenshotTaken && driver.shouldCapture(state)) {
      await driver.screenshotLocator(context).screenshot({ path: resolve(qaDir, `${slug}-gameplay.png`) })
      screenshotTaken = true
    }

    if (driver.isFinished(state)) break
    await driver.step(context, state)
  }

  await driver.assertFinal(finalState)
  await page.waitForFunction(
    () => {
      const sequence = Number(document.body.dataset.runSequence)
      return document.body.dataset.runState === 'ended'
        && Number.isSafeInteger(sequence)
        && sequence > 0
        && document.querySelector('#score-value')?.textContent?.trim() !== '--'
    },
    undefined,
    { timeout: 12_000 },
  )
  if (!screenshotTaken) {
    await driver.screenshotLocator(context).screenshot({ path: resolve(qaDir, `${slug}-gameplay.png`) })
    screenshotTaken = true
  }
  await page.screenshot({ path: resolve(qaDir, `${slug}-result.png`), fullPage: true })

  const terminalStatus = await page.locator('#connection-status').textContent()
  const terminalScore = await page.locator('#score-value').textContent()
  const endedSequence = Number(await page.locator('body').getAttribute('data-run-sequence'))
  if (typeof driver.assertPortalResult === 'function') {
    await driver.assertPortalResult(context, {
      finalState,
      status: terminalStatus?.trim() ?? '',
      score: terminalScore?.trim() ?? '',
      eventSequence: endedSequence,
    })
  }
  await page.locator('#restart-button').click()
  await driver.waitForRestart(context)
  const restartVerified = true

  const summary = {
    slug,
    finalState,
    languageVerified,
    localeControlHidden,
    pausedVerified,
    screenshotTaken,
    muteVerified,
    muteTransportVerified,
    restartVerified,
    endedSequence,
    portalStatus: terminalStatus,
    portalScore: terminalScore,
    consoleErrors,
    pageErrors,
    failedRequests,
  }
  const serialized = `${JSON.stringify(summary, null, 2)}\n`
  writeFileSync(resolve(qaDir, `${slug}-smoke-result.json`), serialized)
  writeFileSync(resolve(qaDir, 'smoke-result.json'), serialized)
  process.stdout.write(serialized)

  if (!languageVerified || !localeControlHidden) throw new Error('locale contract did not reach the game')
  if (!pausedVerified || !muteVerified || !restartVerified) throw new Error('host controls did not reach the game')
  if (consoleErrors.length || pageErrors.length || failedRequests.length) throw new Error('browser errors were recorded')
} finally {
  await browser.close()
}
