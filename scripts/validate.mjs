import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import { gzipSync } from 'node:zlib'
import { checkPlainLanguage, scanPlainLanguage } from './plain-language.mjs'

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

const earthReviewer = catalog.earthReviewer
if (earthReviewer?.id !== 'murr-base-v1' || earthReviewer.name !== 'Murr') {
  throw new Error('earth reviewer identity is invalid')
}
if (![earthReviewer.focalPoint?.x, earthReviewer.focalPoint?.y].every((value) => Number.isFinite(value) && value >= 0 && value <= 1)) {
  throw new Error('earth reviewer focal point is invalid')
}
for (const locale of ['ko', 'en']) {
  if (!earthReviewer.alt?.[locale]?.trim() || !earthReviewer.voiceLine?.[locale]?.trim()) {
    throw new Error(`earth reviewer ${locale} copy is incomplete`)
  }
}
if (!Array.isArray(earthReviewer.sources) || earthReviewer.sources.length !== 2) {
  throw new Error('earth reviewer artwork requires two sources')
}
for (const source of earthReviewer.sources) {
  if (!/^\/art\/murr-base-(?:640|1280)\.jpg$/.test(source.url ?? '') || source.type !== 'image/jpeg') {
    throw new Error('earth reviewer artwork source is invalid')
  }
  const file = join(publicDir, source.url.slice(1))
  if (!existsSync(file) || !statSync(file).isFile()) throw new Error('earth reviewer artwork source is missing')
}

const designReviewer = catalog.designReviewer
if (designReviewer?.id !== 'cherpa-base-v1' || designReviewer.name !== 'Cherpa') {
  throw new Error('design reviewer identity is invalid')
}
if (![designReviewer.focalPoint?.x, designReviewer.focalPoint?.y].every((value) => Number.isFinite(value) && value >= 0 && value <= 1)) {
  throw new Error('design reviewer focal point is invalid')
}
for (const locale of ['ko', 'en']) {
  if (!designReviewer.alt?.[locale]?.trim() || !designReviewer.voiceLine?.[locale]?.trim()) {
    throw new Error(`design reviewer ${locale} copy is incomplete`)
  }
}
if (!Array.isArray(designReviewer.sources) || designReviewer.sources.length !== 2) {
  throw new Error('design reviewer artwork requires two sources')
}
for (const source of designReviewer.sources) {
  if (!/^\/art\/cherpa-base-(?:640|1280)\.jpg$/.test(source.url ?? '') || source.type !== 'image/jpeg') {
    throw new Error('design reviewer artwork source is invalid')
  }
  const file = join(publicDir, source.url.slice(1))
  if (!existsSync(file) || !statSync(file).isFile()) throw new Error('design reviewer artwork source is missing')
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

// 크루의 공개 문장에는 게임 안 숫자와 방법론이 들어가지 않는다. 무르는 화면
// 밖에서 밀리초를 볼 방법이 없고, 체르파가 몇 판을 돌렸는지는 검증 기록의
// 몫이다. 규칙을 산문으로만 두었더니 무르의 기록에만 16건이 새어 나왔다.
const INTERNAL_SPEECH = [
  { pattern: /\d+\s*(?:px|ms|fps|Hz)\b/i, what: '게임 안 단위' },
  { pattern: /밴드\s*\d/, what: '내부 구간 이름' },
  { pattern: /\b(?:시드|완주율|판정식|sourceHash|프레임 수)\b/, what: '방법론 용어' },
  { pattern: /시뮬레이션|시뮬 정책/, what: '방법론 용어' },
]

function validateCrewSpeech(game) {
  const fields = []
  const push = (label, value) => { if (typeof value === 'string' && value) fields.push([label, value]) }
  for (const locale of requiredLocales) {
    const content = game.content?.[locale] ?? {}
    for (const [index, line] of (content.why ?? []).entries()) push(`content.${locale}.why[${index}]`, line)
    for (const note of content.designNotes ?? []) push(`content.${locale}.designNotes`, note.value)
    const earth = game.earthReview?.[locale] ?? {}
    for (const key of ['impression', 'worked', 'friction', 'carry']) push(`earthReview.${locale}.${key}`, earth[key])
    const review = game.designProcess?.review
    push(`designProcess.review.summary.${locale}`, review?.summary?.[locale])
    for (const [index, check] of (review?.checks ?? []).entries()) {
      push(`designProcess.review.checks[${index}].observed.${locale}`, check.observed?.[locale])
    }
  }
  const found = []
  for (const [label, value] of fields) {
    for (const { pattern, what } of INTERNAL_SPEECH) {
      const match = pattern.exec(value)
      if (match) found.push(`${label}: ${what} "${match[0]}"`)
    }
  }
  // 무르의 지구 평가는 반말이다. 해요체·합쇼체·확인체가 새어 들면 다른 인물로
  // 읽힌다. 위 검사는 게임 안 단어만 보므로, 연번 16(repose)이 해요체로,
  // 17(shadowfit)이 확인체로 등록됐는데도 통과했다. 어미로 잡는다. 실측: 이
  // 검사는 그 두 편을 잡고, 반말로 쓰인 나머지 열다섯 편에는 오검출 0이었다.
  // ko만 본다 — 무르의 목소리는 한국어 어미에서 갈리고, 영어는 3인칭 보고서
  // 여부로 따로 봐야 한다.
  for (const [label, value] of fields) {
    if (!label.startsWith('earthReview.ko.')) continue
    const sentences = value.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean)
    let plainDa = 0
    for (const sentence of sentences) {
      const core = sentence.replace(/[)"'’”\s.!?]+$/u, '')
      if (/[가-힣]요$/u.test(core)) found.push(`${label}: 무르는 반말이다, 해요체 "${core.slice(-6)}"`)
      else if (/(?:습니다|ㅂ니다)$/u.test(core)) found.push(`${label}: 무르는 반말이다, 합쇼체 "${core.slice(-6)}"`)
      else if (/다$/u.test(core)) plainDa += 1
    }
    if (sentences.length > 0 && plainDa / sentences.length >= 0.5) {
      found.push(`${label}: 무르는 반말이다, 확인체(~다) ${plainDa}/${sentences.length}문장`)
    }
  }
  return found
}

// 공개 문구에는 긴 줄표를 쓰지 않는다. 쉼표, 마침표, 가운뎃점으로 나눈다.
function validateNoDashes(game) {
  const walk = (value, path) => {
    if (typeof value === 'string') {
      if (/[\u2014\u2013]/.test(value)) throw new Error(`${game.slug}: ${path} contains an em/en dash`)
    } else if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) walk(child, `${path}.${key}`)
    }
  }
  walk(game.content, 'content')
  walk(game.earthReview?.ko, 'earthReview.ko')
  walk(game.earthReview?.en, 'earthReview.en')
  walk(game.designProcess, 'designProcess')
  walk(game.retirement, 'retirement')
}

