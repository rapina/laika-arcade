let resultConfirmed = false

async function tapCanvas(runner) {
  const canvas = runner.locator('canvas')
  const box = await canvas.boundingBox()
  if (!box) throw new Error('LIGHTSTRING canvas has no layout box')
  await runner.page().mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)
}

export default {
  viewport: { width: 390, height: 844 },
  timeoutMs: 45_000,

  async waitForReady({ runner }) {
    await runner.waitForSelector('canvas', { timeout: 30_000 })
    await runner.waitForFunction(() => Boolean(globalThis.__gameState))
  },

  async assertLocale({ runner }, locale) {
    const state = await runner.evaluate(() => globalThis.__gameState ?? null)
    if (!state) throw new Error(`LIGHTSTRING ${locale} state is unavailable`)
  },

  async start() {},
  readState({ runner }) { return runner.evaluate(() => globalThis.__gameState ?? null) },
  hasProgressed(state) { return Number(state?.trial ?? 0) >= 1 },
  progressValue(state) { return Number(state?.trial ?? 0) },
  pauseToken(state) { return [state?.trial, state?.elapsed, state?.over] },
  isPaused(state) { return state?.paused === true },
  isMuted(state) { return state?.muted === true },

  async step({ runner, delay }, state) {
    if (state?.over && !resultConfirmed) {
      await delay(700)
      await tapCanvas(runner)
      resultConfirmed = true
    } else if (!state?.over && state?.judged === false) {
      await tapCanvas(runner)
    }
    await delay(100)
  },

  isFinished(state) { return state?.over === true && resultConfirmed },
  shouldCapture(state) { return Number(state?.trial ?? 0) >= 1 && !state?.over },
  screenshotLocator({ runner }) { return runner.locator('canvas') },

  assertPortalResult(_context, { score, eventSequence }) {
    if (!score || score === '--' || !Number.isSafeInteger(eventSequence) || eventSequence < 1) {
      throw new Error(`LIGHTSTRING portal result mismatch: ${score}`)
    }
  },

  assertFinal(state) {
    if (!state?.over || Number(state?.misses ?? 0) !== 3) {
      throw new Error('LIGHTSTRING autoplay did not reach a terminal result')
    }
  },
}
