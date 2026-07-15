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

runner v1은 현재 첫 작품을 위한 좁은 계약이다. entry, CSS, asset base가 모두 `/__game-assets/games/stitch/`로 시작하는지 확인한 뒤 entry 모듈을 동적으로 불러온다. 게임 artifact는 아래 함수를 내보낸다.

```js
export function mountGame({ root, assetBaseUrl, locale, seed, host }) {
  host.emit({ contractVersion: 1, gameId: "stitch", type: "ready" });
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

## 로컬 실행

의존성 설치 없이 Node.js 표준 라이브러리만 쓴다.

```bash
node scripts/serve.mjs
```

현재 STITCH는 외부에 배포하지 않은 로컬 fixture로 연결되어 있다. `artifact.status: local`은 `localhost`와 `127.0.0.1`에서만 실행되므로, fixture가 빠진 Vercel 배포에서는 자동으로 초안 화면을 유지한다. 게임 저장소의 `dist-arcade`를 다음 위치에 그대로 복사한다.

```text
public/__game-assets/games/stitch/local-fixture/
├── entry.mjs
├── release.json
└── assets/...
```

복사와 검증이 끝난 뒤에만 `artifact.status`를 `published`로 바꾼다. 로컬 경로도 항상 버전 디렉터리를 사용해, 실행 중 파일이 덮어써지지 않게 한다.

각 게임의 설명 그림은 해당 게임 릴리스가 소유한다. 카탈로그의 `artwork`에는 `laika-base-v1`, 한·영 대체 문구, 초점 좌표, 640px·1280px 소스를 기록한다. 아케이드는 이 값으로 홈과 작품 노트의 `srcset`을 구성하며, 게임 저장소의 생성 원본에는 접근하지 않는다.

## Vercel 배포 구조

Vercel 프로젝트는 이 저장소 하나다. 게임 저장소마다 별도 프로젝트를 만들지 않는다. 각 게임 CI가 빌드·검증을 끝낸 뒤 아케이드 카탈로그 갱신 PR을 여는 흐름을 전제로 한다.

최초 연결부터 Blob 자산, preview 검증, production 승격까지의 명령은 [Vercel 배포 가이드](DEPLOY.md)에 정리했다.

초기에는 작은 JS/CSS artifact를 이 저장소에 둘 수 있다. 이미지와 음원은 처음부터 Vercel Blob의 immutable 경로에 올리고, 운영 전환 시 `vercel.json`의 `rewrites` 최상단에 다음 외부 rewrite를 추가한다.

```json
{
  "source": "/__game-assets/:path*",
  "destination": "https://YOUR_STORE.public.blob.vercel-storage.com/:path*"
}
```

`YOUR_STORE`는 실제 Blob hostname으로 교체한다. Blob key는 `games/<slug>/<git-sha>/...` 형태로 만들고, 카탈로그에는 SHA가 포함된 경로를 고정한다. 외부 rewrite를 페이지 rewrite보다 먼저 둬야 한다. 브라우저에는 계속 같은 출처의 `/__game-assets/...`로 보이므로 게임 계약이 호스팅 공급자 URL에 묶이지 않는다.

## 게시 체크

1. 게임 저장소에서 단위 테스트, 빌드, autoplay smoke를 통과시킨다.
2. artifact를 commit SHA 경로로 게시하고 파일 목록과 해시를 남긴다.
3. 아케이드 PR에서 `entryUrl`, `styleUrls`, `assetBaseUrl`, `version`을 함께 고정한다.
4. 라이카 그림의 정체성, 한·영 대체 문구, 모바일 크롭, 릴리스 해시를 확인한다.
5. preview deployment에서 모바일·데스크톱, 음소거·일시정지·재시작·종료를 확인한다.
6. 검증 뒤 `artifact.status: published`로 병합한다.
