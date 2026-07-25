import { actorOf, elapsedText, noteOf, startPolling } from "/assets/live.js";
import { escapeHtml } from "/assets/catalog.js";
import { t } from "/assets/i18n.js";

const list = document.querySelector("#livefeed-list");
let events = [];

function stageLabel(stage) {
  const key = `stage.${stage}`;
  const label = t(key);
  return label === key ? stage : label;
}

function render() {
  if (!list) return;
  if (events.length === 0) {
    list.innerHTML = `<li class="livefeed-empty">${escapeHtml(t("history.liveEmpty"))}</li>`;
    return;
  }
  const locale = document.documentElement.lang === "en" ? "en" : "ko";
  list.innerHTML = events.map((event) => {
    const actor = actorOf(event);
    const note = noteOf(event, locale);
    return `
      <li class="livefeed-row" data-status="${escapeHtml(event.status)}">
        <span class="livefeed-when">${escapeHtml(elapsedText(event.at, locale))}</span>
        <span class="livefeed-actor">${escapeHtml(actor ? actor.name : String(event.actor ?? ""))}</span>
        <span class="livefeed-stage">${escapeHtml(stageLabel(event.stage))}</span>
        <span class="livefeed-status">${escapeHtml(t(`status.${event.status}`))}</span>
        <span class="livefeed-note">${escapeHtml(note)}${event.sequence == null ? "" : ` <em>No. ${String(event.sequence).padStart(3, "0")}</em>`}</span>
      </li>`;
  }).join("");
}

window.addEventListener("sputnik:locale-change", render);
startPolling((rows) => { events = rows; render(); });
