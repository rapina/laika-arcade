import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import { gzipSync } from 'node:zlib'

const root = resolve(import.meta.dirname, '..')
const publicDir = join(root, 'public')
const catalog = JSON.parse(readFileSync(join(publicDir, 'catalog/games.json'), 'utf8'))
const vercelConfig = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'))

if (catalog.schemaVersion !== 2 || !Array.isArray(catalog.games) || catalog.games.length === 0) {
  throw new Error('catalog schema is invalid')
}

if (catalog.studio?.name !== 'Sputnik Workshop' || catalog.studio?.maker !== 'Laika') {
  throw new Error('catalog studio metadata is invalid')
}

const requiredLocales = ['ko', 'en']
const requiredCopy = ['title', 'oneLine', 'instruction', 'duration', 'input']
const slugPattern = /^[a-z][a-z0-9-]{0,63}$/
const versionPattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/
const bridgeModes = new Set(['contract-v1', 'legacy-run-v1'])

function filesIn(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? filesIn(path) : [path]
  })
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function releasePrefix(game) {
  if (!slugPattern.test(game.slug ?? '')) throw new Error(`${game.slug ?? '<missing>'}: slug is invalid`)
  if (!versionPattern.test(game.artifact?.version ?? '')) throw new Error(`${game.slug}: artifact version is invalid`)
  return `/__game-assets/games/${game.slug}/${game.artifact.version}/`
}

function isReleaseUrl(value, prefix, exact = false) {
  if (
    typeof value !== 'string' ||
    !value.startsWith(prefix) ||
    value.includes('%') ||
    value.includes('\\') ||
    value.slice(1).includes('//') ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) return false
  const url = new URL(value, 'https://arcade.invalid')
  const releasePath = value.slice(prefix.length)
  const hasCanonicalSegments = exact
    ? releasePath === ''
    : releasePath.length > 0 && releasePath.split('/').every((segment) => segment && segment !== '.' && segment !== '..')
  return url.origin === 'https://arcade.invalid'
    && url.pathname === value
    && hasCanonicalSegments
    && !url.search
    && !url.hash
}

function localizedString(value, label, optional = false) {
  if (value === undefined && optional) return
  if (typeof value === 'string') {
    if (!value || value.length > 32) throw new Error(`${label} is invalid`)
    return
  }
  if (!value || typeof value !== 'object') throw new Error(`${label} is invalid`)
  for (const locale of requiredLocales) {
    if (typeof value[locale] !== 'string' || value[locale].length > 32) {
      throw new Error(`${label}.${locale} is invalid`)
    }
  }
}

function validateMetric(metric, label) {
  if (!metric || typeof metric !== 'object') throw new Error(`${label} is required`)
  if (!/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(metric.field ?? '')) throw new Error(`${label}.field is invalid`)
  if (!Number.isInteger(metric.fractionDigits) || metric.fractionDigits < 0 || metric.fractionDigits > 3) {
    throw new Error(`${label}.fractionDigits is invalid`)
  }
  if (metric.useGrouping !== undefined && typeof metric.useGrouping !== 'boolean') {
    throw new Error(`${label}.useGrouping is invalid`)
  }
  localizedString(metric.prefix, `${label}.prefix`, true)
  localizedString(metric.suffix, `${label}.suffix`, true)
}

function validateResultDisplay(game) {
  const display = game.resultDisplay
  if (!display || typeof display !== 'object') throw new Error(`${game.slug}: resultDisplay is required`)
  validateMetric(display.primary, `${game.slug}: resultDisplay.primary`)
  if (display.secondary !== undefined && display.secondary !== null) {
    validateMetric(display.secondary, `${game.slug}: resultDisplay.secondary`)
  }
  if (display.separator !== undefined && (typeof display.separator !== 'string' || display.separator.length > 8)) {
    throw new Error(`${game.slug}: resultDisplay.separator is invalid`)
  }
  if (display.status !== undefined) {
    if (!/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/.test(display.status?.field ?? '')) {
      throw new Error(`${game.slug}: resultDisplay.status.field is invalid`)
    }
    localizedString(display.status.whenTrue, `${game.slug}: resultDisplay.status.whenTrue`)
    localizedString(display.status.whenFalse, `${game.slug}: resultDisplay.status.whenFalse`)
  }
}

function safeAssetPath(fixture, value, slug) {
  if (
    typeof value !== 'string' ||
    !value ||
    value.startsWith('/') ||
    value.includes('%') ||
    value.includes('\\') ||
    /[\u0000-\u001f\u007f]/.test(value) ||
    value.split('/').some((part) => !part || part === '.' || part === '..')
  ) {
    throw new Error(`${slug}: unsafe release asset path`)
  }
  const path = resolve(fixture, value)
  if (!path.startsWith(`${fixture}${sep}`)) throw new Error(`${slug}: release asset escapes fixture`)
  return path
}

