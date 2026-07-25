// 그림자 맞추기 / Shadow Fit portal smoke driver.
//
// The core verb is dragging a lantern so the projected shadows of rotating
// wooden blocks slide over a target outline. The screen only ever tells the
// player two things by eye: how full the outline looks (coverage) and how far
// the shadow cluster still sits from the outline centre (a gap arrow whose
// LENGTH is the only quantity the debug state exposes — gapMag, never its
// sign). So this driver plays the way a hand does: it nudges the light a small
// step, keeps the nudge if the outline filled more (or the gap shrank), reverses
// it otherwise, and keeps re-adjusting because the blocks rotate and the fit
// drifts out from under it. It never calls a judgement/rules function and never
// reads the answer light — only the coverage/gapMag the screen itself shows.

const DESIGN_W = 390
const DESIGN_H = 844
// Light draggable clamp (design px), matching the game's LIGHT_BOUNDS with a
// tiny inset so a commanded point never lands exactly on the edge.
const L_MIN_X = 36
const L_MAX_X = 354
const L_MIN_Y = 152
const L_MAX_Y = 788

// Coverage at which we stop searching and simply hold the lantern still so the
// lock timer (holdTicks ~0.37s) can run out and clear the segment.
const HOLD_COVERAGE = 0.8

const DEBUG = Boolean(process.env.SHADOWFIT_DEBUG)

let started = false
// The lantern position we currently command, in design px. We only ever know
// where WE put the light; the game resets it to a per-segment start on advance,
// but our next command overrides that, so tracking our own value is enough.
let light = { x: 196, y: 720 }
let stepSize = 30
let lastSeg = -1

function clampLight(x, y) {
  return {
    x: Math.max(L_MIN_X, Math.min(L_MAX_X, x)),
    y: Math.max(L_MIN_Y, Math.min(L_MAX_Y, y)),
  }
}

async function frame(runner) {
  const box = await runner.locator('canvas').last().boundingBox()
  if (!box) throw new Error('SHADOW FIT canvas has no layout box')
  const scale = Math.min(box.width / DESIGN_W, box.height / DESIGN_H)
  return {
    scale,
    ox: box.x + (box.width - DESIGN_W * scale) / 2,
    oy: box.y + (box.height - DESIGN_H * scale) / 2,
  }
}

function toScreen(f, dx, dy) {
  return [f.ox + dx * f.scale, f.oy + dy * f.scale]
}

function readState(runner) {
  return runner.evaluate(() => globalThis.__gameState ?? null)
}

/**
 * Cost of a candidate reading. Lower is better. Coverage is primary (we want
 * the outline as full as possible); the gap length only breaks ties and guides
 * the search while coverage is still zero. A coverage of zero with a near-zero
 * gap is the degenerate case where the shadow cluster has slid entirely off the
 * target grid (the exposed gap collapses to zero because nothing is covered),
 * so it is scored as the worst place to be, not the best.
 */
function cost(r) {
  const cov = Number(r?.coverage ?? 0)
  const gap = Number(r?.gapMag ?? 999)
  if (cov >= 0.02) return (1 - cov) + gap * 0.0004
  if (gap <= 5) return 6 // shadows fully off the outline — a false "zero gap"
  return 1.3 + gap * 0.0015
}

