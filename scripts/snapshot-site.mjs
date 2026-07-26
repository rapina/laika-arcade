import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const require = createRequire(import.meta.url)
const { chromium } = require(resolve(
  import.meta.dirname,
  '../../games/2026/2026-07-14-stitch/node_modules/playwright-core',
))
const output = resolve(import.meta.dirname, '../qa')
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })

try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  await desktop.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' })
  await desktop.screenshot({ path: resolve(output, 'arcade-home.png'), fullPage: true })
  await desktop.goto('http://127.0.0.1:4173/?lang=en', { waitUntil: 'networkidle' })
  await desktop.screenshot({ path: resolve(output, 'arcade-home-en.png'), fullPage: true })

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await mobile.goto('http://127.0.0.1:4173/?lang=ko', { waitUntil: 'networkidle' })
  await mobile.screenshot({ path: resolve(output, 'arcade-home-mobile.png'), fullPage: true })
  await mobile.goto('http://127.0.0.1:4173/making?lang=ko', { waitUntil: 'networkidle' })
  await mobile.screenshot({ path: resolve(output, 'arcade-making-mobile.png'), fullPage: true })
  await mobile.goto('http://127.0.0.1:4173/making?lang=en', { waitUntil: 'networkidle' })
  await mobile.screenshot({ path: resolve(output, 'arcade-making-mobile-en.png'), fullPage: true })

  const narrow = await browser.newPage({ viewport: { width: 320, height: 800 } })
  await narrow.goto('http://127.0.0.1:4173/making?lang=ko', { waitUntil: 'networkidle' })
  const hasHorizontalOverflow = await narrow.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  if (hasHorizontalOverflow) throw new Error('making page overflows at 320px')
  await narrow.screenshot({ path: resolve(output, 'arcade-making-320.png'), fullPage: true })
  await narrow.close()
} finally {
  await browser.close()
}
