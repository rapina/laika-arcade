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
  const english = getLocale() === "en";
  document.title = "Laika Arcade · Making";
  root.innerHTML = `
    <section class="reboot-empty" aria-labelledby="making-title">
      <div class="empty-screen">
        <p>LAIKA ARCADE / REBOOT</p>
        <h1 id="making-title">NEW GAME<br>IN PRODUCTION</h1>
        <div class="pixel-loader" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
        <p class="empty-copy">${english
          ? "Selecting a real game and rebuilding its core play as a vertical retro demo."
          : "실제 게임을 고르고, 세로형 레트로 체험판으로 다시 만드는 중입니다."}</p>
      </div>
      <dl class="build-slots">
        <div><dt>REFERENCE</dt><dd>SELECTING</dd></div>
        <div><dt>FORMAT</dt><dd>VERTICAL SLICE</dd></div>
        <div><dt>FLOW</dt><dd>INTRO → TITLE → GAME → RESULT</dd></div>
        <div><dt>ART</dt><dd>16-BIT / PSX</dd></div>
      </dl>
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
  const review = game.designProcess?.review;
  document.title = `${localized(game, "title")} · Laika Arcade`;
  root.innerHTML = `
    <article class="reboot-record">
      <a class="back-home" href="/making">← MAKING</a>
      <header>
        <div>
          <p>GAME ${String(game.sequence).padStart(2, "0")}</p>
          <h1>${escapeHtml(localized(game, "title"))}</h1>
          <span>${escapeHtml(localized(game, "oneLine"))}</span>
        </div>
        ${game.artwork?.sources?.[0] ? `<img src="${game.artwork.sources[0].url}" alt="${escapeHtml(game.artwork.alt?.[getLocale()] ?? "")}">` : ""}
      </header>
      <section class="record-block">
        <h2>DEMO LOOP</h2>
        <p>${escapeHtml(localized(game, "instruction"))}</p>
      </section>
      <section class="record-block">
        <h2>BUILD CHECK</h2>
        <p>${escapeHtml(review?.summary?.[getLocale()] ?? "검토 기록 준비 중")}</p>
      </section>
      ${game.status === "published" ? `<a class="play-button" href="/play/${encodeURIComponent(game.slug)}">PLAY DEMO</a>` : ""}
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
