async function logicalPoint(runner, lx, ly) {
  const canvas = runner.locator('canvas')
  const box = await canvas.boundingBox()
  if (!box) throw new Error('DRIZZLE canvas has no layout box')
  const scale = Math.min(box.width / 390, box.height / 780)
  const ox = box.x + (box.width - 390 * scale) / 2
  const oy = box.y + (box.height - 780 * scale) / 2
  return [ox + lx * scale, oy + ly * scale]
}

// Hold the pointer at the lit ring's x so the sagging thread tip settles into
// the ring and fills its gauge. Aiming uses the absolute held x, so a fresh
// press directly at the target is a legal human gesture.
async function steerTowardRing(runner, page, state) {
  const targetX = state?.ringX ?? 195
  const [sx, sy] = await logicalPoint(runner, targetX, 560)
  await page.mouse.move(sx, sy)
  await page.mouse.down()
  await page.mouse.move(sx + 1, sy)
  await page.mouse.up()
}

export default {
  viewport: { width: 390, height: 844 },
  timeoutMs: 150_000,

  async waitForReady({ runner }) {
    await runner.waitForSelector('canvas', { timeout: 30_000 })
    await runner.waitForFunction(() => Boolean(globalThis.__gameState), undefined, { timeout: 30_000 })
  },

  async assertLocale({ runner }, locale) {
    // The locale event crosses the host bridge asynchronously; poll briefly.
    let state = null
    for (let attempt = 0; attempt < 40; attempt += 1) {
      state = await runner.evaluate(() => globalThis.__gameState ?? null)
      if (state?.locale === locale) return
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    if (!state) throw new Error(`DRIZZLE ${locale} state is unavailable`)
    throw new Error(`DRIZZLE locale mismatch: expected ${locale}, got ${state.locale}`)
  },

  async start({ runner, page }) {
    const state = await runner.evaluate(() => globalThis.__gameState ?? null)
    await steerTowardRing(runner, page, state)
  },

  readState({ runner }) { return runner.evaluate(() => globalThis.__gameState ?? null) },
  hasProgressed(state) { return Number(state?.cured ?? 0) + Number(state?.fails ?? 0) >= 1 },
  progressValue(state) { return Number(state?.cured ?? 0) + Number(state?.fails ?? 0) },
  pauseToken(state) { return [state?.ring, state?.cured, state?.fails, state?.over] },
  isPaused(state) { return state?.paused === true },
  isMuted(state) { return state?.muted === true },

  async step({ runner, page, delay }, state) {
    if (!state?.over) await steerTowardRing(runner, page, state)
    await delay(250)
  },

  isFinished(state) { return state?.over === true },
  shouldCapture(state) { return Number(state?.cured ?? 0) >= 2 && !state?.over },
  screenshotLocator({ runner }) { return runner.locator('canvas') },

  assertPortalResult(_context, { score, eventSequence }) {
    if (!score || score === '--' || !Number.isSafeInteger(eventSequence) || eventSequence < 1) {
      throw new Error(`DRIZZLE portal result mismatch: ${score}`)
    }
  },

  assertFinal(state) {
    if (!state?.over || Number(state?.cured ?? 0) < 1 || !['complete', 'burnout'].includes(String(state?.endReason))) {
      throw new Error('DRIZZLE autoplay did not reach a judged terminal result')
    }
  },
}