// 지구 플레이 기록은 공개 뒤에 쓴다(ADR 0004). 따라서 첫 공개 시점에는 없을 수
// 있다. 대신 미기록 상태를 하나로 제한해(가장 최근 게임만) 다음 게임이 나가기
// 전에 평가가 따라잡히도록 강제한다. 반환값은 기록 존재 여부다.
function validateEarthReview(game) {
  const review = game.earthReview
  if (review === undefined || review === null) return false
  if (review.reviewer !== 'Murr' || !/^\d{4}-\d{2}-\d{2}$/.test(review.reviewedAt ?? '')) {
    throw new Error(`${game.slug}: earth review metadata is invalid`)
  }
  // 소감을 실제로 배포된 빌드에 묶는다. 연번 16에서 한 평가자가 폰트가 빠진
  // 로컬 빌드를 보고 "글자가 다 뭉개진다"고 적었는데, 공개된 빌드에서는 모두
  // 또렷했다. 설계 검토는 sourceHash로 증거를 묶는데 이 지면에는 그런 장치가
  // 없어서 아무도 알아채지 못했다. 이제 어느 빌드를 플레이했는지 적어야 하고,
  // 게임을 다시 내보내면 그 값이 어긋나 소감을 다시 받게 된다.
  if (game.sequence >= earthReviewBindingFromSequence) {
    const played = review.playedArtifactVersion
    const shipped = game.artifact?.version
    if (!played) {
      throw new Error(
        `${game.slug}: earthReview.playedArtifactVersion이 없습니다. 무르가 플레이한 빌드를 적으세요. ` +
        `공개된 빌드는 ${shipped}입니다.`,
      )
    }
    if (played !== shipped) {
      throw new Error(
        `${game.slug}: 무르가 플레이한 빌드(${played})가 공개된 빌드(${shipped})와 다릅니다. ` +
        `공개된 것을 플레이하고 소감을 다시 받으세요.`,
      )
    }
  }
  for (const locale of requiredLocales) {
    const copy = review[locale]
    for (const key of ['impression', 'worked', 'friction', 'carry']) {
      if (typeof copy?.[key] !== 'string' || !copy[key].trim() || copy[key].length > 320) {
        throw new Error(`${game.slug}: earth review ${locale}.${key} is invalid`)
      }
    }
  }
  const artwork = review.artwork
  if (artwork?.id !== `murr-${game.slug}-v1`) throw new Error(`${game.slug}: earth review artwork id is invalid`)
  if (![artwork.focalPoint?.x, artwork.focalPoint?.y].every((value) => Number.isFinite(value) && value >= 0 && value <= 1)) {
    throw new Error(`${game.slug}: earth review artwork focal point is invalid`)
  }
  for (const locale of requiredLocales) {
    if (!artwork.alt?.[locale]?.trim()) throw new Error(`${game.slug}: earth review artwork ${locale} alt is missing`)
  }
  if (!Array.isArray(artwork.sources) || artwork.sources.length !== 2) {
    throw new Error(`${game.slug}: earth review artwork requires two sources`)
  }
  for (const source of artwork.sources) {
    if (!new RegExp(`^/art/murr-${game.slug}-(?:640|1280)\\.jpg$`).test(source.url ?? '') || source.type !== 'image/jpeg') {
      throw new Error(`${game.slug}: earth review artwork source is invalid`)
    }
    const file = join(publicDir, source.url.slice(1))
    if (!existsSync(file) || !statSync(file).isFile()) throw new Error(`${game.slug}: earth review artwork source is missing`)
  }
  return true
}

