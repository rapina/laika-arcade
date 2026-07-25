/**
 * 쉬운 말 게이트.
 *
 * 2026-07-19 "쉬운 말로 다시 쓰기"가 정한 규칙은 `docs/editorial-bar.md`와
 * `references/editorial-workflow.md`의 산문에만 있었다. 문서만 가리키는 강제
 * 위치는 강제가 아니라 예정이다 — 연번 14가 등급 사다리로 그것을 증명했고,
 * 연번 15가 같은 것을 다시 증명했다. 새로 공개한 게임의 공개 문장에 내부
 * 용어가 다섯 번 들어갔고 아무도 알아채지 못했다. 사람이 읽고 지켜 주는
 * 규칙은 사람이 바쁜 날 무너진다. 그래서 센다.
 *
 * 이미 공개된 문장에는 위반이 남아 있다. 게이트를 끄지 않고 그것들을 얼려서
 * (`plain-language-legacy.json`) 새로 늘어나는 것만 막는다. 얼린 목록은 줄어들
 * 수는 있어도 늘어날 수 없고, 목록에 있는데 실제로는 깨끗해진 항목은 알려
 * 준다. 빚은 갚을 수 있어야 하고, 갚은 것은 다시 빌릴 수 없어야 한다.
 */

// 이 시스템을 처음 보는 사람에게 뜻이 서지 않는 말들.
// `references/editorial-workflow.md`의 목록과 같아야 한다.
export const BANNED_TERMS = [
  '공정',
  '자율 제작 에이전트',
  '대조',
  '간극',
  '보류',
  '판정 구조',
  '밴드',
  '시뮬레이션',
]

// 긴 줄표는 쉼표, 마침표, 가운뎃점으로 나눈다.
const DASH = /[—–]/

/** value 아래의 모든 문자열을 훑어 위반을 `경로 :: 말` 꼴로 돌려준다. */
export function scanPlainLanguage(value, path, found = []) {
  if (typeof value === 'string') {
    for (const term of BANNED_TERMS) {
      if (value.includes(term)) found.push(`${path} :: ${term}`)
    }
    if (DASH.test(value)) found.push(`${path} :: 긴 줄표`)
  } else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      scanPlainLanguage(child, `${path}.${key}`, found)
    }
  }
  return found
}

/**
 * 얼린 목록과 대어 본다.
 *   fresh   새로 생긴 위반. 하나라도 있으면 등록을 막는다.
 *   cleared 얼려 뒀는데 이제 깨끗해진 자리. 목록에서 지우라고 알려 준다.
 */
export function checkPlainLanguage(hits, legacy, scope) {
  const frozen = new Set(legacy)
  const seen = new Set(hits)
  return {
    fresh: hits.filter((hit) => !frozen.has(hit)),
    cleared: [...frozen].filter((hit) => scope(hit) && !seen.has(hit)),
  }
}
