import { escapeHtml, findGame, formatReleaseDate, getRequestedSlug, loadCatalog } from "/assets/catalog.js";
import { initializeI18n, localizeGame, t } from "/assets/i18n.js";

initializeI18n();

const root = document.querySelector("#detail-root");
let sourceGame = null;

function renderNotFound(message) {
  root.innerHTML = `
    <section class="not-found">
      <p class="eyebrow">NOT FOUND</p>
      <h1>${escapeHtml(message)}</h1>
      <a class="text-link" href="/">${escapeHtml(t("detail.back"))}</a>
    </section>`;
}

function renderGame(source) {
  const game = localizeGame(source);
  const artwork = game.artwork;
  const sources = artwork?.sources ?? [];
  const illustration = sources.at(-1);
  const imageMarkup = illustration ? `
      <figure class="detail-illustration">
        <img
          src="${escapeHtml(illustration.url)}"
          srcset="${escapeHtml(sources.map((source) => `${source.url} ${source.width}w`).join(", "))}"
          sizes="(max-width: 1360px) calc(100vw - 48px), 1360px"
          width="${illustration.width}"
          height="${illustration.height}"
          style="object-position: ${artwork.focalPoint.x * 100}% ${artwork.focalPoint.y * 100}%"
          alt="${escapeHtml(game.artworkAlt)}"
          decoding="async"
        />
        <figcaption>
          <span>${escapeHtml(t("detail.imageCaption", { title: game.title }))}</span>
          <span>BASE / ${escapeHtml(artwork.baseId.toUpperCase())}</span>
        </figcaption>
      </figure>` : "";
  document.title = `${game.title} · Sputnik Workshop`;
  const facts = [
    [t("detail.releaseDate"), formatReleaseDate(game.releaseDate)],
    [t("detail.duration"), game.duration],
    [t("detail.input"), game.input],
    [t("detail.number"), `No. ${String(game.sequence).padStart(3, "0")}`],
    [t("detail.maker"), t("detail.makerValue", { maker: game.maker })],
    [t("detail.studio"), game.studio]
  ];

  root.innerHTML = `
    <article>
      <header class="detail-hero">
        <div>
          <p class="detail-kicker">LAIKA LOG ${String(game.sequence).padStart(3, "0")} · ${escapeHtml(game.releaseDate)}</p>
          <h1>${escapeHtml(game.title)}</h1>
          <p class="korean-title">${escapeHtml(game.alternateTitle)}</p>
        </div>
        <p class="detail-summary">${escapeHtml(game.oneLine)}</p>
      </header>

      ${imageMarkup}

      <div class="detail-body">
        <dl class="detail-facts">
          ${facts.map(([label, value]) => `
            <div class="detail-fact">
              <dt>${escapeHtml(label)}</dt>
              <dd>${escapeHtml(value)}</dd>
            </div>`).join("")}
        </dl>

        <div>
          <section class="detail-essay" aria-labelledby="why-title">
            <h2 id="why-title">${escapeHtml(t("detail.why"))}</h2>
            ${game.why.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
          </section>

          <section class="design-notes" aria-labelledby="notes-title">
            <h2 id="notes-title">${escapeHtml(t("detail.design"))}</h2>
            <ul class="design-note-list">
              ${game.designNotes.map((note) => `
                <li>
                  <span>${escapeHtml(note.label)}</span>
                  <span>${escapeHtml(note.value)}</span>
                </li>`).join("")}
            </ul>
          </section>
        </div>
      </div>

      <div class="detail-cta">
        <span>${escapeHtml(game.instruction)}</span>
        <a href="/play/${encodeURIComponent(game.slug)}">${escapeHtml(t("detail.play"))}</a>
      </div>
    </article>`;
}

function render() {
  if (sourceGame) renderGame(sourceGame);
}

window.addEventListener("sputnik:locale-change", render);

try {
  const slug = getRequestedSlug() || "stitch";
  const catalog = await loadCatalog();
  sourceGame = findGame(catalog, slug);
  if (!sourceGame) renderNotFound(t("detail.notFound"));
  else render();
} catch (error) {
  renderNotFound(error.message);
}
