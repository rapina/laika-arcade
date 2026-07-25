const DESIGN_W = 390
const DESIGN_H = 844

async function canvasFrame(runner) {
  const canvas = runner.locator('canvas').last()
  const box = await canvas.boundingBox()
  if (!box) throw new Error('GARDENGAPS canvas has no layout box')
  return { canvas, box }
}

async function visibleCue(runner, page) {
  const { box } = await canvasFrame(runner)
  const scale = box.width / DESIGN_W
  const shot = await page.screenshot({
    clip: {
      x: box.x,
      y: box.y + 424 * scale,
      width: box.width,
      height: 30 * scale,
    },
  })
  const cue = await page.evaluate(async (base64) => {
    const image = new Image()
    image.src = `data:image/png;base64,${base64}`
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = image.width
    canvas.height = image.height
    const context = canvas.getContext('2d')
    context.drawImage(image, 0, 0)
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
    let count = 0
    let leftmost = 390
    let upper = 0
    let lower = 0
    for (let y = 0; y < canvas.height; y += 1) {
      const designY = 424 + y * 30 / canvas.height
      if (designY < 426 || designY > 452) continue
      for (let x = 0; x < canvas.width; x += 1) {
        const offset = (y * canvas.width + x) * 4
        const [r, g, b] = [pixels[offset], pixels[offset + 1], pixels[offset + 2]]
        if (g > 135 && b > 120 && r < 90) {
          leftmost = Math.min(leftmost, x * 390 / canvas.width)
          count += 1
          if (designY >= 435 && designY < 440) upper += 1
          if (designY > 440 && designY <= 445) lower += 1
        }
      }
    }
    if (count < 20) throw new Error(`GARDENGAPS visible leaf cue missing: ${count}`)
    // Reeds can cover the first few tips after earlier moves. Their 44px rhythm
    // remains visible, while the bowed connector tells us left (upper) or right
    // (lower). Fit only those two pieces of visible geometry.
    const negative = upper > lower
    const phase = ((leftmost - 62 + 22) % 44 + 44) % 44 - 22
    let target = negative ? -1 : 1
    let best = Infinity
    for (let value = negative ? -78 : 1; value <= (negative ? -1 : 78); value += 1) {
      const predicted = Math.max(-78, value - 30) * 0.65 - 9
      const predictedPhase = ((predicted + 22) % 44 + 44) % 44 - 22
      const distance = Math.min(Math.abs(phase - predictedPhase), 44 - Math.abs(phase - predictedPhase))
      if (distance < best) { best = distance; target = value }
    }
    return { target }
  }, shot.toString('base64'))
  const centers = await runner.evaluate(() => globalThis.__gardenVisibleNodeCenters)
  return { ...cue, centers }
}

async function dragVisibleGap(runner, page, state, naturalShort = false) {
  const { box } = await canvasFrame(runner)
  const cue = await visibleCue(runner, page)
  const node = naturalShort ? 0 : 6
  const center = cue.centers?.[node]
  if (!center) throw new Error('GARDENGAPS visible knot center missing')
  const scale = box.width / DESIGN_W
  const fromX = box.x + center.x * scale
  const y = box.y + 440 * scale
  const intended = naturalShort
    ? Math.sign(cue.target) * 12
    : Math.max(-78, Math.min(78, cue.target))
  process.stdout.write(`gardengaps cue target=${cue.target} intended=${intended} node=${node}\n`)
  await page.mouse.move(fromX, y)
  await page.mouse.down()
  await page.mouse.move(fromX + intended * scale, y, { steps: 10 })
  await page.mouse.up()
}

export default {
  viewport: { width: 390, height: 844 },
  timeoutMs: 480_000,

  async waitForReady({ runner }) {
    await runner.waitForSelector('canvas', { timeout: 30_000 })
    await runner.waitForFunction(
      () => globalThis.__gameState?.section === 0
        && globalThis.__gardenVisibleNodeCenters?.length === 7,
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

  readState({ runner }) {
    return runner.evaluate(() => globalThis.__gameState ?? null)
  },
  hasProgressed(state) { return Number(state?.section ?? 0) > 0 },
  progressValue(state) { return Number(state?.section ?? 0) },

  async start({ runner, page, delay }) {
    const started = Date.now()
    await dragVisibleGap(runner, page, null, true)
    process.stdout.write(`gardengaps start: ${Date.now() - started}ms\n`)
    await delay(650)
  },

  async step({ runner, page, delay }, state) {
    if (state?.over || state?.passing) {
      await delay(80)
      return
    }
    const started = Date.now()
    await dragVisibleGap(runner, page, state)
    process.stdout.write(`gardengaps step ${state?.section ?? 0}: ${Date.now() - started}ms\n`)
    await delay(650)
  },

  isFinished(state) { return state?.over === true },
  shouldCapture() { return false },
  screenshotLocator({ runner }) { return runner.locator('canvas').last() },

  assertPortalResult(_context, { score, eventSequence }) {
    if (Number.parseInt(String(score), 10) !== 8 || !Number.isSafeInteger(eventSequence) || eventSequence < 1) {
      throw new Error(`GARDENGAPS portal result mismatch: ${score}`)
    }
  },

  assertFinal(state) {
    if (state?.over !== true || Number(state?.section) !== 8 || Number(state?.failures) >= 3) {
      throw new Error(`GARDENGAPS did not reach the wet leaf: ${JSON.stringify(state)}`)
    }
  },
}
