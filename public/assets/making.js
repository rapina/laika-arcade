import { escapeHtml, loadCatalog } from "/assets/catalog.js";
import { initializeI18n } from "/assets/i18n.js";

initializeI18n();
const root = document.querySelector("#sample-root");
const params = new URLSearchParams(window.location.search);
const selectedSlug = params.get("game");

const titleOf = (game) => game.content?.ko?.title ?? game.slug;
const no = (game) => String(game.sequence).padStart(3, "0");

const nebulaTimeline = [
  {
    stage: "01",
    actor: "LAIKA",
    kind: "구상",
    title: "빛실과 일곱 매듭",
    body: "두 빛점 사이의 실로 성운 생물을 포획한다. 모은 빛은 별핵 주위에서 일곱 매듭이 된다.",
    evidence: ["8–12분 캠페인", "두 손가락 또는 한 점씩", "실꾸러미 3개"],
    artifact: {
      type: "gdd",
      label: "GDD.md / 제작 입력",
    },
  },
  {
    stage: "02",
    actor: "LAIKA",
    kind: "첫 빌드",
    title: "첫 플레이 빌드",
    body: "포획, 장력, 매듭, 점수를 구현했다. 규칙 테스트 26개를 통과한 뒤 외부 설명 없이 플레이어에게 전달했다.",
    evidence: ["BUILD aa316a99", "TEST 26 / 26", "390 × 844"],
    artifact: {
      type: "initial",
      label: "INITIAL BUILD / aa316a99",
    },
  },
  {
    stage: "03",
    actor: "BLIND PLAYER",
    kind: "낯선 플레이",
    title: "02/07 도달, 실패 원인 미인지",
    body: "플레이어는 두 빛점과 실의 역할을 이해했다. 한 손 조작, 장력 표시, 포획 판정, 초기화 원인은 읽지 못했다.",
    quote: "“결과 설명 없이 01/07·0점으로 두 번 돌아갔다.”",
    evidence: ["2,780점", "02/07 도달", "마찰 5건"],
    artifact: {
      type: "playtest",
      label: "BLIND PLAY REPORT / BUILD ONLY",
    },
  },
  {
    stage: "04",
    actor: "LAIKA",
    kind: "재제작",
    title: "관찰 5건 반영",
    body: "앵커 번호, 숫자형 장력, 개별 포획 표시, 파손 원인, 전용 재시작을 추가했다. 조작 규칙은 바꾸지 않았다.",
    changes: [
      ["입력", "두 손가락 또는 하나씩"],
      ["상태", "남은 실 3/3 · 장력 0%"],
      ["실패", "원인 표시 · 보호된 재시작"],
    ],
    evidence: ["BUILD 20f61369", "TEST 27 / 27", "변경 5건"],
    artifact: {
      type: "rebuild",
      label: "MAKER RESPONSE / 5 CHANGES",
    },
  },
  {
    stage: "05",
    actor: "CHERPA",
    kind: "출고 점검",
    title: "설계 대조 20건",
    body: "최종 설계의 조작, 포획, 장력, 일곱 단계, 결과, 재시작을 실제 빌드와 대조했다.",
    evidence: ["20 / 20 구현", "VERDICT PASS", "오류 0"],
    artifact: {
      type: "review",
      label: "DESIGN REVIEW / source 20f61369",
    },
  },
  {
    stage: "06",
    actor: "MURR",
    kind: "지구 플레이",
    title: "02/07, 2,820점",
    body: "공개본에서 첫 별자리를 완료했다. 선과 점의 관계, 실이 끊어지기 전 위험은 늦게 읽혔다.",
    quote: "“다음에는 둘째 별자리의 움직임과 보상이 어떻게 다른지 보고 싶어.”",
    evidence: ["드래그 23회", "02/07 도달", "남은 문제 2건"],
    artifact: {
      type: "murr",
      label: "EARTH PLAY / 2026-07-26 16:01",
    },
  },
];

