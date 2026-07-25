// 교차파 / Crosspulse portal smoke driver.
//
// The visible white prediction marker approaches the visible white center
// line. This driver taps the canvas when those two screen elements align. It
// never invokes a judgment or rules function and does not read a hidden answer.

async function tapCanvas(runner) {
  const canvas = runner.locator('canvas').last()
  const box = await canvas.boundingBox()
  if (!box) throw new Error('CROSSPULSE canvas has no layout box')
  await runner.page().mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.72)
}

export default {
  viewport: { width: 390, height: 844 },
  timeoutMs: 150_000,

  async waitForReady({ runner }) {
    await runner.waitForSelector('canvas', { timeout: 30_000 })
    await runner.waitForFunction(() => Boolean(globalThis.__gameState), undefined, { timeout: 30_000 })
  },

  async assertLocale({ runner }, locale) {
    let state = null
    for (let attempt = 0; attempt < 60; attempt += 1) {
      state = await runner.evaluate(() => globalThis.__gameState ?? null)
      if (state?.locale === locale) return
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    throw new Error(`CROSSPULSE locale mismatch: ${state?.locale} != ${locale}`)
  },

  async start({ runner, delay }) {
    // The host language button owns focus before play. The first canvas tap
    // focuses the sandbox, resumes its blur pause, and is also valid gameplay.
    await tapCanvas(runner)
    await delay(120)
  },
  readState({ runner }) { return runner.evaluate(() => globalThis.__gameState ?? null) },
  hasProgressed(state) { return Number(state?.judged ?? 0) >= 1 },
  progressValue(state) { return Number(state?.judged ?? 0) },

  async step({ runner, delay }, state) {
    if (state?.over) {
      await delay(80)
      return
    }

    if (state?.paused === true) {
      await tapCanvas(runner)
      await delay(120)
      return
    }

    const predictionY = Number(state?.predictedCollisionY)
    const centerY = Number(state?.bandCenter)
    const halfWidth = Number(state?.preciseHalfWidth)
    if (
      state?.ringOpen === true
      && Number.isFinite(predictionY)
      && Number.isFinite(centerY)
      && Math.abs(predictionY - centerY) <= Math.max(3, halfWidth * 0.65)
    ) {
      await tapCanvas(runner)
      await delay(180)
      return
    }
    await delay(16)
  },

  isFinished(state) { return state?.over === true },
  shouldCapture(state) { return Number(state?.judged ?? 0) >= 3 && !state?.over },
  screenshotLocator({ runner }) { return runner.locator('canvas').last() },

  assertPortalResult(_context, { score, eventSequence }) {
    const numeric = Number(String(score ?? '').replace(/[^0-9]/g, ''))
    if (!Number.isFinite(numeric) || numeric <= 0 || !Number.isSafeInteger(eventSequence) || eventSequence < 1) {
      throw new Error(`CROSSPULSE portal result mismatch: ${score}`)
    }
  },

  assertFinal(state) {
    if (!state?.over) throw new Error('CROSSPULSE autoplay did not reach a terminal result')
    const judged = Number(state?.judged ?? 0)
    const failures = Number(state?.failures ?? 0)
    if (judged < 3 || (judged < 12 && failures < 3)) {
      throw new Error(`CROSSPULSE run ended inconsistently: judged=${judged}, failures=${failures}`)
    }
  },
}
