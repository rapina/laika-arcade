# Sputnik Workshop Arcade

라이카가 서로 다른 저장소에서 만든 게임을 한 도메인에서 전시하고 실행하는 정적 Vercel 사이트다. 아케이드는 게임 소스에 의존하지 않는다. 검증을 마친 immutable artifact와 카탈로그만 받는다.

한국어와 영어를 기본 지원한다. 아케이드에서 고른 언어는 `host:init.locale`과 `host:locale`을 통해 샌드박스 게임에 전달하며, 전환 중 게임 인스턴스를 다시 만들지 않는다.

## 구조

```text
public/
├── index.html                 전시실
├── game.html                  작품 노트 (/games/:slug)
├── play.html                  플레이어 (/play/:slug)
├── art/                       라이카 베이스 초상 웹 파생본
├── catalog/games.json         공개 카탈로그와 고정 artifact 경로
├── runner/v1/                 sandbox 실행기
└── __game-assets/             로컬 fixture 또는 Vercel 외부 rewrite 대상
```

게임은 `sandbox="allow-scripts"` iframe 안에서 실행한다. `allow-same-origin`은 부여하지 않는다. 플레이어가 iframe을 불러올 때 128비트 nonce와 `MessageChannel`의 한쪽 포트를 한 번만 `window.postMessage`로 넘긴다. 연결 뒤에는 전역 메시지를 닫고, 호스트 명령과 게임 이벤트를 포트로만 주고받는다.

runner v1은 카탈로그가 넘긴 `slug`와 `version`으로 `/__game-assets/games/<slug>/<version>/` 접두사를 만든다. entry, CSS, asset base가 이 불변 경로 안에 있는지 확인한 뒤 entry 모듈을 동적으로 불러온다. 게임 artifact는 아래 함수를 내보낸다.

```js
export function mountGame({ root, assetBaseUrl, locale, seed, host }) {
  let sequence = 0;
  host.emit({
    contractVersion: 1,
    gameId: "mygame",
    sequence: ++sequence,
    type: "ready"
  });
  return {
    pause() {},
    resume() {},
    mute(value) {},
    setLocale(locale) {},
    restart() {},
    destroy() { root.replaceChildren(); }
  };
}
```

게임 이벤트 타입은 `ready`, `started`, `score`, `ended`, `error`, `exit`만 허용한다. `contractVersion: 1`, 현재 slug와 같은 `gameId`, 단조 증가하는 `sequence`가 필요하며 payload는 16KB를 넘길 수 없다. `score`와 `ended`의 게임별 결과는 `payload.result`에 넣는다. 포털은 카탈로그의 `resultDisplay`로 해당 결과를 문자열로 표시한다.

기존 STITCH fixture는 이전 `run-start`/`run-end` 이벤트를 사용하므로 카탈로그에 `bridgeMode: legacy-run-v1`을 명시했다. 새 게임은 기본값인 `contract-v1`을 사용한다.

## 로컬 실행

의존성 설치 없이 Node.js 표준 라이브러리만 쓴다.

```bash
node scripts/serve.mjs
```

로컬 fixture는 `artifact.status: local`로 등록한다. 이 상태는 `localhost`와 `127.0.0.1`에서만 실행되므로, fixture가 빠진 Vercel 배포에서는 자동으로 초안 화면을 유지한다. 게임 저장소의 `dist-arcade`를 다음 위치에 그대로 복사한다.

```text
public/__game-assets/games/<slug>/local-fixture/
├── entry.mjs
├── release.json
└── assets/...
```

복사와 검증이 끝난 뒤에만 `artifact.status`를 `published`로 바꾼다. 로컬 경로도 항상 버전 디렉터리를 사용해, 실행 중 파일이 덮어써지지 않게 한다.

포털 전체 스모크는 slug와 게임별 driver를 함께 사용한다. 공통 harness가 브라우저 오류, 언어 변경, 일시정지, 음소거, 재시작을 검사하고, driver는 게임 상태와 자동 입력만 소유한다.

```bash
node scripts/smoke-player.mjs stitch
node scripts/smoke-player.mjs rime
```

각 게임의 설명 그림은 해당 게임 릴리스가 소유한다. 카탈로그의 `artwork`에는 `laika-base-v1`, 한·영 대체 문구, 초점 좌표, 640px·1280px 소스를 기록한다. 아케이드는 이 값으로 홈과 작품 노트의 `srcset`을 구성하며, 게임 저장소의 생성 원본에는 접근하지 않는다.

## Vercel 배포 구조

Vercel 프로젝트는 이 저장소 하나다. 게임 저장소마다 별도 프로젝트를 만들지 않는다. 관제 저장소의 공개 명령이 게임 빌드와 검증, Blob 업로드, 아케이드 preview와 production 검증을 순서대로 수행한다.

최초 연결부터 Blob 자산, preview 검증, production 승격까지의 명령은 [Vercel 배포 가이드](DEPLOY.md)에 정리했다.

게임 artifact는 Vercel Blob의 immutable 경로에 올리고, 공개 명령이 `vercel.json`의 `rewrites` 최상단에 다음 외부 rewrite를 고정한다.

```json
{
  "source": "/__game-assets/:path*",
  "destination": "https://YOUR_STORE.public.blob.vercel-storage.com/:path*"
}
```

`YOUR_STORE`는 연결된 Public Blob hostname이다. Blob key는 `games/<slug>/<git-sha>/...` 형태로 만들고, 카탈로그에는 SHA가 포함된 경로를 고정한다. 외부 rewrite를 페이지 rewrite보다 먼저 둬야 한다. 브라우저에는 계속 같은 출처의 `/__game-assets/...`로 보이므로 게임 계약이 호스팅 공급자 URL에 묶이지 않는다.

## 게시 체크

1. 게임 저장소에서 단위 테스트, 빌드, autoplay smoke를 통과시킨다.
2. artifact를 commit SHA 경로로 게시하고 파일 목록과 해시를 남긴다.
3. release 브랜치에서 `entryUrl`, `styleUrls`, `assetBaseUrl`, `version`을 함께 고정한다.
4. 라이카 그림의 정체성, 한·영 대체 문구, 모바일 크롭, 릴리스 해시를 확인한다.
5. preview deployment에서 모바일·데스크톱, 음소거·일시정지·재시작·종료를 확인한다.
6. 검증한 같은 커밋만 `main`에 올리고 production에서 다시 완주한다.
