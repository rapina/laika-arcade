const observedCopy = new Map()
const paths = []
for (let offset = -126, index = 0; offset <= 126; offset += 18, index += 1) {
  const extent = Math.sqrt(Math.max(0, 134 ** 2 - offset ** 2))
  const left = 195 - extent
  const right = 195 + extent
  paths.push(index % 2 === 0
    ? { from: [left, 392 + offset], to: [right, 392 + offset] }
    : { from: [right, 392 + offset], to: [left, 392 + offset] })
}
let pathIndex = 0

function numericProgress(state) {
  return Number(state?.coverage ?? state?.accuracy ?? state?.phase ?? state?.clearedCells ?? 0)
}

async function visibleCopy(runner) {
  const canvasVisible = await runner.locator('canvas').isVisible().catch(() => false)
  const selector = canvasVisible ? '.game-exit-btn' : '.title-btn'
  return {
    surface: canvasVisible ? 'game' : 'title',
    text: (await runner.locator(selector).first().textContent())?.trim() ?? '',
  }
}

async function dragLogicalLine(runner, path) {
  await runner.locator('canvas').evaluate((canvas, value) => {
    const rect = canvas.getBoundingClientRect()
    const point = ([x, y]) => ({
      clientX: rect.left + x / 390 * rect.width,
      clientY: rect.top + y / 844 * rect.height,
    })
    const dispatch = (type, coordinates, buttons) => canvas.dispatchEvent(new PointerEvent(type, {
      ...coordinates,
      bubbles: true,
      cancelable: true,
      composed: true,
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      button: 0,
      buttons,
    }))
    const start = point(value.from)
    const end = point(value.to)
    dispatch('pointerdown', start, 1)
    for (let step = 1; step <= 32; step += 1) {
      const ratio = step / 32
      dispatch('pointermove', {
        clientX: start.clientX + (end.clientX - start.clientX) * ratio,
        clientY: start.clientY + (end.clientY - start.clientY) * ratio,
      }, 1)
    }
    dispatch('pointerup', end, 0)
  }, path)
}

export default {
  localeControlSelector: '.locale-btn',

  async waitForReady({ runner }) {
    await runner.waitForSelector('.title-btn', { timeout: 30_000 })
  },

  async assertLocale({ runner }, locale) {
    const current = await visibleCopy(runner)
    if (!current.text) throw new Error(`RIME ${locale} copy is empty`)
    const key = `${current.surface}:${locale}`
    observedCopy.set(key, current.text)
    const otherLocale = locale === 'ko' ? 'en' : 'ko'
    const other = observedCopy.get(`${current.surface}:${otherLocale}`)
    if (other && other === current.text) throw new Error(`RIME ${current.surface} copy did not change locale`)
  },

  async start({ runner }) {
    pathIndex = 0
    await runner.locator('.title-btn').first().click()
    await runner.waitForSelector('canvas', { timeout: 30_000 })
  },

  readState({ runner }) {
    return runner.evaluate(() => globalThis.__gameState ?? null)
  },

  hasProgressed(state) {
    return numericProgress(state) > 0
  },

  progressValue(state) {
    return numericProgress(state)
  },

  pauseToken(state) {
    return [numericProgress(state), state?.elapsedMs, state?.status]
  },

  isPaused(state) {
    return state?.paused === true
  },

  isMuted(state) {
    return state?.muted === true
  },

  async step({ runner, delay }) {
    await dragLogicalLine(runner, paths[pathIndex % paths.length])
    pathIndex += 1
    await delay(35)
  },

  isFinished(state) {
    return state?.over === true || state?.status === 'completed' || state?.status === 'timed-out'
  },

  shouldCapture(state) {
    return numericProgress(state) >= 45
  },

  screenshotLocator({ runner }) {
    return runner.locator('.mobile-frame-inner')
  },

  async waitForRestart({ runner }) {
    await runner.waitForFunction(() => {
      const state = globalThis.__gameState
      const progress = Number(state?.coverage ?? state?.accuracy ?? state?.phase ?? state?.clearedCells ?? 0)
      return state && progress === 0 && !state.over && ['idle', 'playing', undefined].includes(state.status)
    }, undefined, { timeout: 10_000 })
  },

  assertPortalResult(_context, { status, score, eventSequence }) {
    if (!status || ['플레이 중', 'PLAYING'].includes(status) || !score || score === '--' || !Number.isSafeInteger(eventSequence) || eventSequence < 1) {
      throw new Error(`RIME portal result mismatch: ${status} / ${score}`)
    }
  },

  assertFinal(state) {
    const coverage = numericProgress(state)
    if (!state || state.status !== 'completed' || coverage < 92) {
      throw new Error(`RIME autoplay did not reach 92% coverage (received ${coverage})`)
    }
  },
}