// 제작 과정 공개(ADR 0006): sequence 009부터 설계 요약, 목표/실제 화면 쌍,
// 설계 검토(verdict pass)를 카탈로그에 등록해야 공개할 수 있다.
const designProcessRequiredFromSequence = 9
// 무르의 소감을 배포된 빌드에 묶기 시작한 연번. 이전 편들은 어느 빌드에서
// 썼는지 기록이 없어 소급해 적을 수 없다. 거짓으로 채우는 대신 비워 둔다.
const earthReviewBindingFromSequence = 16
const promiseStatuses = new Set(['met', 'gap'])

function localizedBlock(value, label, maxLength) {
  if (!value || typeof value !== 'object') throw new Error(`${label} is invalid`)
  for (const locale of requiredLocales) {
    const text = value[locale]
    // 원인을 말해 준다. 전에는 그냥 "is invalid"라 카탈로그를 손조립하는 쪽이
    // 길이 초과인지 빈 값인지 몰라 스키마 주석을 뒤진 뒤 여러 번 잘라 봐야 했다
    // (연번 18 마찰). 몇 자 넘쳤는지 바로 적는다.
    if (typeof text !== 'string' || !text.trim()) {
      throw new Error(`${label}.${locale} is invalid (비었거나 문자열이 아님)`)
    }
    if (text.length > maxLength) {
      throw new Error(`${label}.${locale} is invalid (${text.length}자, 상한 ${maxLength}자 — ${text.length - maxLength}자 초과)`)
    }
  }
}

