// 종이맥 / Paper Vein portal smoke driver.
//
// The visible loose vermilion end is dragged to the next nearby pressed hole.
// After every stitch, the driver waits for the same visible ready cue the
// player sees before making another drag. It never calls the rules module or
// injects a target answer.

const DESIGN_W = 390
const DESIGN_H = 844

async function canvasFrame(runner) {
  const canvas = runner.locator('canvas').last()
  const box = await canvas.boundingBox()
  if (!box) throw new Error('PAPERVEIN canvas has no layout box')
  return { canvas, box }
}

function pagePoint(box, point) {
  return {
    x: box.x + point.x / DESIGN_W * box.width,
    y: box.y + point.y / DESIGN_H * box.height,
  }
}

async function dragLooseEnd(runner, page, state) {
  const { box } = await canvasFrame(runner)
  const from = state?.holes?.[state.endpoint]
  const targetIndex = Number(state?.endpoint ?? 0) + 1
  const to = state?.holes?.[targetIndex]
  if (!from || !to) {
    throw new Error(`PAPERVEIN visible path is unavailable: endpoint=${state?.endpoint}`)
  }
  const a = pagePoint(box, from)
  const b = pagePoint(box, to)
  await page.mouse.move(a.x, a.y)
  await page.mouse.down()
  await page.mouse.move(b.x, b.y, { steps: 18 })
  await page.mouse.up()
}

export default {
  viewport: { width: 390, height: 844 },
  timeoutMs: 150_000,

  async waitForReady({ runner }) {
    await runner.waitForSelector('canvas', { timeout: 30_000 })
    await runner.waitForFunction(
      () => Array.isArray(globalThis.__gameState?.holes)
        && globalThis.__gameState.holes.length === 8,
      undefined,
      { timeout: 30_000 },
    )
  },

  async assertLocale({ runner }, locale) {
    await runner.waitForFunction(
      (expected) => globalThis.__gameState?.locale === expected,
      locale,
      { timeout: 10_000 },
    )
  },

  async start({ runner, page, delay }) {
    const state = await runner.evaluate(() => globalThis.__gameState ?? null)
    await dragLooseEnd(runner, page, state)
    await delay(120)
  },

  readState({ runner }) {
    return runner.evaluate(() => globalThis.__gameState ?? null)
  },
  hasProgressed(state) { return Number(state?.closedCount ?? 0) > 0 },
  progressValue(state) { return Number(state?.closedCount ?? 0) },

  async step({ runner, page, delay }, state) {
    if (state?.over) {
      await delay(80)
      return
    }
    if (state?.paused === true || state?.ready !== true) {
      await delay(50)
      return
    }
    await dragLooseEnd(runner, page, state)
    await delay(120)
  },

  isFinished(state) { return state?.over === true },
  shouldCapture(state) {
    return Number(state?.closedCount ?? 0) >= 3 && state?.over !== true
  },
  screenshotLocator({ runner }) { return runner.locator('canvas').last() },

  assertPortalResult(_context, { score, eventSequence }) {
    const numeric = Number(String(score ?? '').replace(/[^0-9]/g, ''))
    if (!Number.isFinite(numeric) || numeric <= 0 || !Number.isSafeInteger(eventSequence) || eventSequence < 1) {
      throw new Error(`PAPERVEIN portal result mismatch: ${score}`)
    }
  },

  assertFinal(state) {
    if (state?.over !== true || state?.outcome !== 'complete') {
      throw new Error(`PAPERVEIN did not complete: outcome=${state?.outcome}`)
    }
    if (Number(state?.closedCount ?? 0) !== 7 || Number(state?.ruptures ?? 0) >= 3) {
      throw new Error(
        `PAPERVEIN terminal state is inconsistent: closed=${state?.closedCount}, ruptures=${state?.ruptures}`,
      )
    }
    if (Number(state?.elapsed ?? 0) < 60) {
      throw new Error(`PAPERVEIN bypassed its visible stabilization rhythm: elapsed=${state?.elapsed}`)
    }
  },
}
