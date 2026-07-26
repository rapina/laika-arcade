import { escapeHtml, loadCatalog } from "/assets/catalog.js";
import { getLocale, initializeI18n } from "/assets/i18n.js";

initializeI18n();

const root = document.querySelector("#sample-root");
const selectedSlug = new URLSearchParams(location.search).get("game");

function localized(game, field) {
  const locale = getLocale();
  return game.content?.[locale]?.[field] ?? game.content?.ko?.[field] ?? "";
}

function renderEmpty() {
  document.title = "Laika Arcade · Making";
  root.innerHTML = `
    <section class="reboot-empty" aria-labelledby="making-title">
      <div class="empty-screen">
        <p>LAIKA ARCADE / MAKING</p>
        <h1 id="making-title">NEW GAME<br>IN PRODUCTION</h1>
        <div class="pixel-loader" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
      </div>
      <a class="back-home" href="/">← ABOUT</a>
    </section>`;
}

function renderIndex(games) {
  if (games.length === 0) return renderEmpty();
  const ordered = [...games].sort((a, b) => b.sequence - a.sequence);
  root.innerHTML = `
    <section class="reboot-catalog" aria-labelledby="making-title">
      <header>
        <p>NEW RELEASES</p>
        <h1 id="making-title">MAKING</h1>
      </header>
      <ol>
        ${ordered.map((game) => `
          <li>
            <a href="/making?game=${encodeURIComponent(game.slug)}">
              <span>${String(game.sequence).padStart(2, "0")}</span>
              <strong>${escapeHtml(localized(game, "title"))}</strong>
              <small>${game.status === "published" ? "PLAYABLE" : "IN PRODUCTION"}</small>
            </a>
          </li>`).join("")}
      </ol>
    </section>`;
}

function renderGame(game) {
  const locale = getLocale();
  const review = game.designProcess?.review;
  const process = game.designProcess;
  const scenes = process?.scenes ?? [];
  const copy = locale === "ko" ? {
    back: "← 제작 목록",
    game: "게임",
    status: game.status === "published" ? "공개됨" : "제작 중",
    brief: "설계",
    reference: "기준",
    referenceValue: "1992년 핀볼 테이블의 발사, 작업, 볼 락, 멀티볼 흐름",
    scope: "범위",
    scopeValue: "세로 테이블 1개 · 기본 공 3개 · 배달 작업 3개 · Dawn Express",
    controls: "입력",
    material: "자료와 실제 화면",
    target: "설계 자료",
    actual: "실제 빌드",
    check: "출고 검사",
    tests: "제작자 테스트",
    testValue: "24개 규칙 테스트 · 웹/아케이드 빌드 · 세로 화면 · 포털 CSP",
    play: "게임 열기",
  } : {
    back: "← MAKING INDEX",
    game: "GAME",
    status: game.status === "published" ? "PUBLISHED" : "IN PRODUCTION",
    brief: "DESIGN",
    reference: "REFERENCE",
    referenceValue: "Launch, jobs, ball locks, and multiball from a 1992 pinball table",
    scope: "SCOPE",
    scopeValue: "1 portrait table · 3 base balls · 3 delivery jobs · Dawn Express",
    controls: "INPUT",
    material: "MATERIAL / BUILD",
    target: "DESIGN MATERIAL",
    actual: "ACTUAL BUILD",
    check: "RELEASE CHECK",
    tests: "CREATOR TESTS",
    testValue: "24 rule tests · web/Arcade builds · portrait layouts · portal CSP",
    play: "OPEN GAME",
  };
  document.title = `${localized(game, "title")} · Laika Arcade`;
  root.innerHTML = `
    <article class="reboot-record">
      <a class="back-home" href="/making">${copy.back}</a>
      <header class="record-hero">
        <div class="record-heading">
          <p>${copy.game} ${String(game.sequence).padStart(3, "0")} / ${copy.status}</p>
          <h1>${escapeHtml(localized(game, "title"))}</h1>
          <span>${escapeHtml(localized(game, "oneLine"))}</span>
        </div>
        ${game.artwork?.sources?.[0] ? `<img src="${game.artwork.sources[0].url}" alt="${escapeHtml(game.artwork.alt?.[getLocale()] ?? "")}">` : ""}
      </header>
      <section class="record-brief" aria-labelledby="record-brief-title">
        <h2 id="record-brief-title">${copy.brief}</h2>
        <div><b>${copy.reference}</b><p>${copy.referenceValue}</p></div>
        <div><b>${copy.scope}</b><p>${copy.scopeValue}</p></div>
        <div><b>${copy.controls}</b><p>${escapeHtml(localized(game, "instruction"))}</p></div>
      </section>
      <section class="process-record" aria-labelledby="process-title">
        <header>
          <p>01—03 / RECORD</p>
          <h2 id="process-title">${copy.material}</h2>
        </header>
        <ol class="record-timeline">
          ${scenes.map((scene) => `
            <li>
              <div class="timeline-mark" aria-hidden="true"><i></i></div>
              <div class="timeline-entry">
                <h3>${escapeHtml(scene.label?.[locale] ?? scene.id)}</h3>
                <p>${escapeHtml(scene.note?.[locale] ?? "")}</p>
                <div class="scene-pair">
                  <figure>
                    <figcaption>${copy.target}</figcaption>
                    <img src="${scene.target.url}" width="${scene.target.width}" height="${scene.target.height}" alt="">
                  </figure>
                  <figure>
                    <figcaption>${copy.actual}</figcaption>
                    <img src="${scene.actual.url}" width="${scene.actual.width}" height="${scene.actual.height}" alt="">
                  </figure>
                </div>
              </div>
            </li>`).join("")}
        </ol>
      </section>
      <section class="record-check">
        <div>
          <h2>${copy.check}</h2>
          <strong>${escapeHtml(review?.verdict?.toUpperCase() ?? "PENDING")}</strong>
          <p>${escapeHtml(review?.summary?.[locale] ?? "")}</p>
        </div>
        <div>
          <h2>${copy.tests}</h2>
          <strong>24 / 24</strong>
          <p>${copy.testValue}</p>
        </div>
      </section>
      ${game.status === "published" ? `<a class="play-button" href="/play/${encodeURIComponent(game.slug)}">${copy.play} ↗</a>` : ""}
    </article>`;
}

try {
  const catalog = await loadCatalog();
  const games = catalog.games ?? [];
  if (!selectedSlug) renderIndex(games);
  else {
    const game = games.find((candidate) => candidate.slug === selectedSlug);
    if (!game) {
      history.replaceState(null, "", "/making");
      renderEmpty();
    } else renderGame(game);
  }
} catch {
  renderEmpty();
}