function validateDesignProcess(game) {
  const process = game.designProcess
  if (!process) {
    if (game.sequence >= designProcessRequiredFromSequence) {
      throw new Error(`${game.slug}: designProcess is required from sequence ${designProcessRequiredFromSequence}`)
    }
    return
  }
  for (const locale of requiredLocales) {
    const paragraphs = process.summary?.[locale]
    if (!Array.isArray(paragraphs) || paragraphs.length === 0 ||
      paragraphs.some((paragraph) => typeof paragraph !== 'string' || !paragraph.trim() || paragraph.length > 480)) {
      throw new Error(`${game.slug}: designProcess ${locale} summary is invalid`)
    }
  }
  if (!Array.isArray(process.scenes) || process.scenes.length < 3) {
    throw new Error(`${game.slug}: designProcess requires first-play, verb, and game-over scenes`)
  }
  const sceneIds = new Set()
  for (const scene of process.scenes) {
    if (!/^[a-z][a-z0-9-]{0,63}$/.test(scene.id ?? '') || sceneIds.has(scene.id)) {
      throw new Error(`${game.slug}: designProcess scene id is invalid or duplicated`)
    }
    sceneIds.add(scene.id)
    localizedBlock(scene.label, `${game.slug}: designProcess scene ${scene.id} label`, 64)
    if (scene.note !== undefined) {
      localizedBlock(scene.note, `${game.slug}: designProcess scene ${scene.id} note`, 320)
    }
    for (const kind of ['target', 'actual']) {
      const frame = scene[kind]
      const expectedUrl = `/art/design/${game.slug}/${kind}-${scene.id}.jpg`
      if (frame?.url !== expectedUrl) {
        throw new Error(`${game.slug}: designProcess scene ${scene.id} ${kind} url must be ${expectedUrl}`)
      }
      if (!Number.isInteger(frame.width) || !Number.isInteger(frame.height) || frame.width < 1 || frame.height < 1) {
        throw new Error(`${game.slug}: designProcess scene ${scene.id} ${kind} size is invalid`)
      }
      const file = join(publicDir, frame.url.slice(1))
      if (!existsSync(file) || !statSync(file).isFile()) {
        throw new Error(`${game.slug}: designProcess scene ${scene.id} ${kind} image is missing`)
      }
    }
  }
  // 설계 검토는 관제소의 거북이 체르파가 맡는다. 무르는 공개된 전송만
  // 플레이하는 인물이므로 공개 전 빌드를 보는 검토자가 될 수 없다.
  const review = process.review
  if (!review || review.reviewer !== 'Cherpa' || !/^\d{4}-\d{2}-\d{2}$/.test(review.reviewedAt ?? '')) {
    throw new Error(`${game.slug}: designProcess review metadata is invalid`)
  }
  // blocked 상태는 공개 자체가 불가능하므로 카탈로그에는 pass만 실린다.
  if (review.verdict !== 'pass') {
    throw new Error(`${game.slug}: designProcess review verdict must be pass, got "${review.verdict}"`)
  }
  localizedBlock(review.summary, `${game.slug}: designProcess review summary`, 480)
  // 보류 이력: 검토가 공개를 막았다가 보완 뒤 통과한 게임만 갖는다. blocked
  // 상태는 카탈로그에 실릴 수 없으므로, 막았다는 사실은 여기에만 남는다.
  if (review.held !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(review.held.at ?? '')) {
      throw new Error(`${game.slug}: designProcess review held date is invalid`)
    }
    localizedBlock(review.held.reason, `${game.slug}: designProcess review held reason`, 480)
  }
  if (!Array.isArray(review.checks) || review.checks.length === 0) {
    throw new Error(`${game.slug}: designProcess review checks are required`)
  }
  for (const [index, check] of review.checks.entries()) {
    if (!promiseStatuses.has(check.status)) {
      throw new Error(`${game.slug}: designProcess check ${index} status is invalid for a published game`)
    }
    localizedBlock(check.claim, `${game.slug}: designProcess check ${index} claim`, 320)
    localizedBlock(check.observed, `${game.slug}: designProcess check ${index} observed`, 320)
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

// 공정 기록: 공개 페이지 /history의 데이터. 공정을 바꾸면 관제 저장소의
// docs/knowledge/PROCESS_LOG.md와 함께 갱신한다.
const plainLanguageHits = []

// 사이트 화면 문구도 크루가 하는 말이다. 지금까지 이 게이트는 카탈로그만
// 봤고, 그 바깥의 i18n 문자열은 아무도 읽지 않았다. 연번 16에서 게임 문장을
// 전부 인물의 목소리로 고친 뒤에도 기록 페이지 머리말은 옛 말투로 남아 있었고,
// 크루 소개에는 이미 금지한 말이 그대로 있었다. 고치는 것 옆에 검사되지 않는
// 것을 남겨 두면 거기로 샌다.
{
  const source = readFileSync(join(publicDir, 'assets/i18n.js'), 'utf8')
  for (const [, key, value] of source.matchAll(/"([a-zA-Z][a-zA-Z.]*)":\s*"((?:[^"\\]|\\.)*)"/g)) {
    scanPlainLanguage(value.replace(/\\"/g, '"'), `i18n[${key}]`, plainLanguageHits)
  }
}

const processLog = JSON.parse(readFileSync(join(publicDir, 'catalog/process.json'), 'utf8'))
if (processLog.schemaVersion !== 1 || !Array.isArray(processLog.entries) || processLog.entries.length === 0) {
  throw new Error('process log schema is invalid')
}
// 기록은 새것이 위다. 뒤에 덧붙이면 7월 19일이 7월 14일 아래로 간다(실제로
// 그렇게 됐다). 날짜가 내려가는 차례가 아니면 등록을 막는다.
let previousDate = null
const processIds = new Set()
for (const entry of processLog.entries) {
  if (!/^[a-z][a-z0-9-]{0,63}$/.test(entry.id ?? '') || processIds.has(entry.id)) {
    throw new Error(`process log entry id is invalid or duplicated: ${entry.id}`)
  }
  processIds.add(entry.id)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date ?? '')) throw new Error(`${entry.id}: process entry date is invalid`)
  if (previousDate !== null && entry.date > previousDate) {
    throw new Error(`${entry.id}: process log must run newest first. Put a new entry at the top of entries, not at the end.`)
  }
  previousDate = entry.date
  // 차례(index)가 아니라 id로 적는다. 새 항목은 배열 맨 앞에 들어가므로
  // 번호로 적으면 기록을 하나 더할 때마다 얼린 목록이 통째로 어긋난다.
  scanPlainLanguage(entry.title, `process[${entry.id}].title`, plainLanguageHits)
  scanPlainLanguage(entry.body, `process[${entry.id}].body`, plainLanguageHits)
  for (const locale of requiredLocales) {
    if (typeof entry.title?.[locale] !== 'string' || !entry.title[locale].trim()) {
      throw new Error(`${entry.id}: process entry ${locale} title is invalid`)
    }
    const paragraphs = entry.body?.[locale]
    if (!Array.isArray(paragraphs) || paragraphs.length === 0 ||
      paragraphs.some((paragraph) => typeof paragraph !== 'string' || !paragraph.trim() || paragraph.length > 640)) {
      throw new Error(`${entry.id}: process entry ${locale} body is invalid`)
    }
    for (const paragraph of paragraphs.concat(entry.title[locale])) {
      if (/[\u2014\u2013]/.test(paragraph)) throw new Error(`${entry.id}: process entry contains an em/en dash`)
    }
  }
  for (const slug of entry.refs ?? []) {
    if (!catalog.games.some((game) => game.slug === slug)) {
      throw new Error(`${entry.id}: process entry references unknown game ${slug}`)
    }
  }
}

