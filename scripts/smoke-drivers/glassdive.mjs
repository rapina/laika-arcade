export default {
  reviewMode: 'fatal-only',
  viewport: { width: 390, height: 844 },

  async waitForReady({ runner }) {
    await runner.waitForSelector('canvas', { timeout: 30_000 })
    await runner.waitForFunction(() => globalThis.__gameState?.over === false, undefined, { timeout: 30_000 })
  },

  readState({ runner }) {
    return runner.evaluate(() => globalThis.__gameState ?? null)
  },

  async start({ runner }) {
    await runner.waitForSelector('canvas')
  },

  async step({ runner, page, delay }) {
    const canvas = runner.locator('canvas').last()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('glassdive canvas has no layout box')
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.72)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.48, { steps: 14 })
    await delay(450)
    await page.mouse.up()
  },

  screenshotLocator({ runner }) {
    return runner.locator('canvas').last()
  },
}
