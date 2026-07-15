import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const publicDir = join(root, 'public')
const catalog = JSON.parse(readFileSync(join(publicDir, 'catalog/games.json'), 'utf8'))
JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'))

if (catalog.schemaVersion !== 2 || !Array.isArray(catalog.games) || catalog.games.length === 0) {
  throw new Error('catalog schema is invalid')
}

if (catalog.studio?.name !== 'Sputnik Workshop' || catalog.studio?.maker !== 'Laika') {
  throw new Error('catalog studio metadata is invalid')
}

const requiredLocales = ['ko', 'en']
const requiredCopy = ['title', 'oneLine', 'instruction', 'duration', 'input']

for (const game of catalog.games) {
  if (game.credits?.studio !== 'Sputnik Workshop' || game.credits?.creator !== 'Laika') {
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

  const prefix = `/__game-assets/games/${game.slug}/${game.artifact.version}/`
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
    if (!source.url.startsWith(prefix)) throw new Error(`${game.slug}: artwork escapes its release prefix`)
    if (!Number.isInteger(source.width) || !Number.isInteger(source.height) || source.type !== 'image/jpeg') {
      throw new Error(`${game.slug}: artwork source metadata is invalid`)
    }
  }
  if (!game.artifact.entryUrl.startsWith(prefix)) throw new Error(`${game.slug}: entry escapes its release prefix`)
  if (!game.artifact.assetBaseUrl.startsWith(prefix)) throw new Error(`${game.slug}: asset base escapes its release prefix`)
  if (!game.artifact.styleUrls.every((url) => url.startsWith(prefix))) throw new Error(`${game.slug}: style escapes its release prefix`)

  if (game.artifact.status === 'local') {
    const fixture = join(publicDir, game.artifact.assetBaseUrl.replace(/^\/+/, ''))
    const releasePath = join(fixture, 'release.json')
    if (existsSync(releasePath)) {
      const release = JSON.parse(readFileSync(releasePath, 'utf8'))
      if (release.manifestSha256 !== game.artifact.release.manifestSha256) throw new Error(`${game.slug}: catalog hash mismatch`)
      if (release.bytes !== game.artifact.release.bytes) throw new Error(`${game.slug}: catalog byte count mismatch`)
      if (release.style && !game.artifact.styleUrls.includes(`${prefix}${release.style}`)) throw new Error(`${game.slug}: catalog style mismatch`)
      const releaseArtwork = release.media?.makerIllustration
      if (releaseArtwork?.baseId !== artwork.baseId) throw new Error(`${game.slug}: release artwork base mismatch`)
      for (const source of artwork.sources) {
        const path = source.url.slice(prefix.length)
        if (!releaseArtwork.sources.some((candidate) => candidate.path === path)) {
          throw new Error(`${game.slug}: artwork is missing from release metadata`)
        }
      }
      if (release.assets.some((asset) => /laika.*\.png$/i.test(asset.path))) {
        throw new Error(`${game.slug}: source Laika PNG must not ship in release`)
      }
    }
  }
}

function filesIn(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? filesIn(path) : [path]
  })
}

for (const file of filesIn(publicDir).filter((path) => path.endsWith('.js') || path.endsWith('.mjs'))) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' })
}

const play = readFileSync(join(publicDir, 'play.html'), 'utf8')
if (!play.includes('sandbox="allow-scripts"')) throw new Error('player iframe sandbox changed')
if (/sandbox="[^"]*allow-same-origin/.test(play)) throw new Error('player iframe must keep an opaque origin')
const runner = readFileSync(join(publicDir, 'runner/v1/index.html'), 'utf8')
if (runner.includes('type="module" src="/runner/')) throw new Error('sandbox runner bootstrap must remain a classic script')

console.log(`Validated arcade catalog, sandbox, and ${catalog.games.length} game entry`)
