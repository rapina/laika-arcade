const DESIGN_W = 390
const DESIGN_H = 844

async function frame(runner) {
  const box = await runner.locator('canvas').last().boundingBox()
  if (!box) throw new Error('RIPPLES canvas has no layout box')
  const scale = Math.min(box.width / DESIGN_W, box.height / DESIGN_H)
  return {
    scale,
    ox: box.x + (box.width - DESIGN_W * scale) / 2,
    oy: box.y + (box.height - DESIGN_H * scale) / 2,
  }
}

async function flick(runner, page) {
  const f = await frame(runner)
  const start = [f.ox + 195 * f.scale, f.oy + 776 * f.scale]
  const end = [f.ox + 195 * f.scale, f.oy + 168 * f.scale]
  await page.mouse.move(...start)
  await page.mouse.down()
  await page.mouse.move(...end, { steps: 9 })
  await page.mouse.up()
}

export default {
  viewport: { width: 390, height: 844 },
  timeoutMs: 120_000,

  async waitForReady({ runner }) {
    await runner.waitForSelector('canvas', { timeout: 30_000 })
    await runner.waitForFunction(() => Boolean(globalThis.__gameState?.webgl), undefined, { timeout: 30_000 })
  },

  async assertLocale({ runner }, locale) {
    await runner.waitForFunction((expected) => globalThis.__gameState?.locale === expected, locale, { timeout: 5_000 })
  },

  async start({ runner, page }) { await flick(runner, page) },
  readState({ runner }) { return runner.evaluate(() => globalThis.__gameState ?? null) },
  hasProgressed(state) { return Number(state?.stone ?? 0) > 0 },
  progressValue(state) { return Number(state?.stone ?? 0) },
  pauseToken(state) { return [state?.stone, state?.misses, state?.score, state?.over] },
  isPaused(state) { return state?.paused === true },
  isMuted(state) { return state?.muted === true },

  async step({ runner, page, delay }, state) {
    if (!state?.over) await flick(runner, page)
    await delay(140)
  },

  isFinished(state) { return state?.over === true },
  shouldCapture(state) { return Number(state?.stone ?? 0) >= 2 && !state?.over },
  screenshotLocator({ runner }) { return runner.locator('canvas').last() },

  assertPortalResult(_context, { score, eventSequence }) {
    if (!score || score === '--' || !Number.isSafeInteger(eventSequence) || eventSequence < 1) {
      throw new Error(`RIPPLES portal result mismatch: ${score}`)
    }
  },

  assertFinal(state) {
    if (!state?.over) throw new Error('RIPPLES autoplay did not reach a terminal result')
    if (Number(state?.stone ?? 0) < 3) throw new Error('RIPPLES ended before several judged stones')
  },
}
