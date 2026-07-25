# Vercel 배포 가이드

Vercel에는 `rapina/laika-arcade` 저장소 하나만 연결한다. 게임과 런치패드는 독립 저장소로 유지하고, 게임마다 별도 Vercel 프로젝트를 만들지 않는다.

매일의 공개는 관제 저장소의 `scripts/publish-game.mjs`가 맡는다. 파일별 Blob 업로드, 카탈로그 편집, preview 승격을 수동으로 반복하지 않는다.

## 최초 한 번만 준비

아케이드 디렉터리에서 Vercel CLI에 로그인하고 기존 프로젝트를 연결한다.

```bash
cd arcade
vercel login
vercel link --project laika --scope rapinas-projects
vercel env pull .env.local --yes
vercel whoami
```

필요한 로컬 값은 `BLOB_READ_WRITE_TOKEN`이다. `.env.local`, `.vercel/`, 토큰 값은 커밋하지 않는다.

Vercel 프로젝트 설정은 다음과 같다.

- Git 저장소: `rapina/laika-arcade`
- Framework Preset: `Other`
- Root Directory: 저장소 루트
- Build Command: 비움
- Output Directory: `public`
- Production Branch: `main`

Public Blob store는 기존 프로젝트에 하나만 둔다. 새 게임마다 store를 만들지 않는다.

## 매일 공개

게임의 로컬 검증과 아케이드 등록을 마친 뒤 관제 저장소 루트에서 실행한다.

```bash
node scripts/publish-game.mjs --dry-run --game games/YYYY/YYYY-MM-DD-slug
node scripts/publish-game.mjs --publish --game games/YYYY/YYYY-MM-DD-slug
```

첫 명령은 네트워크와 파일을 바꾸지 않고 다음 내용을 보여 준다.

- 게임 slug와 full Git SHA
- Vercel Blob의 불변 prefix
- 업로드할 파일, 크기, SHA-256
- 바뀔 아케이드와 관제 파일
- 전체 계획의 SHA-256

두 번째 명령은 다음 작업을 이어서 수행한다.

1. 게임, 아케이드, 관제 저장소의 HEAD와 변경 상태를 검사한다.
2. 게임 테스트, 빌드, 뷰포트와 전체 스모크를 다시 실행한다.
3. `games/<slug>/<releaseSha>/`에 자산을 올리고 원격 바이트를 검증한다.
4. `release.json`을 마지막에 올려 릴리스 완료를 표시한다.
5. 아케이드 release 브랜치를 push하고 Vercel preview에서 한 판을 완주한다.
6. 검증한 같은 커밋을 `main`에 올린다.
7. production deployment URL과 `https://laika365.vercel.app`에서 다시 완주한다.
8. 관제 카탈로그와 Arcade submodule 포인터를 커밋한다.

운영 검증이 실패하면 아케이드 공개 커밋을 자동으로 revert한다. Blob 자산은 불변 경로이므로 삭제하거나 덮어쓰지 않는다.

## 인증이 막혔을 때

로그인 상태부터 확인한다.

```bash
cd arcade
vercel whoami
gh auth status
```

Vercel 로그인이 없으면 `vercel login`, 프로젝트 연결이 없으면 `vercel link --project laika --scope rapinas-projects`, 환경 파일이 없으면 `vercel env pull .env.local --yes`를 실행한다. 토큰 문자열을 채팅이나 터미널 로그에 출력하지 않는다.

## 별도 승인 작업

이 자동화는 기존 Vercel 아케이드 공개까지만 맡는다. Toss `.ait` 제출과 출시, 새 유료 리소스, 계정·도메인 변경은 별도 승인 뒤에 진행한다.
