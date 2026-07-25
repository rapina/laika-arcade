// 쇳물 가시 / Iron Bloom portal smoke driver.
//
// The core verb is holding still, so this driver keeps the pointer pressed and
// only relocates it between sites. It reads nothing but the render model the
// screen is drawn from, and it never calls a judgement function.

const SIGMA = 110
const POOL_Y = 612
const DESIGN = { w: 390, h: 844 }

let resultConfirmed = false
let pressed = false

/** 목표 높이 h를 만드는 밑동으로부터의 거리. 화면의 고리 위치에서 나온다. */
const distanceFor = (h) => SIGMA * Math.sqrt(-2 * Math.log(Math.max(0.02, Math.min(0.99, h))))

async function canvasFrame(runner) {
  const box = await runner.locator('canvas').boundingBox()
  if (!box) throw new Error('IRONBLOOM canvas has no layout box')
  const scale = Math.min(box.width / DESIGN.w, box.height / DESIGN.h)
  return {
    box,
    toPage: (x, y) => ({
      x: box.x + (box.width - DESIGN.w * scale) / 2 + x * scale,
      y: box.y + (box.height - DESIGN.h * scale) / 2 + y * scale,
    }),
  }
}

const model = (runner) => runner.evaluate(() => globalThis.__ironbloom?.model() ?? null)

export default {
  viewport: { width: 390, height: 844 },
  timeoutMs: 240_000,

  async waitForReady({ runner }) {
    await runner.waitForSelector('canvas', { timeout: 30_000 })
    await runner.waitForFunction(() => Boolean(globalThis.__gameState))
  },

  async assertLocale({ runner }, locale) {
    let state = null
    for (let attempt = 0; attempt < 60; attempt += 1) {
      state = await runner.evaluate(() => globalThis.__gameState ?? null)
      if (state?.locale === locale) return
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    if (!state) throw new Error(`IRONBLOOM ${locale} state is unavailable`)
    throw new Error(`IRONBLOOM locale mismatch: ${state.locale} != ${locale}`)
  },

  async start() {},
  readState({ runner }) { return runner.evaluate(() => globalThis.__gameState ?? null) },
  hasProgressed(state) { return Number(state?.crystals ?? 0) > 0 },
  progressValue(state) { return Number(state?.crystals ?? 0) },
  pauseToken(state) { return [state?.crystals, state?.ruleTimeMs, state?.over] },
  isPaused(state) { return state?.paused === true },
  isMuted(state) { return state?.muted === true },

  async step({ runner, delay }, state) {
    if (state?.over) {
      if (!resultConfirmed) {
        if (pressed) { await runner.page().mouse.up().catch(() => {}); pressed = false }
        for (let attempt = 0; attempt < 40; attempt += 1) {
          const current = await runner.evaluate(() => globalThis.__gameState ?? null)
          if (current?.canRestart === true) break
          await delay(100)
        }
        const { box } = await canvasFrame(runner)
        await runner.page().mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)
        resultConfirmed = true
      }
      await delay(100)
      return
    }

    const current = await model(runner)
    const pending = (current?.targets ?? []).filter((target) => target.state === 'pending')
    if (!pending.length) { await delay(60); return }

    // Choose from the screen: the wettest site that its ring says is reachable.
    const reachable = pending.filter((target) => target.reachable !== false)
    const pick = (reachable.length ? reachable : pending).sort((a, b) => (b.wet ?? 0) - (a.wet ?? 0))[0]
    const { toPage } = await canvasFrame(runner)
    const point = toPage(pick.x, POOL_Y - distanceFor(pick.goal))
    await runner.page().mouse.move(point.x, point.y)
    await runner.page().mouse.down()
    pressed = true

    // Hold still and correct only from the spike tip against its ring. The
    // pointer is lifted again before returning so the host's own controls
    // (language, pause, mute) are never fighting a held press.
    try {
      for (let tick = 0; tick < 90; tick += 1) {
        await delay(70)
        const now = await model(runner)
        if (!now || now.over) return
        const target = now.targets.find((candidate) => candidate.x === pick.x)
        if (!target || target.state !== 'pending') return
        const error = target.goal - (target.height ?? 0)
        if (Math.abs(error) > 0.015) {
          const at = distanceFor(target.height || 0.03)
          const want = distanceFor(target.goal)
          const corrected = toPage(pick.x, POOL_Y - (at + (want - at) * 0.45))
          await runner.page().mouse.move(corrected.x, corrected.y, { steps: 4 })
        }
      }
    } finally {
      await runner.page().mouse.up().catch(() => {})
      pressed = false
    }
  },

  isFinished(state) { return state?.over === true && resultConfirmed },
  shouldCapture(state) { return Number(state?.crystals ?? 0) > 0 && !state?.over },
  screenshotLocator({ runner }) { return runner.locator('canvas') },

  assertPortalResult(_context, { score, eventSequence }) {
    if (!score || score === '--' || !Number.isSafeInteger(eventSequence) || eventSequence < 1) {
      throw new Error(`IRONBLOOM portal result mismatch: ${score}`)
    }
  },

  assertFinal(state) {
    if (!state?.over) throw new Error('IRONBLOOM autoplay did not reach a terminal result')
    // The run has to have actually been played: spikes hardened by holding
    // still, and an ending that came from the rules rather than the clock.
    if (Number(state?.crystals ?? 0) < 3) {
      throw new Error('IRONBLOOM run ended before hardening enough spikes')
    }
    if (Number(state?.failuresLeft ?? 3) > 0 && Number(state?.band ?? 1) < 5) {
      throw new Error('IRONBLOOM run ended without spending the failures or reaching the last band')
    }
  },
}
