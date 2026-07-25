async function breakWeld(runner) {
  const canvas = runner.locator('canvas')
  const box = await canvas.boundingBox()
  if (!box) throw new Error('FLUX FORGE canvas has no layout box')
  const x = box.x + box.width * 0.12
  const y = box.y + box.height * 0.24
  await runner.page().mouse.move(x, y)
  await runner.page().mouse.down()
  await runner.page().mouse.move(x, y + box.height * 0.55, { steps: 4 })
  await runner.page().mouse.up()
}

export default {
  viewport: { width: 390, height: 844 },
  localeControlSelector: '[data-action="lang"]',
  timeoutMs: 90_000,

  async waitForReady({ runner }) {
    await runner.waitForSelector('canvas', { timeout: 30_000 })
    await runner.waitForFunction(() => Boolean(globalThis.__gameState))
  },

  async assertLocale({ runner }, locale) {
    const state = await runner.evaluate(() => globalThis.__gameState ?? null)
    if (!state) throw new Error(`FLUX FORGE ${locale} state is unavailable`)
  },

  async start({ runner }) { await breakWeld(runner) },
  readState({ runner }) { return runner.evaluate(() => globalThis.__gameState ?? null) },
  hasProgressed(state) { return Number(state?.failures ?? 0) >= 1 },
  progressValue(state) { return Number(state?.failures ?? 0) + Number(state?.repaired ?? 0) },
  pauseToken(state) { return [state?.round, state?.failures, state?.over] },
  isPaused(state) { return state?.paused === true },
  isMuted(state) { return state?.muted === true },
  async step({ runner, delay }, state) {
    if (!state?.over) await breakWeld(runner)
    await delay(1200)
  },
  isFinished(state) { return state?.over === true },
  shouldCapture(state) { return Number(state?.failures ?? 0) >= 1 && !state?.over },
  screenshotLocator({ runner }) { return runner.locator('canvas') },

  assertPortalResult(_context, { score, eventSequence }) {
    if (!score || score === '--' || !Number.isSafeInteger(eventSequence) || eventSequence < 1) {
      throw new Error(`FLUX FORGE portal result mismatch: ${score}`)
    }
  },

  assertFinal(state) {
    if (!state?.over || Number(state?.failures ?? 0) !== 2) {
      throw new Error('FLUX FORGE autoplay did not reach the two-break terminal result')
    }
  },
}