function renderArtifact(item) {
  if (item.artifact.type === "gdd") return `
    <section class="artifact artifact-document">
      <header><span>${item.artifact.label}</span><b>01 / 06</b></header>
      <div class="document-sheet">
        <p class="document-path">GDD.md</p>
        <h3>플레이 흐름</h3>
        <ol>
          <li>두 빛점을 움직여 실이 생물을 받는 모습을 확인한다.</li>
          <li>지정 수의 생물을 빛실에 닿게 해 별빛을 모은다.</li>
          <li>실의 중점을 별핵에 맞추고 두 앵커를 가까이 유지한다.</li>
          <li>일곱 매듭을 묶거나 실꾸러미 3개를 잃으면 끝난다.</li>
        </ol>
        <table>
          <thead><tr><th>별자리</th><th>포획</th><th>안전 길이</th><th>조임 거리</th></tr></thead>
          <tbody>
            <tr><td>숨</td><td>4</td><td>272</td><td>114</td></tr>
            <tr><td>쌍둥이</td><td>5</td><td>258</td><td>108</td></tr>
            <tr><td>파도</td><td>6</td><td>250</td><td>102</td></tr>
            <tr class="table-more"><td colspan="4">고리 · 나선 · 유성 · 왕관</td></tr>
          </tbody>
        </table>
      </div>
    </section>`;

  if (item.artifact.type === "initial") return `
    <section class="artifact artifact-initial">
      <header><span>${item.artifact.label}</span><b>02 / 06</b></header>
      <div class="missing-capture">
        <span aria-hidden="true">×</span>
        <div>
          <h3>화면 캡처 미보존</h3>
          <p>초기 빌드 해시와 테스트 결과만 남아 있다.</p>
        </div>
      </div>
      <pre><code>$ npm test
Test Files  4 passed
Tests       26 passed

$ npm run build:arcade
immutable release verified</code></pre>
    </section>`;

  if (item.artifact.type === "playtest") return `
    <section class="artifact artifact-report">
      <header><span>${item.artifact.label}</span><b>03 / 06</b></header>
      <dl class="report-grid">
        <div><dt>이해</dt><dd>실로 빛을 받고 중점을 맞춘 뒤 두 점을 좁혀 별자리를 묶는다.</dd></div>
        <div><dt>시도</dt><dd>각 앵커 드래그, 연속 입력, 중점 정렬, 일시정지와 재개.</dd></div>
        <div><dt>도달</dt><dd>02/07 쌍둥이, 2,780점, 다음 중점 단계.</dd></div>
        <div class="report-friction"><dt>마찰</dt><dd>
          <ul>
            <li>한 손 입력 허용 여부 불명</li>
            <li>앵커 복귀의 의미 불명</li>
            <li>세 원과 장력 막대의 의미 불명</li>
            <li>개별 포획 판정 추적 불가</li>
            <li>실패 원인과 초기화 설명 없음</li>
          </ul>
        </dd></div>
      </dl>
    </section>`;

  if (item.artifact.type === "rebuild") return `
    <section class="artifact artifact-rebuild">
      <header><span>${item.artifact.label}</span><b>04 / 06</b></header>
      <div class="rebuild-layout">
        <figure>
          <img src="/art/process-sample/nebulacradle-final.jpg" width="390" height="844" alt="재제작 뒤 한 손과 두 손 조작을 함께 알리는 튜토리얼 화면">
          <figcaption>FINAL BUILD / 20f61369</figcaption>
        </figure>
        <ol class="response-list">
          <li><span>한 손 입력 불명</span><b>두 손가락 또는 하나씩 명시</b></li>
          <li><span>앵커 확정 불명</span><b>번호, 확정 고리, 짧은 음 추가</b></li>
          <li><span>상태 표시 불명</span><b>남은 실과 장력을 숫자로 교체</b></li>
          <li><span>포획 추적 불가</span><b>개별 광선과 점수 0.72초 표시</b></li>
          <li><span>초기화 원인 불명</span><b>실패 원인과 전용 재시작 추가</b></li>
        </ol>
      </div>
    </section>`;

  if (item.artifact.type === "review") return `
    <section class="artifact artifact-review">
      <header><span>${item.artifact.label}</span><b>05 / 06</b></header>
      <div class="review-proof">
        <figure>
          <img src="/art/process-sample/nebulacradle-final.jpg" width="390" height="844" alt="체르파가 대조한 최종 게임의 튜토리얼 화면">
          <figcaption>390 × 844 / PRODUCTION BUILD</figcaption>
        </figure>
        <div>
          <p class="review-total"><strong>20</strong><span>설계 대조</span><b>20 구현</b></p>
          <ul>
            <li><span>두 앵커 순차 조작</span><b>IMPLEMENTED</b></li>
            <li><span>포획 간격과 점수 표시</span><b>IMPLEMENTED</b></li>
            <li><span>장력 100% 파손 결과</span><b>IMPLEMENTED</b></li>
            <li><span>별핵 정렬과 매듭</span><b>IMPLEMENTED</b></li>
            <li><span>결과 보호와 전용 재시작</span><b>IMPLEMENTED</b></li>
          </ul>
          <p class="review-command">npm test · test:input · build:arcade · viewport · smoke</p>
        </div>
      </div>
    </section>`;

  return `
    <section class="artifact artifact-murr">
      <header><span>${item.artifact.label}</span><b>06 / 06</b></header>
      <figure>
        <img src="/art/process-sample/nebulacradle-murr.jpg" width="1100" height="733" alt="지구 수신실에서 성운 실뜨기를 플레이하는 무르">
        <figcaption>MURR / 390 × 844 / RELEASE ab8310f8</figcaption>
      </figure>
      <div class="earth-session">
        <dl>
          <div><dt>1차</dt><dd>1,200점 · 0/7 · 실 3개 파손</dd></div>
          <div><dt>2차</dt><dd>2,820점 · 02/07 진입</dd></div>
          <div><dt>입력</dt><dd>탭 4회 · 드래그 23회</dd></div>
        </dl>
        <blockquote>선과 점의 관계, 실이 끊어지기 전 위험을 늦게 읽었다.</blockquote>
      </div>
    </section>`;
}