function verifyLocalRelease(game, prefix, artwork) {
  const fixture = resolve(publicDir, prefix.replace(/^\/+/, ''))
  const releasePath = join(fixture, 'release.json')
  if (!existsSync(releasePath)) throw new Error(`${game.slug}: local fixture release.json is missing`)
  if (lstatSync(releasePath).isSymbolicLink() || !statSync(releasePath).isFile()) {
    throw new Error(`${game.slug}: local fixture release.json must be a regular file`)
  }
  const fixtureRealPath = realpathSync(fixture)
  const publicRealPath = realpathSync(publicDir)
  if (!fixtureRealPath.startsWith(`${publicRealPath}${sep}`)) {
    throw new Error(`${game.slug}: local fixture escapes the public directory`)
  }

  const release = JSON.parse(readFileSync(releasePath, 'utf8'))
  const catalogRelease = game.artifact.release
  if (!catalogRelease || typeof catalogRelease !== 'object') throw new Error(`${game.slug}: catalog release metadata is missing`)
  if (release.contractVersion !== 1 || release.gameId !== game.slug || release.slug !== game.slug) {
    throw new Error(`${game.slug}: release identity mismatch`)
  }
  if (typeof release.releaseSha !== 'string' || !release.releaseSha) throw new Error(`${game.slug}: release SHA is invalid`)

  const { manifestSha256, ...manifestPayload } = release
  const computedManifest = sha256(JSON.stringify(manifestPayload))
  if (manifestSha256 !== computedManifest) throw new Error(`${game.slug}: release manifest hash is invalid`)
  for (const key of ['releaseSha', 'manifestSha256', 'files', 'bytes', 'codeGzipBytes']) {
    if (release[key] !== catalogRelease[key]) throw new Error(`${game.slug}: catalog ${key} mismatch`)
  }

  if (!Array.isArray(release.assets) || release.assets.length !== release.files) {
    throw new Error(`${game.slug}: release file count mismatch`)
  }
  const listedPaths = new Set()
  let totalBytes = 0
  let codeGzipBytes = 0
  for (const asset of release.assets) {
    const path = safeAssetPath(fixture, asset.path, game.slug)
    if (listedPaths.has(asset.path)) throw new Error(`${game.slug}: duplicate release asset ${asset.path}`)
    listedPaths.add(asset.path)
    if (!existsSync(path) || lstatSync(path).isSymbolicLink() || !statSync(path).isFile()) {
      throw new Error(`${game.slug}: missing or unsafe release asset ${asset.path}`)
    }
    const realPath = realpathSync(path)
    if (!realPath.startsWith(`${fixtureRealPath}${sep}`)) {
      throw new Error(`${game.slug}: release asset escapes fixture ${asset.path}`)
    }
    const content = readFileSync(path)
    if (content.byteLength !== asset.bytes || sha256(content) !== asset.sha256) {
      throw new Error(`${game.slug}: release asset integrity mismatch for ${asset.path}`)
    }
    if (asset.bytes > 4 * 1024 * 1024) throw new Error(`${game.slug}: release asset exceeds 4 MB`)
    if (/\.(?:m?js)$/.test(asset.path)) codeGzipBytes += gzipSync(content).byteLength
    totalBytes += content.byteLength
  }

  const actualPaths = filesIn(fixture)
    .map((path) => relative(fixture, path).split(sep).join('/'))
    .filter((path) => path !== 'release.json')
    .sort()
  if (actualPaths.length !== listedPaths.size || actualPaths.some((path) => !listedPaths.has(path))) {
    throw new Error(`${game.slug}: fixture files differ from release assets`)
  }
  if (totalBytes !== release.bytes || totalBytes > 8 * 1024 * 1024) throw new Error(`${game.slug}: release byte total mismatch`)
  if (codeGzipBytes !== release.codeGzipBytes || codeGzipBytes > 520 * 1024) {
    throw new Error(`${game.slug}: release code gzip mismatch`)
  }

  if (!listedPaths.has(release.entry) || game.artifact.entryUrl !== `${prefix}${release.entry}`) {
    throw new Error(`${game.slug}: catalog entry mismatch`)
  }
  const expectedStyles = release.style ? [`${prefix}${release.style}`] : []
  if (release.style && !listedPaths.has(release.style)) {
    throw new Error(`${game.slug}: release style is not listed as an asset`)
  }
  if (
    game.artifact.styleUrls.length !== expectedStyles.length ||
    game.artifact.styleUrls.some((url, index) => url !== expectedStyles[index])
  ) {
    throw new Error(`${game.slug}: catalog style mismatch`)
  }

  const releaseArtwork = release.media?.makerIllustration
  if (releaseArtwork?.baseId !== artwork.baseId || !Array.isArray(releaseArtwork.sources)) {
    throw new Error(`${game.slug}: release artwork metadata mismatch`)
  }
  for (const source of artwork.sources) {
    const path = source.url.slice(prefix.length)
    const releaseSource = releaseArtwork.sources.find((candidate) => candidate.path === path)
    const asset = release.assets.find((candidate) => candidate.path === path)
    if (!releaseSource || !asset || releaseSource.sha256 !== asset.sha256) {
      throw new Error(`${game.slug}: artwork is missing from release metadata`)
    }
  }
  if (release.assets.some((asset) => /laika.*\.png$/i.test(asset.path))) {
    throw new Error(`${game.slug}: source Laika PNG must not ship in release`)
  }
}

