let resultConfirmed = false

async function tapCanvas(runner) {
  const canvas = runner.locator('canvas')
  const box = await canvas.boundingBox()
  if (!box) throw new Error('GRAINSPLIT canvas has no layout box')
  await runner.page().mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.62)
}

export default {
  viewport: { width: 390, height: 844 },
  timeoutMs: 240_000,

  async waitForReady({ runner }) {
    await runner.waitForSelector('canvas', { timeout: 30_000 })
    await runner.waitForFunction(() => Boolean(globalThis.__gameState))
  },

  async assertLocale({ runner }, locale) {
    // The runtime republishes its state on a 100ms poll, so the locale change
    // lands a beat after the host applies it. Wait for it instead of racing.
    let state = null
    for (let attempt = 0; attempt < 60; attempt += 1) {
      state = await runner.evaluate(() => globalThis.__gameState ?? null)
      if (state?.lang === locale) return
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    if (!state) throw new Error(`GRAINSPLIT ${locale} state is unavailable`)
    throw new Error(`GRAINSPLIT locale mismatch: ${state.lang} != ${locale}`)
  },

  async start() {},
  readState({ runner }) { return runner.evaluate(() => globalThis.__gameState ?? null) },
  hasProgressed(state) { return Boolean(state?.started) },
  progressValue(state) { return Number(state?.logIndex ?? 0) },
  pauseToken(state) { return [state?.logIndex, state?.elapsedMs, state?.over] },
  isPaused(state) { return state?.paused === true },
  isMuted(state) { return state?.muted === true },

  async step({ runner, delay }, state) {
    if (state?.over) {
      if (!resultConfirmed) {
        await delay(900)
        await tapCanvas(runner)
        resultConfirmed = true
      }
      await delay(100)
      return
    }
    // The title card asks for a tap before the log starts recoiling.
    if (state?.phase === 'title') {
      await tapCanvas(runner)
      await delay(250)
      return
    }
    // Progress is frozen until the first tap, so the guide can be read.
    if (state?.started === false) {
      await tapCanvas(runner)
      await delay(250)
      return
    }
    // The green ring and the early/late readout are both rendered on screen.
    // Tap while the ring is open and the readout is near zero, one tap per
    // opening, so a full run finishes inside the session cap.
    if (state?.ringOpen === true && Math.abs(Number(state?.errorMs ?? 999)) <= 45) {
      await tapCanvas(runner)
      await delay(220)
      return
    }
    await delay(16)
  },

  isFinished(state) { return state?.over === true && resultConfirmed },
  shouldCapture(state) { return Boolean(state?.started) && !state?.over },
  screenshotLocator({ runner }) { return runner.locator('canvas') },

  assertPortalResult(_context, { score, eventSequence }) {
    if (!score || score === '--' || !Number.isSafeInteger(eventSequence) || eventSequence < 1) {
      throw new Error(`GRAINSPLIT portal result mismatch: ${score}`)
    }
  },

  assertFinal(state) {
    if (!state?.over) throw new Error('GRAINSPLIT autoplay did not reach a terminal result')
    if (Number(state?.failures ?? 0) < 3 && Number(state?.logIndex ?? 0) < 13) {
      throw new Error('GRAINSPLIT run ended without exhausting wedges or logs')
    }
  },
}
