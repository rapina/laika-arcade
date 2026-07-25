// 소용돌이 수면 / Whirl Line portal smoke driver.
//
// The core verb is spinning a dial at the bottom of the screen so the water in
// a glass cylinder whirls and its rim climbs. The screen shows two things the
// player reads by eye: the current rim level (a bright cyan line) and the amber
// target line to hold it on. This driver plays the way a hand does: it keeps the
// pointer pressed on the dial and circles it, and it circles FASTER when the rim
// sits below the target and slower when it sits above, so the rim tracks the
// drifting line. It never calls a rules/judgement function and never reads a
// precomputed answer; it only uses the rim level and target line the screen
// itself draws, plus the known water physics (rim rises with spin), to decide
// how fast to circle. The failure budget ends the run on its own.

const DESIGN_W = 390
const DESIGN_H = 844
const DIAL_CX = 195
const DIAL_CY = 748
const SPIN_R = 40 // circle radius inside the dial to sweep the pointer around
const GAIN = 0.85 // matches the game: commandedOmega = pointerSpin * GAIN
const MOVE_DT = 0.035 // seconds between micro moves; sets the spin sample rate
const MICRO_PER_STEP = 3

const DEBUG = Boolean(process.env.WHIRLLINE_DEBUG)

let pressed = false
let theta = 0

async function frame(runner) {
  const box = await runner.locator('canvas').last().boundingBox()
  if (!box) throw new Error('WHIRL LINE canvas has no layout box')
  const scale = Math.min(box.width / DESIGN_W, box.height / DESIGN_H)
  return {
    scale,
    ox: box.x + (box.width - DESIGN_W * scale) / 2,
    oy: box.y + (box.height - DESIGN_H * scale) / 2,
  }
}

function dialPoint(f, angle) {
  const dx = DIAL_CX + SPIN_R * Math.cos(angle)
  const dy = DIAL_CY + SPIN_R * Math.sin(angle)
  return [f.ox + dx * f.scale, f.oy + dy * f.scale]
}

function readState(runner) {
  return runner.evaluate(() => globalThis.__gameState ?? null)
}

// Required spin from the rim level we want. The rim rises with the square of the
// spin (level = 0.30 + 0.01*omega^2), so invert that for the target level and
// add a proportional nudge from the live error so the rim tracks the drift.
function commandOmega(state) {
  const target = Number(state?.target ?? 0.45)
  const level = Number(state?.level ?? 0.3)
  const base = Math.sqrt(Math.max(0, (target - 0.3) / 0.01))
  const cmd = base + 5 * (target - level)
  return Math.max(0.6, Math.min(7.8, cmd))
}

export default {
  viewport: { width: 390, height: 844 },
  timeoutMs: 240_000,

  async waitForReady({ runner }) {
    await runner.waitForSelector('canvas', { timeout: 30_000 })
    await runner.waitForFunction(() => Boolean(globalThis.__gameState), undefined, { timeout: 30_000 })
  },

  // The runtime does not publish its locale as state; the host owns it and the
  // shell verifies per-locale titles separately. Here we only confirm the same
  // live round survives the locale command.
  async assertLocale({ runner }) {
    await runner.waitForFunction(() => Boolean(globalThis.__gameState), undefined, { timeout: 10_000 })
  },

  async start({ runner, page }) {
    const f = await frame(runner)
    theta = 0
    const [sx, sy] = dialPoint(f, theta)
    await page.mouse.move(sx, sy)
    await page.mouse.down()
    pressed = true
  },

  readState({ runner }) { return runner.evaluate(() => globalThis.__gameState ?? null) },
  hasProgressed(state) { return Number(state?.checkpointsReached ?? 0) >= 1 },
  progressValue(state) { return Number(state?.checkpointsReached ?? 0) },

  async step({ runner, page, delay }, state) {
    if (!pressed) {
      await this.start({ runner, page })
      await delay(80)
      return
    }
    if (state?.over) { await delay(80); return }

    const f = await frame(runner)
    const omega = commandOmega(state)
    // pointerSpin settles to |da|/dt, and commandedOmega = pointerSpin * GAIN.
    // So the per-move angle that produces this omega is (omega / GAIN) * MOVE_DT.
    const dMove = Math.max(0.05, Math.min(0.5, (omega / GAIN) * MOVE_DT))
    for (let i = 0; i < MICRO_PER_STEP; i += 1) {
      theta += dMove
      const [sx, sy] = dialPoint(f, theta)
      await page.mouse.move(sx, sy)
      await delay(MOVE_DT * 1000)
    }
    if (DEBUG) {
      process.stderr.write(
        `band=${state?.band} lvl=${state?.level} tgt=${state?.target} om=${state?.omega} ` +
        `cmd=${omega.toFixed(2)} reached=${state?.checkpointsReached} passed=${state?.checkpointsPassed} ` +
        `prec=${state?.precisionHits} drop=${state?.droplets} spill=${state?.spilling}\n`,
      )
    }
  },

  isFinished(state) { return state?.over === true },
  shouldCapture(state) { return Number(state?.checkpointsPassed ?? 0) >= 2 && !state?.over },
  screenshotLocator({ runner }) { return runner.locator('canvas').last() },

  assertPortalResult(_context, { score, eventSequence }) {
    const match = String(score ?? '').match(/\d[\d,]*/)
    const numeric = match ? Number(match[0].replace(/,/g, '')) : NaN
    if (!Number.isFinite(numeric) || numeric <= 0 || !Number.isSafeInteger(eventSequence) || eventSequence < 1) {
      throw new Error(`WHIRL LINE portal result mismatch: ${score}`)
    }
  },

  assertFinal(state) {
    if (!state?.over) throw new Error('WHIRL LINE autoplay did not reach a terminal result')
    const reached = Number(state?.checkpointsReached ?? 0)
    const passed = Number(state?.checkpointsPassed ?? 0)
    if (reached < 3) {
      throw new Error(`WHIRL LINE run ended with too few checkpoints reached (${reached})`)
    }
    if (passed < 1) {
      throw new Error('WHIRL LINE run ended without passing a single checkpoint')
    }
  },
}
