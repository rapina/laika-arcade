import { escapeHtml, findGame, formatReleaseDate, getRequestedSlug, loadCatalog } from "/assets/catalog.js";
import { initializeI18n, localizeGame, t } from "/assets/i18n.js";
import { fitTitle } from "/assets/fit-title.js";

initializeI18n();

const root = document.querySelector("#detail-root");
let sourceGame = null;
let earthReviewer = null;
let designReviewer = null;

function renderNotFound(message) {
  root.innerHTML = `
    <section class="not-found">
      <p class="eyebrow">NOT FOUND</p>
      <h1>${escapeHtml(message)}</h1>
      <a class="text-link" href="/">${escapeHtml(t("detail.back"))}</a>
    </section>`;
}

function localizedText(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return value[document.documentElement.lang] ?? value.ko ?? "";
}

function renderProcessScene(scene) {
  const frames = [
    ["target", t("detail.processTarget")],
    ["actual", t("detail.processActual")]
  ].filter(([kind]) => scene[kind]?.url);
  return `
    <li class="process-scene">
      <h3>${escapeHtml(localizedText(scene.label))}</h3>
      <div class="process-scene-pair">
        ${frames.map(([kind, caption]) => `
          <figure>
            <img
              src="${escapeHtml(scene[kind].url)}"
              width="${scene[kind].width}"
              height="${scene[kind].height}"
              alt="${escapeHtml(`${localizedText(scene.label)} · ${caption}`)}"
              loading="lazy"
              decoding="async"
            />
            <figcaption>${escapeHtml(caption)}</figcaption>
          </figure>`).join("")}
      </div>
      ${scene.note ? `<p class="process-scene-note">${escapeHtml(localizedText(scene.note))}</p>` : ""}
    </li>`;
}

function renderRetirement(game) {
  if (!game.retirement) return "";
  return `
    <section class="retirement-notice" aria-label="${escapeHtml(t("detail.retired"))}">
      <header>
        <p class="eyebrow">RETIRED TRANSMISSION</p>
        <h2>${escapeHtml(t("detail.retired"))}</h2>
        <p>${escapeHtml(game.retirement.retiredAt)}</p>
      </header>
      <p>${escapeHtml(localizedText(game.retirement.reason))}</p>
    </section>`;
}