export default {
  viewport: { width: 390, height: 844 },
  timeoutMs: 240_000,

  async waitForReady({ runner }) {
    await runner.waitForSelector('canvas', { timeout: 30_000 })
    await runner.waitForFunction(() => Boolean(globalThis.__gameState), undefined, { timeout: 30_000 })
  },

  // The runtime does not publish its language as state; the host owns the
  // locale and passes it through the runner (verified separately by the shell's
  // per-locale title check and by the two-locale gameplay captures). Here we
  // only confirm the same live round survives the locale command.
  async assertLocale({ runner }) {
    await runner.waitForFunction(() => Boolean(globalThis.__gameState), undefined, { timeout: 10_000 })
  },

  async start({ runner, page }) {
    // No title screen: the round is already running. One tap starts audio and
    // parks the lantern at our initial guess near the bottom-centre where the
    // outlines live; the step loop takes over from there.
    const f = await frame(runner)
    const [sx, sy] = toScreen(f, light.x, light.y)
    await page.mouse.move(sx, sy)
    await page.mouse.down()
    await page.mouse.up()
    started = true
  },

  readState({ runner }) { return runner.evaluate(() => globalThis.__gameState ?? null) },
  hasProgressed(state) { return Number(state?.cleared ?? 0) >= 1 },
  progressValue(state) { return Number(state?.cleared ?? 0) },
  pauseToken(state) { return [state?.cleared, state?.failuresUsed, state?.score, state?.over] },
  isPaused(state) { return state?.paused === true },

  async step({ runner, page, delay }, state) {
    if (!started) {
      await this.start({ runner, page })
      await delay(120)
      return
    }
    if (state?.over) { await delay(80); return }

    // Fresh segment: the fit resets, so re-open the search step.
    if (Number(state?.segIndex ?? -1) !== lastSeg) {
      lastSeg = Number(state?.segIndex ?? -1)
      stepSize = 30
    }

    // Post-judgment freeze — the shadow is held on the judged frame. Wait it out.
    if (state?.settling) { await delay(90); return }

    // Comfortably filled: stop moving so the lock timer can run. The blocks keep
    // rotating, so if the fit drifts back below the success window we resume.
    if (Number(state?.coverage ?? 0) >= HOLD_COVERAGE) {
      await delay(120)
      return
    }

    const f = await frame(runner)
    const [csx, csy] = toScreen(f, light.x, light.y)
    await page.mouse.move(csx, csy)
    await page.mouse.down()
    try {
      await delay(45)
      let best = await readState(runner)
      let bestPos = { ...light }
      const s = stepSize
      const dirs = [
        [s, 0], [-s, 0], [0, s], [0, -s],
        [s, s], [-s, -s], [s, -s], [-s, s],
      ]
      for (const [dx, dy] of dirs) {
        const pos = clampLight(light.x + dx, light.y + dy)
        const [sx, sy] = toScreen(f, pos.x, pos.y)
        await page.mouse.move(sx, sy)
        await delay(42)
        const r = await readState(runner)
        if (r && cost(r) < cost(best)) { best = r; bestPos = pos }
        if (r?.over) break
      }
      if (bestPos.x !== light.x || bestPos.y !== light.y) {
        light = bestPos
        stepSize = Math.min(48, stepSize * 1.3)
      } else {
        stepSize = Math.max(6, stepSize * 0.55)
      }
      // Leave the lantern parked at the best point found this step.
      const [fx, fy] = toScreen(f, light.x, light.y)
      await page.mouse.move(fx, fy)
      if (DEBUG) {
        process.stderr.write(
          `seg=${best?.segIndex} band=${best?.band} cov=${best?.coverage} gap=${best?.gapMag} ` +
          `cleared=${best?.cleared} fails=${best?.failuresUsed} L=(${light.x.toFixed(0)},${light.y.toFixed(0)}) s=${stepSize.toFixed(0)}\n`,
        )
      }
    } finally {
      await page.mouse.up()
    }
    await delay(20)
  },

  isFinished(state) { return state?.over === true },
  shouldCapture(state) { return Number(state?.cleared ?? 0) >= 2 && !state?.over },
  screenshotLocator({ runner }) { return runner.locator('canvas').last() },

  assertPortalResult(_context, { score, eventSequence }) {
    // The shell renders the score localised with a thousands separator and a
    // phase suffix (e.g. "200,390 · 단계 4"); pull the leading number group out.
    const match = String(score ?? '').match(/\d[\d,]*/)
    const numeric = match ? Number(match[0].replace(/,/g, '')) : NaN
    if (!Number.isFinite(numeric) || numeric <= 0 || !Number.isSafeInteger(eventSequence) || eventSequence < 1) {
      throw new Error(`SHADOW FIT portal result mismatch: ${score}`)
    }
  },

  assertFinal(state) {
    if (!state?.over) throw new Error('SHADOW FIT autoplay did not reach a terminal result')
    const cleared = Number(state?.cleared ?? 0)
    const failures = Number(state?.failuresUsed ?? 0)
    if (cleared < 8) {
      throw new Error(`SHADOW FIT run ended with too few segments cleared (${cleared})`)
    }
    if (failures < 3 && !state?.won) {
      throw new Error('SHADOW FIT run ended without spending the failure budget or winning')
    }
  },
}