const slugs = new Set()
const sequences = new Set()
const runnerVersions = new Set()
for (const game of catalog.games) {
  const prefix = releasePrefix(game)
  if (slugs.has(game.slug)) throw new Error(`${game.slug}: duplicate slug`)
  slugs.add(game.slug)
  if (!Number.isInteger(game.sequence) || game.sequence < 1 || sequences.has(game.sequence)) {
    throw new Error(`${game.slug}: sequence is invalid or duplicated`)
  }
  sequences.add(game.sequence)

  if (
    game.credits?.studio !== 'Sputnik Workshop' ||
    game.credits?.creator !== 'Laika' ||
    game.credits?.role !== 'autonomous game-making agent'
  ) {
    throw new Error(`${game.slug}: creator metadata is invalid`)
  }
  if (!requiredLocales.every((locale) => game.supportedLocales?.includes(locale))) {
    throw new Error(`${game.slug}: ko/en support is required`)
  }
  for (const locale of requiredLocales) {
    const content = game.content?.[locale]
    if (!content || !requiredCopy.every((key) => typeof content[key] === 'string' && content[key].trim())) {
      throw new Error(`${game.slug}: ${locale} copy is incomplete`)
    }
    if (!Array.isArray(content.why) || content.why.length === 0 || content.why.some((line) => !line.trim())) {
      throw new Error(`${game.slug}: ${locale} maker note is incomplete`)
    }
    if (!Array.isArray(content.designNotes) || content.designNotes.length === 0) {
      throw new Error(`${game.slug}: ${locale} design notes are incomplete`)
    }
  }
  const designIds = requiredLocales.map((locale) => game.content[locale].designNotes.map((note) => note.id).join(','))
  if (new Set(designIds).size !== 1) throw new Error(`${game.slug}: design note ids differ by locale`)
  validateResultDisplay(game)

  if (!/^v[1-9][0-9]*$/.test(game.artifact.runnerVersion ?? '')) throw new Error(`${game.slug}: runner version is invalid`)
  runnerVersions.add(game.artifact.runnerVersion)
  const bridgeMode = game.artifact.bridgeMode ?? 'contract-v1'
  if (!bridgeModes.has(bridgeMode)) throw new Error(`${game.slug}: bridge mode is invalid`)

  const artwork = game.artwork
  if (artwork?.baseId !== 'laika-base-v1') throw new Error(`${game.slug}: Laika base id is invalid`)
  if (![artwork.focalPoint?.x, artwork.focalPoint?.y].every((value) => Number.isFinite(value) && value >= 0 && value <= 1)) {
    throw new Error(`${game.slug}: artwork focal point is invalid`)
  }
  if (!requiredLocales.every((locale) => typeof artwork.alt?.[locale] === 'string' && artwork.alt[locale].trim())) {
    throw new Error(`${game.slug}: artwork ko/en alt is required`)
  }
  if (!Array.isArray(artwork.sources) || artwork.sources.length !== 2) {
    throw new Error(`${game.slug}: artwork requires card and detail sources`)
  }
  for (const source of artwork.sources) {
    if (!isReleaseUrl(source.url, prefix)) throw new Error(`${game.slug}: artwork escapes its release prefix`)
    if (!Number.isInteger(source.width) || !Number.isInteger(source.height) || source.type !== 'image/jpeg') {
      throw new Error(`${game.slug}: artwork source metadata is invalid`)
    }
  }

  if (!isReleaseUrl(game.artifact.entryUrl, prefix)) throw new Error(`${game.slug}: entry escapes its release prefix`)
  if (!isReleaseUrl(game.artifact.assetBaseUrl, prefix, true)) throw new Error(`${game.slug}: asset base must equal its release prefix`)
  if (!Array.isArray(game.artifact.styleUrls) || !game.artifact.styleUrls.every((url) => isReleaseUrl(url, prefix))) {
    throw new Error(`${game.slug}: style escapes its release prefix`)
  }

  if (game.artifact.status === 'local') {
    if (game.status !== 'local-preview' || game.artifact.version !== 'local-fixture') {
      throw new Error(`${game.slug}: local artifact state is inconsistent`)
    }
    verifyLocalRelease(game, prefix, artwork)
  } else if (game.artifact.status === 'published') {
    const release = game.artifact.release
    if (game.status !== 'published') throw new Error(`${game.slug}: published game status is required`)
    if (!/^[a-f0-9]{40}$/.test(game.artifact.version) || game.artifact.version !== release?.releaseSha) {
      throw new Error(`${game.slug}: published artifact must pin a full release SHA`)
    }
    if (!/^[a-f0-9]{64}$/.test(release?.manifestSha256 ?? '')) {
      throw new Error(`${game.slug}: published manifest hash is invalid`)
    }
    if (
      !Number.isSafeInteger(release.files) || release.files < 1 ||
      !Number.isSafeInteger(release.bytes) || release.bytes < 1 || release.bytes > 8 * 1024 * 1024 ||
      !Number.isSafeInteger(release.codeGzipBytes) || release.codeGzipBytes < 1 || release.codeGzipBytes > 520 * 1024
    ) {
      throw new Error(`${game.slug}: published release budgets are invalid`)
    }
    if (game.artifact.source?.kind !== 'vercel-blob') {
      throw new Error(`${game.slug}: published artifact source must be vercel-blob`)
    }
  } else {
    throw new Error(`${game.slug}: artifact status is invalid`)
  }
}

