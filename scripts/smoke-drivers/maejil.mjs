// Maejil (Iron Song): tap spots along the glowing bar. The bar sits in the
// lower third of the 390x844 logical frame; taps cycle across distributed x
// positions so heat is spent without over-digging one column. Cold-edge taps
// are void by design and cost nothing, so a distributed pattern reaches a
// judged terminal (complete or fracture) within the session cap.
const SPOTS = [0.2, 0.32, 0.44, 0.56, 0.68, 0.8, 0.26, 0.38, 0.5, 0.62, 0.74]
let spot = 0

async function strike(runner, page) {
  const canvas = runner.locator('canvas')
  const box = await canvas.boundingBox()
  if (!box) throw new Error('MAEJIL canvas has no layout box')
  const fx = SPOTS[spot % SPOTS.length]
  spot += 1
  await page.mouse.click(box.x + box.width * fx, box.y + box.height * 0.77)
}

export default {
  viewport: { width: 390, height: 844 },
  timeoutMs: 150_000,

  async waitForReady({ runner }) {
    await runner.waitForSelector('canvas', { timeout: 30_000 })
    await runner.waitForFunction(() => Boolean(globalThis.__gameState), undefined, { timeout: 30_000 })
  },

  // The arcade host owns the locale; the game exposes no locale in its debug
  // state, so this asserts state availability across the switch (same
  // precedent as lightstring).
  async assertLocale({ runner }, locale) {
    const state = await runner.evaluate(() => globalThis.__gameState ?? null)
    if (!state) throw new Error(`MAEJIL ${locale} state is unavailable`)
  },

  async start({ runner, page }) {
    await strike(runner, page)
  },

  readState({ runner }) { return runner.evaluate(() => globalThis.__gameState ?? null) },
  hasProgressed(state) { return Number(state?.strikes ?? 0) >= 1 },
  progressValue(state) { return Number(state?.strikes ?? 0) + Number(state?.band ?? 0) * 100 },

  async step({ runner, page, delay }, state) {
    if (!state?.over) await strike(runner, page)
    await delay(300)
  },

  isFinished(state) { return state?.over === true },
  shouldCapture(state) { return Number(state?.band ?? 0) >= 1 && !state?.over },
  screenshotLocator({ runner }) { return runner.locator('canvas') },

  assertPortalResult(_context, { score, eventSequence }) {
    if (score === undefined || score === null || score === '--' || !Number.isSafeInteger(eventSequence) || eventSequence < 1) {
      throw new Error(`MAEJIL portal result mismatch: ${score}`)
    }
  },

  assertFinal(state) {
    if (!state?.over || Number(state?.strikes ?? 0) < 1) {
      throw new Error('MAEJIL autoplay did not reach a judged terminal result')
    }
  },
}
