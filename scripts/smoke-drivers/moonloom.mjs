export default {
  reviewMode: 'deployment-only',
  viewport: { width: 390, height: 844 },

  async waitForReady({ runner }) {
    await runner.waitForSelector('canvas', { timeout: 30_000 })
  },

  screenshotLocator({ runner }) {
    return runner.locator('canvas').last()
  },
}
