// 보라 유리를 감다: 판정에 들어가는 값은 봉을 도는 각속도 하나다. 드라이버도
// 사람과 같은 경로로 판단한다 — 봉 중심(설계 좌표 195, 300) 둘레를 실제 원으로
// 굴리고, 화면에 그려지는 목표 속도에 맞춰 다음 각도를 정한다.
const DESIGN_W = 390
const DESIGN_H = 844
const CX = 195
const CY = 300
const RADIUS = 120

async function frame(runner) {
  const box = await runner.locator('canvas').boundingBox()
  if (!box) throw new Error('VIOLET canvas has no layout box')
  const scale = Math.min(box.width / DESIGN_W, box.height / DESIGN_H)
  return {
    scale,
    ox: box.x + (box.width - DESIGN_W * scale) / 2,
    oy: box.y + (box.height - DESIGN_H * scale) / 2,
  }
}

function point(f, angle) {
  return [
    f.ox + (CX + Math.cos(angle) * RADIUS) * f.scale,
    f.oy + (CY + Math.sin(angle) * RADIUS) * f.scale,
  ]
}

// 목표 각속도(rev/s)를 그대로 손의 각속도로 굴린다. 유리는 손을 늦게 따라오므로
// 벌어진 만큼만 손을 앞세운다. 화면에 그려지는 값(goal, glassSpin)만 쓴다.
async function roll(runner, page, state, seconds) {
  const f = await frame(runner)
  const goal = Number(state?.goal ?? 1.4)
  const glass = Number(state?.glassSpin ?? 0)
  const lead = Math.max(-1.2, Math.min(1.2, goal - Math.abs(glass)))
  const rev = goal + lead * 0.6
  const steps = Math.max(6, Math.round(seconds * 30))
  const dt = seconds / steps

  let angle = Math.atan2(0, 1)
  const [sx, sy] = point(f, angle)
  await page.mouse.move(sx, sy)
  await page.mouse.down()
  for (let i = 1; i <= steps; i += 1) {
    angle += rev * 2 * Math.PI * dt
    const [x, y] = point(f, angle)
    await page.mouse.move(x, y)
    await new Promise((resolve) => setTimeout(resolve, dt * 1000))
  }
  await page.mouse.up()
}

export default {
  viewport: { width: 390, height: 844 },
  timeoutMs: 180_000,

  async waitForReady({ runner }) {
    await runner.waitForSelector('canvas', { timeout: 30_000 })
    await runner.waitForFunction(() => Boolean(globalThis.__gameState), undefined, { timeout: 30_000 })
  },

  async assertLocale({ runner }, locale) {
    let state = null
    for (let attempt = 0; attempt < 40; attempt += 1) {
      state = await runner.evaluate(() => globalThis.__gameState ?? null)
      if (state?.locale === locale) return
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    if (!state) throw new Error(`VIOLET ${locale} state is unavailable`)
  },

  async start({ runner, page }) {
    const state = await runner.evaluate(() => globalThis.__gameState ?? null)
    await roll(runner, page, state, 0.8)
  },

  readState({ runner }) { return runner.evaluate(() => globalThis.__gameState ?? null) },
  hasProgressed(state) { return Number(state?.elapsed ?? 0) > 0 },
  progressValue(state) { return Number(state?.beadsDone ?? 0) * 10 + Number(state?.drops ?? 0) },
  pauseToken(state) { return [state?.beadIndex, state?.beadsDone, state?.drops, state?.over] },
  isPaused(state) { return state?.paused === true },
  isMuted(state) { return state?.muted === true },

  async step({ runner, page, delay }, state) {
    if (!state?.over) await roll(runner, page, state, 0.9)
    await delay(120)
  },

  isFinished(state) { return state?.over === true },
  shouldCapture(state) { return Number(state?.beadsDone ?? 0) >= 1 && !state?.over },
  screenshotLocator({ runner }) { return runner.locator('canvas') },

  assertPortalResult(_context, { score, eventSequence }) {
    if (!score || score === '--' || !Number.isSafeInteger(eventSequence) || eventSequence < 1) {
      throw new Error(`VIOLET portal result mismatch: ${score}`)
    }
  },

  assertFinal(state) {
    if (!state?.over) throw new Error('VIOLET autoplay did not reach a terminal result')
    const beads = Number(state?.beadsDone ?? 0)
    const drops = Number(state?.drops ?? 0)
    if (beads < 1 && drops < 3) throw new Error('VIOLET run ended without a judged outcome')
  },
}
