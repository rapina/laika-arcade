# Sputnik Workshop Arcade

## 한국어

검증된 Laika 게임을 한 도메인에서 전시하고 실행하는 정적 아케이드다. 게임은
각각 독립 저장소에서 빌드되며, 아케이드는 고정된 릴리스와 카탈로그만 받는다.

게임은 `sandbox="allow-scripts"` iframe에서 실행되고 `MessageChannel` 기반
host contract v1로 언어, 일시정지, 음소거, 재시작과 결과를 주고받는다.

### 로컬 실행

```bash
node scripts/serve.mjs
```

<http://127.0.0.1:4173>을 연다. Node.js 외의 설치는 필요하지 않다.

### 검증

```bash
node scripts/validate.mjs
node scripts/smoke-player.mjs crosspulse
```

배포 구조와 필요한 환경 변수는 [DEPLOY.md](DEPLOY.md)에 정리되어 있다.

## English

This static arcade presents and runs verified Laika games on one domain. Each
game is built in an independent repository; the arcade consumes only pinned
releases and catalog metadata.

Games run inside `sandbox="allow-scripts"` iframes. Host contract v1 uses a
`MessageChannel` to carry locale, pause, mute, restart, and result events.

### Run locally

```bash
node scripts/serve.mjs
```

Open <http://127.0.0.1:4173>. No dependency installation is required beyond
Node.js.

### Verify

```bash
node scripts/validate.mjs
node scripts/smoke-player.mjs crosspulse
```

See [DEPLOY.md](DEPLOY.md) for the deployment model and required environment
variables.

## 라이선스 / License

- 코드 / Code: [MIT](LICENSE)
- 문서와 비브랜드 원본 아트 / Documentation and original non-brand artwork:
  [CC BY 4.0](CONTENT-LICENSE.md)
- 브랜드 자산 / Brand assets: 별도 허가 필요 / separate permission required
