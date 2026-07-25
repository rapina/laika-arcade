const labels = new Map()

// Pours are driven by computed hold durations: the engine is deterministic
// (level rises at effRate %/s of simulated time), so we release after
// (target − margin) / effRate seconds instead of chasing the 100ms-polled
// state, which is too stale for the ±% windows.
async function pourOnce(runner) {
    await runner.evaluate(async () => {
        const gs = () => globalThis.__gameState
        const frame = () => new Promise((r) => requestAnimationFrame(() => r(undefined)))
        const s = gs()
        if (!s || s.phase !== 'pour' || s.held || s.over) return
        const canvas = document.querySelector('canvas')
        if (!canvas) return
        canvas.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
        await frame(); await frame() // the press is consumed on the next sim frame
        const holdMs = Math.max(0, ((s.target - 1.6) / s.effRate) * 1000)
        const t0 = performance.now()
        while (performance.now() - t0 < holdMs) await frame()
        window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))
    })
}

export default {
    viewport: { width: 390, height: 844 },
    localeControlSelector: '[data-action="lang"]',
    timeoutMs: 90_000,

    async waitForReady({ runner }) {
        await runner.waitForSelector('canvas', { timeout: 30_000 })
        await runner.waitForFunction(() => Boolean(globalThis.__gameState))
    },

    async assertLocale({ runner }, locale) {
        const label = await runner.locator('canvas').getAttribute('aria-label')
        if (!label) throw new Error(`GLAZE ${locale} accessible label is empty`)
        labels.set(locale, label)
        const other = labels.get(locale === 'ko' ? 'en' : 'ko')
        if (other && other === label) throw new Error('GLAZE locale label did not change')
    },

    async start({ runner }) {
        await pourOnce(runner)
    },

    async readState({ runner }) {
        // The final tableau waits for a confirming tap before reporting the
        // run — deliver that tap here so the portal receives game:over.
        return runner.evaluate(async () => {
            const s = globalThis.__gameState ?? null
            if (s?.over && s?.awaitingContinue) {
                const t0 = performance.now()
                const frame = () => new Promise((r) => requestAnimationFrame(() => r(undefined)))
                while (performance.now() - t0 < 1300) await frame()
                document.querySelector('canvas')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
            }
            return globalThis.__gameState ?? null
        })
    },

    hasProgressed(state) { return Number(state?.seq ?? 0) >= 2 },
    progressValue(state) { return Number(state?.seq ?? 0) },
    isMuted(state) { return state?.muted === true },
    async step(context, state) {
        if (state?.phase === 'pour' && !state?.held) await pourOnce(context.runner)
        await context.delay(60)
    },
    isFinished(state) { return state?.over === true && state?.awaitingContinue === false },
    shouldCapture(state) { return Number(state?.cup ?? 0) >= 8 && !state?.over },
    screenshotLocator({ runner }) { return runner.locator('.game-host') },

    assertPortalResult(_context, { score, eventSequence }) {
        if (!score || score === '--' || !Number.isSafeInteger(eventSequence) || eventSequence < 1) {
            throw new Error(`GLAZE portal result mismatch: ${score}`)
        }
    },

    assertFinal(state) {
        if (!state?.over || state.outcome !== 'complete' || Number(state.score) <= 0) {
            throw new Error('GLAZE autoplay did not finish all eighteen cups')
        }
    },
}