function renderDesignProcess(game) {
  const process = game.designProcess;
  if (!process) {
    return `
    <section class="design-process design-process-legacy" aria-labelledby="design-process-title">
      <header class="process-header">
        <p class="eyebrow">DESIGN PROCESS</p>
        <h2 id="design-process-title">${escapeHtml(t("detail.process"))}</h2>
        <p class="process-intro">${escapeHtml(t("detail.processLegacy"))}</p>
      </header>
    </section>`;
  }
  const summary = process.summary?.[document.documentElement.lang] ?? process.summary?.ko ?? [];
  const review = process.review;
  const verdictPass = review?.verdict === "pass";
  const reviewerSources = designReviewer?.sources ?? [];
  const reviewerImage = reviewerSources.at(-1);
  const reviewerFigure = reviewerImage ? `
      <figure class="process-review-figure">
        <img
          src="${escapeHtml(reviewerImage.url)}"
          srcset="${escapeHtml(reviewerSources.map((source) => `${source.url} ${source.width}w`).join(", "))}"
          sizes="(max-width: 1360px) calc(100vw - 48px), 1360px"
          width="${reviewerImage.width}"
          height="${reviewerImage.height}"
          data-focus="${designReviewer.focalPoint.x * 100}% ${designReviewer.focalPoint.y * 100}%"
          alt="${escapeHtml(localizedText(designReviewer.alt))}"
          loading="lazy"
          decoding="async"
        />
      </figure>` : "";
  const reviewMarkup = review ? `
    <div class="process-review" data-verdict="${escapeHtml(review.verdict)}">
      ${reviewerFigure}
      <header>
        <div>
          <p class="eyebrow">DESIGN REVIEW</p>
          <h3>${escapeHtml(t("detail.processReview"))}</h3>
        </div>
        <p>
          ${escapeHtml(t("detail.processReviewer", { reviewer: review.reviewer ?? "Cherpa" }))}
          <span class="process-verdict">${escapeHtml(verdictPass ? t("detail.processVerdictPass") : t("detail.processVerdictBlocked"))}</span>
        </p>
      </header>
      ${designReviewer?.voiceLine ? `<p class="process-review-voice">${escapeHtml(localizedText(designReviewer.voiceLine))}</p>` : ""}
      ${review.summary ? `<p class="process-review-summary">${escapeHtml(localizedText(review.summary))}</p>` : ""}
      ${review.checks?.length ? `
        <ul class="process-checks">
          ${review.checks.map((check) => `
            <li data-status="${escapeHtml(check.status)}">
              <span class="process-check-status">${escapeHtml(t(`detail.processStatus.${check.status}`))}</span>
              <span class="process-check-copy">
                <span>${escapeHtml(localizedText(check.claim))}</span>
                <span>${escapeHtml(localizedText(check.observed))}</span>
              </span>
            </li>`).join("")}
        </ul>` : ""}
    </div>` : "";
  return `
    <section class="design-process" aria-labelledby="design-process-title">
      <header class="process-header">
        <p class="eyebrow">DESIGN PROCESS</p>
        <h2 id="design-process-title">${escapeHtml(t("detail.process"))}</h2>
        <p class="process-intro">${escapeHtml(t("detail.processIntro"))}</p>
      </header>
      ${summary.length ? `<div class="process-summary">${summary.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}</div>` : ""}
      ${process.scenes?.length ? `<ol class="process-scenes">${process.scenes.map(renderProcessScene).join("")}</ol>` : ""}
      ${reviewMarkup}
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
          data-focus="${artwork.focalPoint.x * 100}% ${artwork.focalPoint.y * 100}%"
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
    ...(game.model ? [[t("detail.model"), game.model]] : []),
    [t("detail.studio"), game.studio]
  ];
  const reviewArtwork = game.earthReview?.artwork ?? earthReviewer;
  const reviewerCopy = earthReviewer ? {
    alt: reviewArtwork?.alt?.[document.documentElement.lang] ?? reviewArtwork?.alt?.ko ?? "",
    voiceLine: earthReviewer.voiceLine?.[document.documentElement.lang] ?? earthReviewer.voiceLine?.ko ?? ""
  } : null;
  const reviewerSources = reviewArtwork?.sources ?? [];
  const reviewerImage = reviewerSources.at(-1);
  const reviewMarkup = game.earthReview ? `
    <section class="earth-review" aria-labelledby="earth-review-title">
      ${reviewerImage ? `<figure>
        <img
          src="${escapeHtml(reviewerImage.url)}"
          srcset="${escapeHtml(reviewerSources.map((source) => `${source.url} ${source.width}w`).join(", "))}"
          sizes="(max-width: 720px) calc(100vw - 48px), 42vw"
          width="${reviewerImage.width}"
          height="${reviewerImage.height}"
          data-focus="${reviewArtwork.focalPoint.x * 100}% ${reviewArtwork.focalPoint.y * 100}%"
          alt="${escapeHtml(reviewerCopy.alt)}"
          loading="lazy"
          decoding="async"
        />
      </figure>` : ""}
      <div class="earth-review-copy">
        <header>
          <div>
            <p class="eyebrow">EARTH PLAY 001</p>
            <h2 id="earth-review-title">${escapeHtml(t("detail.earthReview"))}</h2>
          </div>
          <p>${escapeHtml(t("detail.reviewer", { reviewer: game.earthReview.reviewer }))}</p>
        </header>
        ${reviewerCopy ? `<p class="earth-review-voice">${escapeHtml(reviewerCopy.voiceLine)}</p>` : ""}
        <blockquote>${escapeHtml(game.earthReview.impression)}</blockquote>
        <dl>
          <div><dt>${escapeHtml(t("detail.reviewWorked"))}</dt><dd>${escapeHtml(game.earthReview.worked)}</dd></div>
          <div><dt>${escapeHtml(t("detail.reviewFriction"))}</dt><dd>${escapeHtml(game.earthReview.friction)}</dd></div>
          <div><dt>${escapeHtml(t("detail.reviewCarry"))}</dt><dd>${escapeHtml(game.earthReview.carry)}</dd></div>
        </dl>
      </div>
    </section>` : "";

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

      ${renderRetirement(source)}

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

      ${renderDesignProcess(source)}

      ${reviewMarkup}

      <div class="detail-cta">
        <span>${escapeHtml(game.instruction)}</span>
        <a href="/play/${encodeURIComponent(game.slug)}">${escapeHtml(t("detail.play"))}</a>
      </div>
    </article>`;

  // 운영 CSP는 style-src 'self'라 마크업의 style 속성이 막힌다. 초점은 CSSOM으로 넣는다.
  for (const image of root.querySelectorAll("img[data-focus]")) {
    image.style.objectPosition = image.dataset.focus;
  }
}

function render() {
  if (sourceGame) { renderGame(sourceGame); fitTitle(root.querySelector(".detail-hero h1"), { min: 44 }); }
}

window.addEventListener("sputnik:locale-change", render);

try {
  const slug = getRequestedSlug();
  if (!slug) throw new Error(t("detail.notFound"));
  const catalog = await loadCatalog();
  earthReviewer = catalog.earthReviewer ?? null;
  designReviewer = catalog.designReviewer ?? null;
  sourceGame = findGame(catalog, slug);
  if (!sourceGame) renderNotFound(t("detail.notFound"));
  else render();
} catch (error) {
  renderNotFound(error.message);
}
