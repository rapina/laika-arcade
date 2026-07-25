// 안식각 / Repose portal smoke driver.
//
// The core verb is a horizontal drag that decides where the sand peak will come
// to rest. The sand arrives late, so this driver aims where the line of light is
// going, exactly as the on-screen guidance tells the player to. It reads only the
// two values the screen itself shows (the peak mark and the line), estimates the
// line's direction the way an eye does, and never calls a judgement function.

const DESIGN_W = 390
const DESIGN_H = 844
const CENTER_X = 195
// 화면이 가르치는 그대로: 엄지가 멈춘 가로 자리가 봉우리의 도착점이다.
const PIXELS_PER_TILT = 99
const POINTER_SPAN = 171
const LINE_MIN = 112
const LINE_MAX = 278
// 뒤로 갈수록 모래가 더 늦게 온다. 화면의 갈매기표가 그리는 앞섬과 같은 크기다.
const LEAD_SECONDS = [1.37, 1.47, 1.61, 1.76, 1.92]

let started = false
let restartConfirmed = false
let previous = null

async function frame(runner) {
  const box = await runner.locator('canvas').last().boundingBox()
  if (!box) throw new Error('REPOSE canvas has no layout box')
  const scale = Math.min(box.width / DESIGN_W, box.height / DESIGN_H)
  return {
    box,
    scale,
    ox: box.x + (box.width - DESIGN_W * scale) / 2,
    oy: box.y + (box.height - DESIGN_H * scale) / 2,
  }
}

/** 화면의 선이 어디로 가고 있는지. 두 번의 관측으로 눈이 하는 것과 같이 잰다. */
function aimTarget(state) {
  const now = Date.now()
  const last = previous
  previous = { lineX: state.lineX, at: now }
  let velocity = 0
  if (last) {
    const dt = (now - last.at) / 1000
    if (dt > 0.05 && dt < 2) velocity = (state.lineX - last.lineX) / dt
  }
  const band = Math.min(4, Math.max(0, Number(state.band ?? 1) - 1))
  let target = state.lineX + velocity * LEAD_SECONDS[band]
  if (target < LINE_MIN) target = LINE_MIN + (LINE_MIN - target)
  if (target > LINE_MAX) target = LINE_MAX - (target - LINE_MAX)
  return Math.min(LINE_MAX, Math.max(LINE_MIN, target))
}

async function tapAt(runner, page, designX, designY) {
  const f = await frame(runner)
  const x = f.ox + designX * f.scale
  const y = f.oy + designY * f.scale
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x, y)
  await page.mouse.up()
}

export default {
  viewport: { width: 390, height: 844 },
  timeoutMs: 240_000,

  async waitForReady({ runner }) {
    await runner.waitForSelector('canvas', { timeout: 30_000 })
    await runner.waitForFunction(() => Boolean(globalThis.__gameState), undefined, { timeout: 30_000 })
  },

  // 이 게임의 런타임은 언어를 상태로 공표하지 않는다. 호스트가 언어를 소유하고
  // 러너를 통해 넘기므로, 여기서는 언어 명령 뒤에도 같은 판이 살아 있는지만
  // 확인한다. 화면 문구가 실제로 두 언어로 나오는 것은 두 언어의 플레이 화면
  // 캡처로 따로 확인한다.
  async assertLocale({ runner }) {
    await runner.waitForFunction(() => Boolean(globalThis.__gameState), undefined, { timeout: 10_000 })
  },

  async start({ runner, page }) {
    // 타이틀에서 한 번 눌러 판을 열고, 가운데를 눌러 첫 판 안내의 정지를 푼다.
    await tapAt(runner, page, CENTER_X, DESIGN_H * 0.5)
    await tapAt(runner, page, CENTER_X, 760)
    started = true
  },

  readState({ runner }) { return runner.evaluate(() => globalThis.__gameState ?? null) },
  hasProgressed(state) { return Number(state?.judgments ?? 0) > 0 },
  progressValue(state) { return Number(state?.judgments ?? 0) },
  pauseToken(state) { return [state?.judgments, state?.misses, state?.score, state?.over] },
  isPaused(state) { return state?.paused === true },

  async step({ runner, page, delay }, state) {
    if (!started) {
      await this.start({ runner, page })
      await delay(120)
      return
    }
    if (state?.over) {
      if (!restartConfirmed) {
        // 종료 직후에는 보호 시간이 있다. 지나기를 기다렸다가 결과를 확인한다.
        await delay(900)
        restartConfirmed = true
      }
      await delay(100)
      return
    }
    const wanted = aimTarget(state)
    const tilt = Math.max(-1, Math.min(1, (wanted - CENTER_X) / PIXELS_PER_TILT))
    await tapAt(runner, page, CENTER_X + tilt * POINTER_SPAN, 760)
    await delay(180)
  },

  isFinished(state) { return state?.over === true },
  shouldCapture(state) { return Number(state?.judgments ?? 0) >= 4 && !state?.over },
  screenshotLocator({ runner }) { return runner.locator('canvas').last() },

  assertPortalResult(_context, { score, eventSequence }) {
    if (!score || score === '--' || !Number.isSafeInteger(eventSequence) || eventSequence < 1) {
      throw new Error(`REPOSE portal result mismatch: ${score}`)
    }
  },

  assertFinal(state) {
    if (!state?.over) throw new Error('REPOSE autoplay did not reach a terminal result')
    // 판이 실제로 플레이됐는지 본다: 여러 번 재고, 규칙이 끝냈다.
    if (Number(state?.judgments ?? 0) < 8) {
      throw new Error('REPOSE run ended before enough measurements were taken')
    }
    if (Number(state?.misses ?? 0) < 3 && Number(state?.judgments ?? 0) < 44) {
      throw new Error('REPOSE run ended without spending the failure budget or finishing')
    }
    if (Number(state?.precise ?? 0) < 1) {
      throw new Error('REPOSE run never reached the top grade')
    }
  },
}