function renderOverview(games) {
  const ordered = [...games].sort((a, b) => b.sequence - a.sequence);
  root.innerHTML = `
    <section class="catalog-switchboard" aria-labelledby="switchboard-title">
      <header>
        <div>
          <p class="signal-label">OPEN WORKSHOP / INDEX</p>
          <h1 id="switchboard-title">제작 기록</h1>
        </div>
        <div class="index-legend">
          <span><i class="dot open"></i> 025 형식 미리보기</span>
          <span><i class="dot legacy"></i> 001-024 이전 기록</span>
        </div>
      </header>
      <ol class="game-matrix">
        ${ordered.map((game) => {
          const preview = game.slug === "nebulacradle";
          const status = game.status === "published"
            ? "PUBLISHED"
            : game.status === "retired" ? "RETIRED" : "IN PROGRESS";
          return `<li>
            <a href="/making?game=${encodeURIComponent(game.slug)}" class="${preview ? "is-preview" : ""}">
              <span class="matrix-no">${no(game)}</span>
              <span class="matrix-title">${escapeHtml(titleOf(game))}</span>
              <span class="matrix-state">${status} · ${preview ? "FULL RECORD →" : "EARLY RECORD"}</span>
            </a>
          </li>`;
        }).join("")}
      </ol>
    </section>`;
}