const slugs = new Set()
const sequences = new Set()
const gamesAwaitingEarthReview = []
const crewSpeechFindings = []
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
    game.credits?.role !== 'autonomous game-making agent' ||
    typeof game.credits?.model !== 'string' || !game.credits.model.trim()
  ) {
    throw new Error(`${game.slug}: creator metadata is invalid`)
  }
  // 제작은 풀 모델에서만 한다. 축약 티어의 자기 보고 ID는 등록을 거부한다.
  if (/(^|[-_.])(mini|nano|lite|micro|tiny|flash|haiku)([-_.]|$)/i.test(game.credits.model)) {
    throw new Error(`${game.slug}: credits.model must be a full-capability model, got "${game.credits.model}"`)
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
  if (!validateEarthReview(game)) gamesAwaitingEarthReview.push(game)
  validateDesignProcess(game)
  crewSpeechFindings.push(...validateCrewSpeech(game).map((finding) => `${game.slug}: ${finding}`))
  validateNoDashes(game)
  // 쉬운 말 검사는 한자리에서 판정한다. 얼린 빚과 대조해야 하므로 모아 둔다.
  scanPlainLanguage(game.content, `${game.slug}.content`, plainLanguageHits)
  scanPlainLanguage(game.designProcess, `${game.slug}.designProcess`, plainLanguageHits)
  scanPlainLanguage(game.earthReview, `${game.slug}.earthReview`, plainLanguageHits)
  scanPlainLanguage(game.retirement, `${game.slug}.retirement`, plainLanguageHits)

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
    // retired: 공개 이력이 있는 게임을 은퇴 상태로 전시한다. 릴리스는 그대로
    // 플레이 가능하게 두고, 은퇴일과 사유(ko·en)를 공개한다.
    if (game.status === 'retired') {
      const retirement = game.retirement
      if (!/^\d{4}-\d{2}-\d{2}$/.test(retirement?.retiredAt ?? '')) {
        throw new Error(`${game.slug}: retired game needs a retiredAt date`)
      }
      for (const locale of requiredLocales) {
        const reason = retirement.reason?.[locale]
        if (typeof reason !== 'string' || !reason.trim() || reason.length > 480) {
          throw new Error(`${game.slug}: retirement reason ${locale} is invalid`)
        }
      }
    } else if (game.status !== 'published') throw new Error(`${game.slug}: published game status is required`)
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

// 평가 대기는 최신 한 편까지만 허용한다. 다음 게임이 나가기 전에 지구 기록이
// 따라잡히지 않으면 등록을 막는다.
const highestPublishedSequence = Math.max(0, ...catalog.games.map((game) => game.sequence ?? 0))
if (gamesAwaitingEarthReview.length > 1) {
  throw new Error(`earth review is missing for more than one game: ${gamesAwaitingEarthReview.map((game) => game.slug).join(', ')}`)
}
for (const game of gamesAwaitingEarthReview) {
  if (game.sequence !== highestPublishedSequence) {
    throw new Error(`${game.slug}: earth review must be recorded before a newer game is registered`)
  }
}

// 산문으로만 두면 지켜지지 않는다는 것이 오늘까지 여러 번 확인됐다. 여기서 막는다.
if (crewSpeechFindings.length > 0) {
  throw new Error(`크루의 공개 문장에 내부 용어가 남아 있습니다:\n  ${crewSpeechFindings.join('\n  ')}`)
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

const sourceRepositoryUrl = 'https://github.com/rapina/laika'
for (const page of ['index.html', 'history.html', 'game.html']) {
  const html = readFileSync(join(publicDir, page), 'utf8')
  const sourceLink = html.match(/<a\b[^>]*data-i18n=["']site\.sourceLink["'][^>]*>/i)?.[0]
  if (
    !sourceLink ||
    !sourceLink.includes(`href="${sourceRepositoryUrl}"`) ||
    !sourceLink.includes('target="_blank"') ||
    !sourceLink.includes('rel="noreferrer"')
  ) {
    throw new Error(`${page}: public source repository link is missing or unsafe`)
  }
}

// 쉬운 말 판정. 얼린 빚보다 늘었으면 막고, 줄었으면 지우라고 알려 준다.
{
  const ledgerPath = join(import.meta.dirname, 'plain-language-legacy.json')
  const ledger = JSON.parse(readFileSync(ledgerPath, 'utf8'))
  // 연번 16에서 이 목록을 전부 갚아 비웠다. 한 번 0이 된 빚은 다시 빌릴 수
  // 없다. 새 문장이 걸리면 목록에 적는 게 아니라 문장을 고쳐야 한다.
  if (ledger.entries.length > 0) {
    throw new Error(
      `쉬운 말 빚 목록은 비어 있어야 합니다. ${ledger.entries.length}건이 다시 적혔습니다. ` +
      `면제를 늘리지 말고 문장을 고치세요.\n  ${ledger.entries.join('\n  ')}`,
    )
  }
  const known = new Set([
    ...catalog.games.map((game) => `${game.slug}.`),
    ...processLog.entries.map((entry) => `process[${entry.id}].`),
  ])
  const { fresh, cleared } = checkPlainLanguage(
    plainLanguageHits,
    // 화면 문구를 그대로 옮긴 탓에 생긴 빚도 빚이다. 따로 적어 두는 이유는
    // 갚는 방법이 다르기 때문이다. 문장이 아니라 게임 화면을 고쳐야 한다.
    [...ledger.entries, ...(ledger.quotingScreen?.entries ?? [])],
    // 게임이 은퇴해 카탈로그에서 빠지면 그 빚은 판정 대상이 아니다.
    (hit) => [...known].some((prefix) => hit.startsWith(prefix)),
  )
  if (fresh.length > 0) {
    throw new Error(
      `공개 문장에 내부 용어가 ${fresh.length}건 새로 들어갔습니다. 이 시스템을 처음 보는 사람이 읽는 글입니다. 쉬운 말과 동사로 푸세요.\n  ${fresh.join('\n  ')}\n` +
      `(고칠 수 없는 사정이 있으면 arcade/scripts/plain-language-legacy.json이 아니라 문장을 고치세요. 그 목록은 이 게이트가 생기기 전의 빚이고 늘리지 않습니다.)`,
    )
  }
  if (cleared.length > 0) {
    throw new Error(
      `얼려 둔 문장 ${cleared.length}건이 이제 깨끗합니다. arcade/scripts/plain-language-legacy.json에서 지우세요. 갚은 빚은 다시 빌릴 수 없어야 합니다.\n  ${cleared.join('\n  ')}`,
    )
  }
}

console.log(`Validated arcade catalog, sandbox, and ${catalog.games.length} game ${catalog.games.length === 1 ? 'entry' : 'entries'}`)
