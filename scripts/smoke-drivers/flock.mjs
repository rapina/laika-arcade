let resultConfirmed = false
let taps = 0

// The tap cooldown is 0.5s (0.6s in the last band), so a driver that taps
// faster than that is only throwing away inputs. Leave a margin.
const TAP_INTERVAL_MS = 560

async function tapCanvas(runner, fraction) {
  const canvas = runner.locator('canvas')
  const box = await canvas.boundingBox()
  if (!box) throw new Error('FLOCK canvas has no layout box')
  await runner.page().mouse.click(box.x + box.width * fraction, box.y + box.height * 0.62)
}

export default {
  viewport: { width: 390, height: 844 },
  timeoutMs: 240_000,

  async waitForReady({ runner }) {
    await runner.waitForSelector('canvas', { timeout: 30_000 })
    await runner.waitForFunction(() => Boolean(globalThis.__gameState))
  },

  async assertLocale({ runner }, locale) {
    // The runtime republishes its state on a poll, so the locale change lands
    // a beat after the host applies it. Wait for it instead of racing.
    let state = null
    for (let attempt = 0; attempt < 60; attempt += 1) {
      state = await runner.evaluate(() => globalThis.__gameState ?? null)
      if (state?.locale === locale) return
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    if (!state) throw new Error(`FLOCK ${locale} state is unavailable`)
    throw new Error(`FLOCK locale mismatch: ${state.locale} != ${locale}`)
  },

  async start() {},
  readState({ runner }) { return runner.evaluate(() => globalThis.__gameState ?? null) },
  hasProgressed(state) { return Number(state?.time ?? 0) > 0 },
  progressValue(state) { return Number(state?.gatesJudged ?? 0) },
  pauseToken(state) { return [state?.gatesJudged, state?.time, state?.over] },
  isPaused(state) { return state?.paused === true },
  isMuted(state) { return state?.muted === true },

  async step({ runner, delay }, state) {
    if (state?.over) {
      if (!resultConfirmed) {
        // A short guard holds the result on screen so it can be read before a
        // stray tap starts the next run. Wait for the runtime to open it.
        for (let attempt = 0; attempt < 40; attempt += 1) {
          const current = await runner.evaluate(() => globalThis.__gameState ?? null)
          if (current?.restartReady === true) break
          await delay(100)
        }
        await tapCanvas(runner, 0.5)
        resultConfirmed = true
      }
      await delay(100)
      return
    }

    // One beacon per cooldown, walked across the sky. This is a blind hand:
    // it never reads gate positions, so it judges gates without reliably
    // clearing them and ends on the feather budget. That is the point of the
    // check, which is that the portal carries a real run to a real result.
    const fraction = 0.3 + 0.2 * (taps % 3)
    taps += 1
    await tapCanvas(runner, fraction)
    await delay(TAP_INTERVAL_MS)
  },

  isFinished(state) { return state?.over === true && resultConfirmed },
  shouldCapture(state) { return Number(state?.gatesJudged ?? 0) > 0 && !state?.over },
  screenshotLocator({ runner }) { return runner.locator('canvas') },

  assertPortalResult(_context, { score, eventSequence }) {
    if (!score || score === '--' || !Number.isSafeInteger(eventSequence) || eventSequence < 1) {
      throw new Error(`FLOCK portal result mismatch: ${score}`)
    }
  },

  assertFinal(state) {
    if (!state?.over) throw new Error('FLOCK autoplay did not reach a terminal result')
    // The run has to actually have been played: gates judged, and an ending
    // that came from the rules rather than from running out of wall clock.
    if (Number(state?.gatesJudged ?? 0) < 3) {
      throw new Error('FLOCK run ended before judging enough gates')
    }
    if (Number(state?.budget ?? 3) > 0 && Number(state?.gatesJudged ?? 0) < 20) {
      throw new Error('FLOCK run ended without spending the feathers or reaching the last gates')
    }
  },
}