function renderLegacy(game) {
  document.title = `${titleOf(game)} · Laika Earlier Record`;
  root.innerHTML = `
    <article class="timeline-page">
      <a class="back-link" href="/making">← 게임 기록</a>
      <header class="timeline-hero legacy-hero">
        <p class="signal-label">LEGACY GAME / ${no(game)}</p>
        <h1>${escapeHtml(titleOf(game))}</h1>
        <p>공개 제작 기록 체계 이전의 게임입니다. 당시 남긴 자료만 표시합니다.</p>
        <div class="legacy-actions">
          <a href="/games/${encodeURIComponent(game.slug)}">작품 노트 보기</a>
          ${game.status === "published" ? `<a href="/play/${encodeURIComponent(game.slug)}">플레이하기</a>` : ""}
        </div>
      </header>
      <section class="legacy-record">
        <span>AVAILABLE RECORD</span>
        <dl>
          <div><dt>공개일</dt><dd>${escapeHtml(game.releaseDate ?? "기록 없음")}</dd></div>
          <div><dt>제작 노트</dt><dd>${game.content?.ko?.why?.length ? `${game.content.ko.why.length}개 문단` : "기록 없음"}</dd></div>
          <div><dt>공개 후 플레이</dt><dd>${game.earthReview ? "기록 있음" : "기록 없음"}</dd></div>
        </dl>
      </section>
    </article>`;
}

function renderTimeline(game) {
  document.title = `${titleOf(game)} · Laika Making Record`;
  root.innerHTML = `
    <article class="timeline-page">
      <a class="back-link" href="/making">← 게임 기록</a>
      <header class="timeline-hero">
        <div class="timeline-title">
          <p class="signal-label">OPEN WORKSHOP FORMAT PREVIEW / ${no(game)}</p>
          <h1>${escapeHtml(titleOf(game))}</h1>
          <p>${escapeHtml(game.content?.ko?.oneLine ?? "")}</p>
        </div>
        <img src="/art/process-sample/nebulacradle-laika.jpg" width="1100" height="733" alt="우주선 안에서 두 앞발로 빛실을 당겨 별핵 주위에 매듭을 만드는 라이카">
        <dl class="timeline-stats">
          <div><dt>첫 빌드</dt><dd>aa316a99</dd></div>
          <div><dt>최종 빌드</dt><dd>20f61369</dd></div>
          <div><dt>제작 테스트</dt><dd>27 / 27</dd></div>
          <div><dt>지구 도달</dt><dd>02 / 07</dd></div>
        </dl>
      </header>
      <nav class="stage-jump" aria-label="제작 단계">
        ${nebulaTimeline.map((item) => `<a href="#stage-${item.stage}"><b>${item.stage}</b><span>${item.kind}</span></a>`).join("")}
      </nav>
      <ol class="making-timeline">
        ${nebulaTimeline.map((item) => `
          <li id="stage-${item.stage}">
            <div class="timeline-marker"><span>${item.stage}</span></div>
            <article>
              <header>
                <p>${escapeHtml(item.actor)} / ${escapeHtml(item.kind)}</p>
                <h2>${escapeHtml(item.title)}</h2>
              </header>
              <p class="stage-body">${escapeHtml(item.body)}</p>
              ${item.quote ? `<blockquote>${escapeHtml(item.quote)}</blockquote>` : ""}
              ${item.changes ? `<dl class="change-list">${item.changes.map(([before, after]) => `<div><dt>${escapeHtml(before)}</dt><dd>${escapeHtml(after)}</dd></div>`).join("")}</dl>` : ""}
              <ul class="evidence">${item.evidence.map((value) => `<li>${escapeHtml(value)}</li>`).join("")}</ul>
              ${renderArtifact(item)}
            </article>
          </li>`).join("")}
      </ol>
      <footer class="timeline-end">
        <p><span>미해결 2건</span> 선과 점의 관계, 파손 전 위험 표시. 다음 제작 기록으로 이관.</p>
        <a href="/play/${encodeURIComponent(game.slug)}">최종 게임 플레이 →</a>
      </footer>
    </article>`;
}

try {
  const catalog = await loadCatalog();
  const games = catalog.games ?? [];
  if (!selectedSlug) renderOverview(games);
  else {
    const game = games.find((candidate) => candidate.slug === selectedSlug);
    if (!game) throw new Error("게임 기록을 찾지 못했습니다.");
    if (game.slug === "nebulacradle") renderTimeline(game);
    else renderLegacy(game);
  }
} catch (error) {
  root.innerHTML = `<p class="loading">${escapeHtml(error.message)}</p>`;
}
