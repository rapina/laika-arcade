const labels = new Map()

async function printOnce(runner) {
  const canvas = runner.locator('canvas')
  const box = await canvas.boundingBox()
  if (!box) throw new Error('ASTRAL PRESS canvas has no layout box')
  await runner.page().mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await runner.page().mouse.down()
  await new Promise((resolve) => setTimeout(resolve, 45))
  await runner.page().mouse.up()
}

export default {
  viewport: { width: 390, height: 844 },
  localeControlSelector: '[data-action="lang"]',
  timeoutMs: 30_000,

  async waitForReady({ runner }) {
    await runner.waitForSelector('canvas', { timeout: 30_000 })
    await runner.waitForFunction(() => Boolean(globalThis.__gameState))
  },

  async assertLocale({ runner }, locale) {
    const label = await runner.locator('canvas').getAttribute('aria-label')
    if (!label) throw new Error(`ASTRAL PRESS ${locale} accessible label is empty`)
    labels.set(locale, label)
    const other = labels.get(locale === 'ko' ? 'en' : 'ko')
    if (other && other === label) throw new Error('ASTRAL PRESS locale label did not change')
  },

  async start({ runner }) { await printOnce(runner) },
  readState({ runner }) { return runner.evaluate(() => globalThis.__gameState ?? null) },
  hasProgressed(state) { return Number(state?.round ?? 0) >= 1 },
  progressValue(state) { return Number(state?.round ?? 0) },
  pauseToken(state) { return [state?.round, state?.angle, state?.over] },
  isPaused(state) { return state?.paused === true },
  isMuted(state) { return state?.muted === true },
  async step({ runner, delay }, state) {
    if (!state?.over && !state?.held) await printOnce(runner)
    await delay(80)
  },
  isFinished(state) { return state?.over === true },
  shouldCapture(state) { return Number(state?.round ?? 0) >= 2 && !state?.over },
  screenshotLocator({ runner }) { return runner.locator('.game-host') },

  assertPortalResult(_context, { score, eventSequence }) {
    if (!score || score === '--' || !Number.isSafeInteger(eventSequence) || eventSequence < 1) {
      throw new Error(`ASTRAL PRESS portal result mismatch: ${score}`)
    }
  },

  assertFinal(state) {
    if (!state?.over || Number(state?.round ?? 0) < 3) {
      throw new Error('ASTRAL PRESS autoplay did not reach a terminal print result')
    }
  },
}
