import { escapeHtml, loadCatalog } from "/assets/catalog.js";
import { initializeI18n, t } from "/assets/i18n.js";

initializeI18n();

const list = document.querySelector("#history-list");
let entries = [];
let catalogGames = [];

function localizedText(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return value[document.documentElement.lang] ?? value.ko ?? "";
}

function gameTitle(slug) {
  const game = catalogGames.find((candidate) => candidate.slug === slug);
  if (!game) return null;
  return game.content?.[document.documentElement.lang]?.title ?? game.content?.ko?.title ?? slug;
}

function renderEntry(entry) {
  const paragraphs = entry.body?.[document.documentElement.lang] ?? entry.body?.ko ?? [];
  const refs = (entry.refs ?? [])
    .map((slug) => [slug, gameTitle(slug)])
    .filter(([, title]) => title)
    .map(([slug, title]) => `<a href="/making?game=${encodeURIComponent(slug)}">${escapeHtml(title)}</a>`);
  const adr = (entry.adr ?? []).map((number) => `<span>ADR ${escapeHtml(number)}</span>`);
  return `
    <li class="history-entry">
      <div class="history-marker">
        <span class="history-date">${escapeHtml(entry.date)}</span>
      </div>
      <div class="history-copy">
        <h2>${escapeHtml(localizedText(entry.title))}</h2>
        ${paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
        ${refs.length || adr.length ? `
          <p class="history-refs">
            ${refs.length ? `<span class="history-refs-label">${escapeHtml(t("history.related"))}</span> ${refs.join(" · ")}` : ""}
            ${adr.length ? `<span class="history-adr">${adr.join(" ")}</span>` : ""}
          </p>` : ""}
      </div>
    </li>`;
}

function render() {
  if (entries.length === 0) return;
  list.innerHTML = entries.map(renderEntry).join("");
}

window.addEventListener("sputnik:locale-change", render);

try {
  const [processResponse, catalog] = await Promise.all([
    fetch("/catalog/process.json", { cache: "no-cache" }),
    loadCatalog(),
  ]);
  if (!processResponse.ok) throw new Error(t("history.loadError"));
  const processLog = await processResponse.json();
  catalogGames = catalog.games ?? [];
  // 기록은 새것이 위다. 데이터가 어긋나도 화면은 시간순으로 보여 준다.
  // 같은 날 안에서는 파일에 적힌 차례를 그대로 지킨다.
  entries = [...(processLog.entries ?? [])]
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => (a.entry.date === b.entry.date
      ? a.index - b.index
      : (a.entry.date < b.entry.date ? 1 : -1)))
    .map(({ entry }) => entry);
  if (entries.length === 0) throw new Error(t("history.loadError"));
  render();
} catch (error) {
  list.innerHTML = `<li class="history-loading">${escapeHtml(error.message)}</li>`;
}
