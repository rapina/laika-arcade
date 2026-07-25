import { escapeHtml, formatReleaseDate, isPlayableArtifact, loadCatalog } from "/assets/catalog.js";
import { initializeI18n, localizeGame, t } from "/assets/i18n.js";
import { fitTitle } from "/assets/fit-title.js";

initializeI18n();

const feature = document.querySelector("#daily-feature");
const list = document.querySelector("#archive-list");
let catalogGames = [];

function renderFeature(source) {
  const game = localizeGame(source);
  const playableLabel = isPlayableArtifact(game) ? t("index.playable") : t("index.preview");
  const artwork = game.artwork;
  const sources = artwork?.sources ?? [];
  const fallback = sources.at(-1);
  const image = feature.querySelector("#daily-image");
  const releaseYear = /^\d{4}/.test(game.releaseDate) ? game.releaseDate.slice(0, 4) : "----";
  document.querySelector("#issue-label").textContent = `LAIKA LOG ${String(game.sequence).padStart(3, "0")} · ${releaseYear}`;
  document.querySelector("#release-date").textContent = formatReleaseDate(game.releaseDate);
  feature.querySelector(".status-line").textContent = [
    t("index.gameStatus", { maker: game.maker.toUpperCase(), status: playableLabel }),
    game.model ? game.model.toUpperCase() : null,
  ].filter(Boolean).join(" · ");
  feature.querySelector("h3").textContent = game.title;
  fitTitle(feature.querySelector("h3"), { min: 36 });
  feature.querySelector(".korean-title").textContent = game.alternateTitle;
  feature.querySelector(".dek").textContent = game.oneLine;
  feature.querySelector(".feature-number").textContent = String(game.sequence).padStart(3, "0");
  feature.querySelector(".text-link").href = `/games/${encodeURIComponent(game.slug)}`;
  feature.querySelector(".play-link").href = `/play/${encodeURIComponent(game.slug)}`;
  if (fallback) {
    image.src = fallback.url;
    image.srcset = sources.map((source) => `${source.url} ${source.width}w`).join(", ");
    image.sizes = "(max-width: 680px) calc(100vw - 24px), (max-width: 1360px) 66vw, 890px";
    image.width = fallback.width;
    image.height = fallback.height;
    image.alt = game.artworkAlt;
    image.loading = "lazy";
    image.decoding = "async";
    image.style.objectPosition = `${artwork.focalPoint.x * 100}% ${artwork.focalPoint.y * 100}%`;
  }
}

function processFlag(game) {
  if (game.status === "retired") return ["retired", t("index.flagRetired")];
  if (game.designProcess) return ["open", t("index.flagOpenProcess")];
  return ["early", t("index.flagEarlyProcess")];
}

function renderArchive(sources) {
  const games = sources.map(localizeGame);
  document.querySelector("#game-count").textContent = `${games.length} GAME${games.length === 1 ? "" : "S"}`;
  list.innerHTML = games.map((game) => {
    const number = String(game.sequence).padStart(3, "0");
    const status = isPlayableArtifact(game) ? t("index.archivePlay") : t("index.archivePreview");
    const [flagKind, flagLabel] = processFlag(game);
    return `
      <li class="archive-row" data-flag="${flagKind}">
        <a href="/games/${encodeURIComponent(game.slug)}" aria-label="${escapeHtml(t("index.noteAria", { title: game.title }))}">
          <span class="archive-index">${number}</span>
          <strong class="archive-title">${escapeHtml(game.title)}</strong>
          <span class="archive-description">${escapeHtml(game.oneLine)}</span>
          <span class="archive-meta"><span class="archive-flag" data-flag="${flagKind}">${escapeHtml(flagLabel)}</span> · ${status} · ${escapeHtml(game.releaseDate)}${game.model ? ` · ${escapeHtml(game.model)}` : ""}</span>
        </a>
      </li>`;
  }).join("");
}

function localizedText(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return value[document.documentElement.lang] ?? value.ko ?? "";
}

// 데모의 핵심 사실은 몇 편 만들었는지가 아니라, 몇 편을 막고 물렸는지다.
// 숫자는 카탈로그에서 세어 화면과 기록이 어긋나지 않게 한다.
function renderLedger(sources) {
  const held = sources.filter((game) => game.designProcess?.review?.held);
  const retired = sources.filter((game) => game.retirement);
  const reviewed = sources.filter((game) => game.designProcess);
  const stats = [
    [String(sources.length), t("index.ledgerSent"), t("index.ledgerSentNote")],
    [String(held.length), t("index.ledgerHeld"), t("index.ledgerHeldNote")],
    [String(retired.length), t("index.ledgerRetired"), t("index.ledgerRetiredNote")],
    [String(reviewed.length), t("index.ledgerReviewed"), t("index.ledgerReviewedNote")]
  ];
  document.querySelector("#ledger-stats").innerHTML = stats.map(([value, label, note]) => `
    <div class="ledger-stat">
      <dt>${escapeHtml(label)}</dt>
      <dd><strong>${escapeHtml(value)}</strong><span>${escapeHtml(note)}</span></dd>
    </div>`).join("");

  const cases = [
    ...held.map((game) => [game, t("index.ledgerCaseHeld"), game.designProcess.review.held.reason, "held"]),
    ...retired.map((game) => [game, t("index.ledgerCaseRetired"), game.retirement.reason, "retired"])
  ];
  document.querySelector("#ledger-cases").innerHTML = cases.map(([game, kind, reason, flag]) => {
    const localized = localizeGame(game);
    return `
      <li class="ledger-case" data-flag="${flag}">
        <p class="ledger-case-kind">${escapeHtml(kind)}</p>
        <a href="/games/${encodeURIComponent(game.slug)}">
          <strong>${escapeHtml(localized.title)}</strong>
          <span>No. ${String(game.sequence).padStart(3, "0")}</span>
        </a>
        <p class="ledger-case-reason">${escapeHtml(localizedText(reason))}</p>
      </li>`;
  }).join("");
}

function render() {
  if (catalogGames.length === 0) return;
  renderLedger(catalogGames);
  renderFeature(catalogGames.find((game) => game.status !== "retired") ?? catalogGames[0]);
  renderArchive(catalogGames);
}

window.addEventListener("sputnik:locale-change", render);

try {
  const catalog = await loadCatalog();
  catalogGames = [...catalog.games].sort((a, b) => b.sequence - a.sequence);
  if (catalogGames.length === 0) throw new Error(t("index.loading"));
  render();
} catch (error) {
  list.innerHTML = `<li class="archive-row archive-loading">${escapeHtml(error.message)}</li>`;
}
