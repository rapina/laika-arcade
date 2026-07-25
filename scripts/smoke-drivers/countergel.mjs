let resultConfirmed = false

async function missOnce(runner) {
  const canvas = runner.locator('canvas')
  const box = await canvas.boundingBox()
  if (!box) throw new Error('COUNTERGEL canvas has no layout box')
  const y = box.y + box.height * 0.48
  await runner.page().mouse.move(box.x + box.width * 0.06, y)
  await runner.page().mouse.down()
  await runner.page().mouse.move(box.x + box.width * 0.18, y)
  await runner.page().mouse.up()
}

export default {
  viewport: { width: 390, height: 844 },
  localeControlSelector: '[data-action="lang"]',
  timeoutMs: 45_000,

  async waitForReady({ runner }) {
    await runner.waitForSelector('canvas', { timeout: 30_000 })
    await runner.waitForFunction(() => Boolean(globalThis.__gameState))
  },

  async assertLocale({ runner }, locale) {
    const state = await runner.evaluate(() => globalThis.__gameState ?? null)
    if (!state) throw new Error(`COUNTERGEL ${locale} state is unavailable`)
  },

  async start() {},
  readState({ runner }) { return runner.evaluate(() => globalThis.__gameState ?? null) },
  hasProgressed(state) { return Number(state?.gel ?? 0) >= 1 },
  progressValue(state) { return Number(state?.gel ?? 0) },
  pauseToken(state) { return [state?.gel, state?.y, state?.over] },
  isPaused(state) { return state?.paused === true },
  isMuted(state) { return state?.muted === true },
  async step({ runner, delay }, state) {
    if (state?.over && !resultConfirmed) {
      await delay(700)
      const box = await runner.locator('canvas').boundingBox()
      if (!box) throw new Error('COUNTERGEL result canvas has no layout box')
      await runner.page().mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.84)
      resultConfirmed = true
    } else if (!state?.over && state?.phase === 'falling' && Number(state?.y ?? 0) > 300) {
      await missOnce(runner)
    }
    await delay(100)
  },
  isFinished(state) { return state?.over === true && resultConfirmed },
  shouldCapture(state) { return Number(state?.gel ?? 0) >= 1 && !state?.over },
  screenshotLocator({ runner }) { return runner.locator('canvas') },

  assertPortalResult(_context, { score, eventSequence }) {
    if (!score || score === '--' || !Number.isSafeInteger(eventSequence) || eventSequence < 1) {
      throw new Error(`COUNTERGEL portal result mismatch: ${score}`)
    }
  },

  assertFinal(state) {
    if (!state?.over || Number(state?.gel ?? 0) < 3) {
      throw new Error('COUNTERGEL autoplay did not reach a terminal result')
    }
  },
}
