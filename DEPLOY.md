# Vercel 배포 가이드

Vercel에는 아케이드 저장소 하나만 연결한다. 게임 저장소와 런치패드는 각각 독립 저장소로 유지하고, 검증된 게임 산출물만 Vercel Blob의 불변 경로로 전달한다.

## 1. 사이트 프로젝트 연결

Vercel 대시보드에서 `rapina/laika-arcade`를 새 프로젝트로 가져온다.

- Framework Preset: `Other`
- Root Directory: 저장소 루트
- Build Command: 비움
- Output Directory: `public` (`vercel.json`이 지정함)
- Production Branch: `main`

이 상태의 첫 배포에서는 홈과 작품 노트를 확인할 수 있다. 카탈로그의 게임이 `artifact.status: local`인 동안에는 Vercel에서 플레이를 열지 않고 준비 화면을 보여 주는 것이 정상이다.

CLI를 쓸 때는 아케이드 디렉터리에서 프로젝트를 연결한다.

```bash
vercel login
vercel link
vercel                 # preview
```

`.vercel/`과 토큰은 커밋하지 않는다.

## 2. 게임 자산을 Blob에 올리기

Vercel 프로젝트의 Storage에서 Public Blob store를 만들거나 CLI를 사용한다.

```bash
vercel blob create-store sputnik-game-assets --access public
vercel env pull .env.local --yes
```

게임 저장소의 `dist-arcade/release.json` 검증이 끝난 뒤, 모든 파일을 다음 경로에 올린다.

```text
games/<slug>/<releaseSha>/<release-relative-path>
```

CLI에서는 파일마다 원래 상대 경로를 보존한다.

```bash
vercel blob put <local-file> \
  --pathname games/<slug>/<releaseSha>/<relative-path> \
  --cache-control-max-age 31536000
```

`releaseSha` 경로는 덮어쓰지 않는다. 수정이 생기면 새 SHA로 다시 빌드하고 새 경로를 만든다.

## 3. 같은 출처 경로 연결

Blob이 발급한 public hostname을 확인한 뒤 `vercel.json`의 `rewrites` 맨 앞에 추가한다.

```json
{
  "source": "/__game-assets/:path*",
  "destination": "https://YOUR_STORE.public.blob.vercel-storage.com/:path*"
}
```

아케이드 카탈로그의 해당 게임도 같은 변경에서 갱신한다.

- `artifact.status`: `published`
- `artifact.version`: `<releaseSha>`
- `entryUrl`: `/__game-assets/games/<slug>/<releaseSha>/entry.mjs`
- `styleUrls`, `assetBaseUrl`: 같은 SHA prefix
- `artifact.release`: 업로드한 `release.json`의 해시·파일 수·바이트

## 4. Preview 검증과 Production 전환

브랜치 push나 `vercel` 명령으로 preview를 만든 뒤 다음을 확인한다.

- `/`, `/games/<slug>`, `/play/<slug>`가 한국어와 영어로 열린다.
- entry, CSS, 이미지, 오디오 요청이 모두 200이다.
- 한 판 완주, 언어 변경, 일시정지, 음소거, 재시작이 동작한다.
- 브라우저 콘솔 오류와 실패 요청이 없다.
- 응답에 CSP, `nosniff`, referrer·permissions 정책이 유지된다.

검증한 preview를 그대로 production으로 승격한다.

```bash
vercel promote <preview-url>
```

문제가 생기면 새 빌드를 만들기보다 직전 배포로 먼저 되돌린다.

```bash
vercel rollback
```

새 게임부터는 `게임 검증 → Blob 업로드 → 카탈로그 PR → preview 완주 → promote` 순서를 반복한다.
