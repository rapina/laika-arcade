const titleCopy = { ko: '실을 잇기', en: 'THREAD THE NEEDLE' }
const exitCopy = { ko: '나가기', en: 'EXIT' }

async function visibleCopy(runner) {
  const canvasVisible = await runner.locator('canvas').isVisible().catch(() => false)
  const selector = canvasVisible ? '.game-exit-btn' : '.title-btn'
  return (await runner.locator(selector).first().textContent())?.trim() ?? ''
}

export default {
  localeControlSelector: '.locale-btn',

  async waitForReady({ runner }) {
    await runner.waitForSelector('.title-btn', { timeout: 30_000 })
  },

  async assertLocale({ runner }, locale) {
    const canvasVisible = await runner.locator('canvas').isVisible().catch(() => false)
    const expected = canvasVisible ? exitCopy[locale] : titleCopy[locale]
    const actual = await visibleCopy(runner)
    if (actual !== expected) throw new Error(`STITCH ${locale} copy mismatch: ${actual}`)
  },

  async start({ runner }) {
    await runner.locator('.title-btn').first().click()
    await runner.waitForSelector('canvas', { timeout: 30_000 })
  },

  readState({ runner }) {
    return runner.evaluate(() => globalThis.__gameState ?? null)
  },

  hasProgressed(state) {
    return Number(state?.stitches) >= 1
  },

  progressValue(state) {
    return Number(state?.stitches ?? 0) + Number(state?.progress ?? 0)
  },

  pauseToken(state) {
    return [state?.stitches, state?.progress, state?.eventSerial]
  },

  isPaused(state) {
    return state?.paused === true
  },

  async step({ runner, delay }, state) {
    if (
      state?.phase === 'travel' &&
      state.progress >= state.targetProgress - 0.035 &&
      state.progress <= state.targetProgress + 0.04
    ) {
      await runner.locator('canvas').click({ position: { x: 195, y: 422 }, force: true })
      await delay(55)
    } else {
      await delay(7)
    }
  },

  isFinished(state) {
    return state?.over === true
  },

  shouldCapture(state) {
    return Number(state?.stitches) >= 20
  },

  screenshotLocator({ runner }) {
    return runner.locator('.mobile-frame-inner')
  },

  async waitForRestart({ runner }) {
    await runner.waitForFunction(() => {
      const state = globalThis.__gameState
      return state?.phase === 'travel' && state?.stitches === 0 && !state?.over
    }, undefined, { timeout: 10_000 })
  },

  assertPortalResult(_context, { finalState, status, score, eventSequence }) {
    const expectedScore = `${finalState.stitches}땀 · ${Number(finalState.accuracy).toFixed(1)}%`
    if (status !== '완성' || score !== expectedScore || !Number.isSafeInteger(eventSequence) || eventSequence < 1) {
      throw new Error(`STITCH portal result mismatch: ${status} / ${score}`)
    }
  },

  assertFinal(state) {
    if (!state?.over || state.stitches !== 48 || state.phase !== 'complete') {
      throw new Error('STITCH autoplay did not finish all 48 stitches')
    }
  },
}
