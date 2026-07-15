import { escapeHtml, formatReleaseDate, isPlayableArtifact, loadCatalog } from "/assets/catalog.js";
import { initializeI18n, localizeGame, t } from "/assets/i18n.js";

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
  feature.querySelector(".status-line").textContent = t("index.gameStatus", {
    maker: game.maker.toUpperCase(),
    status: playableLabel
  });
  feature.querySelector("h3").textContent = game.title;
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

function renderArchive(sources) {
  const games = sources.map(localizeGame);
  document.querySelector("#game-count").textContent = `${games.length} GAME${games.length === 1 ? "" : "S"}`;
  list.innerHTML = games.map((game) => {
    const number = String(game.sequence).padStart(3, "0");
    const status = isPlayableArtifact(game) ? t("index.archivePlay") : t("index.archivePreview");
    return `
      <li class="archive-row">
        <a href="/games/${encodeURIComponent(game.slug)}" aria-label="${escapeHtml(t("index.noteAria", { title: game.title }))}">
          <span class="archive-index">${number}</span>
          <strong class="archive-title">${escapeHtml(game.title)}</strong>
          <span class="archive-description">${escapeHtml(game.oneLine)}</span>
          <span class="archive-meta">${status} · ${escapeHtml(game.releaseDate)}</span>
        </a>
      </li>`;
  }).join("");
}

function render() {
  if (catalogGames.length === 0) return;
  renderFeature(catalogGames[0]);
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