const orderedSequences = [...sequences].sort((a, b) => a - b)
if (orderedSequences.some((sequence, index) => sequence !== index + 1)) {
  throw new Error('catalog sequences must be continuous from 1')
}

if (catalog.games.some((game) => game.artifact.status === 'published')) {
  const assetRewrites = (vercelConfig.rewrites ?? []).filter((rewrite) => rewrite.source === '/__game-assets/:path*')
  if (
    assetRewrites.length !== 1 ||
    !/^https:\/\/[a-zA-Z0-9-]+\.public\.blob\.vercel-storage\.com\/:path\*$/.test(assetRewrites[0].destination)
  ) {
    throw new Error('published games require one Public Blob asset rewrite')
  }
}

for (const version of runnerVersions) {
  const runnerDirectory = join(publicDir, 'runner', version)
  const runnerIndexPath = join(runnerDirectory, 'index.html')
  const runnerScriptPath = join(runnerDirectory, 'runner.js')
  if (!existsSync(runnerIndexPath) || !statSync(runnerIndexPath).isFile()) {
    throw new Error(`${version}: runner index.html is missing`)
  }
  if (!existsSync(runnerScriptPath) || !statSync(runnerScriptPath).isFile()) {
    throw new Error(`${version}: runner.js is missing`)
  }

  const runnerHtml = readFileSync(runnerIndexPath, 'utf8')
  const expectedScript = `/runner/${version}/runner.js`
  const scriptTags = [...runnerHtml.matchAll(/<script\b[^>]*>/gi)].map((match) => match[0])
  const bootstrap = scriptTags.find((tag) => tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1] === expectedScript)
  if (!bootstrap) throw new Error(`${version}: runner bootstrap script is missing`)
  if (/\btype\s*=\s*["']module["']/i.test(bootstrap)) {
    throw new Error(`${version}: sandbox runner bootstrap must remain a classic script`)
  }

  const runnerReferences = [...runnerHtml.matchAll(/(?:src|href)=["'](\/runner\/[^"']+)["']/gi)]
    .map((match) => match[1])
  for (const reference of runnerReferences) {
    if (
      !reference.startsWith(`/runner/${version}/`) ||
      reference.includes('%') ||
      reference.includes('\\') ||
      reference.slice(1).includes('//') ||
      reference.split('/').some((part, index) => index > 0 && (!part || part === '.' || part === '..'))
    ) {
      throw new Error(`${version}: runner asset path is invalid`)
    }
    const target = resolve(publicDir, reference.replace(/^\/+/, ''))
    if (!target.startsWith(`${publicDir}${sep}`) || !existsSync(target) || !statSync(target).isFile()) {
      throw new Error(`${version}: runner asset is missing: ${reference}`)
    }
  }
}

for (const file of filesIn(publicDir).filter((path) => path.endsWith('.js') || path.endsWith('.mjs'))) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' })
}

const play = readFileSync(join(publicDir, 'play.html'), 'utf8')
if (!play.includes('sandbox="allow-scripts"')) throw new Error('player iframe sandbox changed')
if (/sandbox="[^"]*allow-same-origin/.test(play)) throw new Error('player iframe must keep an opaque origin')

console.log(`Validated arcade catalog, sandbox, and ${catalog.games.length} game ${catalog.games.length === 1 ? 'entry' : 'entries'}`)
