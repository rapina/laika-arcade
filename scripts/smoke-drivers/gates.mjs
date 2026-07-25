const copy = new Map()

export default {
  localeControlSelector: '.locale-btn',

  async waitForReady({ runner }) {
    await runner.waitForSelector('.gate-bank', { timeout: 30_000 })
  },

  async assertLocale({ runner }, locale) {
    const text = (await runner.locator('.prompt').textContent())?.trim() ?? ''
    if (!text) throw new Error(`GATES ${locale} copy is empty`)
    copy.set(locale, text)
    const other = copy.get(locale === 'ko' ? 'en' : 'ko')
    if (other && other === text) throw new Error('GATES locale copy did not change')
  },

  async start() {},

  readState({ runner }) {
    return runner.evaluate(() => globalThis.__gameState ?? null)
  },

  hasProgressed(state) { return Number(state?.turn ?? 0) > 0 },
  progressValue(state) { return Number(state?.turn ?? 0) },
  pauseToken(state) { return [state?.turn, state?.timeLeft, state?.status] },
  isPaused(state) { return state?.paused === true },
  isMuted(state) { return state?.muted === true },

  async step({ runner, delay }) {
    const gate = await runner.evaluate(() => globalThis.__gameState?.correctGate)
    if (Number.isInteger(gate)) await runner.locator(`[data-gate="${gate}"]`).click()
    await delay(25)
  },

  isFinished(state) { return state?.over === true },
  shouldCapture(state) { return Number(state?.turn ?? 0) >= 6 },
  screenshotLocator({ runner }) { return runner.locator('.mobile-frame-inner') },

  async waitForRestart({ runner }) {
    await runner.waitForFunction(() => globalThis.__gameState?.turn === 0 && !globalThis.__gameState?.over, undefined, { timeout: 10_000 })
  },

  assertPortalResult(_context, { status, score, eventSequence }) {
    if (!status || ['플레이 중', 'PLAYING'].includes(status) || !score || score === '--' || !Number.isSafeInteger(eventSequence) || eventSequence < 1) {
      throw new Error(`GATES portal result mismatch: ${status} / ${score}`)
    }
  },

  assertFinal(state) {
    if (!state?.over || state.status !== 'won' || state.turn !== 12) throw new Error('GATES autoplay did not clear twelve gates')
  },
}
