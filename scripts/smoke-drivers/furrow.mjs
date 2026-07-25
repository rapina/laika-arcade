const labels = new Map()

export default {
  viewport: { width: 390, height: 844 },
  localeControlSelector: '[data-action="lang"]',
  timeoutMs: 60_000,

  async waitForReady({ runner }) {
    await runner.waitForSelector('canvas', { timeout: 30_000 })
    await runner.waitForFunction(() => Boolean(globalThis.__gameState))
  },

  async assertLocale({ runner }, locale) {
    const label = await runner.locator('canvas').getAttribute('aria-label')
    if (!label) throw new Error(`FURROW ${locale} accessible label is empty`)
    labels.set(locale, label)
    const other = labels.get(locale === 'ko' ? 'en' : 'ko')
    if (other && other === label) throw new Error('FURROW locale label did not change')
  },

  async start({ runner }) {
    const canvas = runner.locator('canvas')
    const box = await canvas.boundingBox()
    if (!box) throw new Error('FURROW canvas has no layout box')
    const point = ([x, y]) => ({ x: box.x + x * box.width / 400, y: box.y + y * box.height / 711 })
    const path = [[52,112],[70,190],[85,285],[190,330],[320,355],[355,520],[342,608]]
    let cursor = point(path[0])
    await runner.page().mouse.move(cursor.x, cursor.y)
    await runner.page().mouse.down()
    for (const next of path.slice(1)) {
      cursor = point(next)
      await runner.page().mouse.move(cursor.x, cursor.y, { steps: 10 })
    }
    await runner.page().mouse.up()
  },

  readState({ runner }) { return runner.evaluate(() => globalThis.__gameState ?? null) },
  hasProgressed(state) { return Number(state?.pathPoints ?? 0) > 2 },
  progressValue(state) { return Number(state?.water ?? 0) },
  pauseToken(state) { return [state?.water, state?.status, state?.pathPoints] },
  isPaused(state) { return state?.paused === true },
  isMuted(state) { return state?.muted === true },
  async step({ delay }) { await delay(25) },
  isFinished(state) { return state?.over === true },
  shouldCapture(state) { return Number(state?.water ?? 0) > 120 && !state?.over },
  screenshotLocator({ runner }) { return runner.locator('.game-host') },

  async waitForRestart({ runner }) {
    await runner.waitForFunction(() => globalThis.__gameState?.status === 'ready' && !globalThis.__gameState?.over, undefined, { timeout: 10_000 })
  },

  assertPortalResult(_context, { score, eventSequence }) {
    if (!score || score === '--' || !Number.isSafeInteger(eventSequence) || eventSequence < 1) {
      throw new Error(`FURROW portal result mismatch: ${score}`)
    }
  },

  assertFinal(state) {
    if (!state?.over || state.status !== 'success' || Number(state.score) <= 0) throw new Error('FURROW autoplay did not reach the seed')
  },
}
