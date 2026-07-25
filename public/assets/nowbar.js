import { actorOf, currentState, elapsedText, noteOf, startPolling } from "/assets/live.js";
import { escapeHtml } from "/assets/catalog.js";
import { t } from "/assets/i18n.js";

const bar = document.querySelector("#nowbar");
let events = [];
let lastSeenAt = null;

function stageLabel(stage) {
  const key = `stage.${stage}`;
  const label = t(key);
  return label === key ? stage : label;
}

function render() {
  if (!bar || events.length === 0) return;
  const locale = document.documentElement.lang === "en" ? "en" : "ko";
  const { running, latest, lastPublished } = currentState(events);

  if (!running) {
    const when = lastPublished ? elapsedText(lastPublished.at, locale) : "";
    bar.hidden = false;
    bar.dataset.state = "idle";
    bar.innerHTML = `
      <p class="nowbar-state">${escapeHtml(t("now.idle"))}</p>
      ${lastPublished ? `<p class="nowbar-detail">${escapeHtml(t("now.lastSent", {
        game: lastPublished.slug ? lastPublished.slug.toUpperCase() : String(lastPublished.sequence ?? ""),
        when,
      }))}</p>` : ""}`;
    return;
  }

  const actor = actorOf(latest);
  const note = noteOf(latest, locale);
  // 긴 단계는 몇 시간 조용하다. 사이클이 열린 채 소식이 끊기면 "작업 중"이라고
  // 우기지 않고 마지막 소식이 언제였는지로 말한다. 닫히지 않고 죽은 사이클이
  // 영원히 진행 중으로 보이는 것도 이걸로 막는다.
  const quietMinutes = latest
    ? (Date.now() - new Date(latest.at.includes("Z") || latest.at.includes("+") ? latest.at : `${latest.at}Z`).getTime()) / 60000
    : 0;
  const stale = quietMinutes > 180;
  bar.hidden = false;
  bar.dataset.state = stale ? "quiet" : latest?.status === "blocked" ? "blocked" : "running";
  bar.innerHTML = `
    <span class="nowbar-pulse" aria-hidden="true"><i></i><i></i><i></i></span>
    ${actor ? `<img class="nowbar-face" src="${actor.art}" alt="" width="72" height="72" data-focus="${actor.focus}" />` : ""}
    <div class="nowbar-copy">
      <p class="nowbar-state">${escapeHtml(t(
        stale ? "now.quiet" : latest?.status === "started" ? "now.working" : "now.between",
        {
          actor: actor ? actor.name : String(latest.actor ?? ""),
          stage: stageLabel(latest.stage),
          sequence: latest.sequence == null ? "" : `No. ${String(latest.sequence).padStart(3, "0")}`,
        },
      ))}</p>
      ${note ? `<p class="nowbar-detail">${escapeHtml(note)}</p>` : ""}
    </div>
    <p class="nowbar-since">${escapeHtml(elapsedText(latest.at, locale))}</p>`;

  for (const image of bar.querySelectorAll(".nowbar-face")) {
    image.style.objectPosition = image.dataset.focus;
  }

  // 새 사건이 들어온 순간을 한 번 알린다. 계속 깜박이면 소음이 된다.
  if (latest && lastSeenAt !== null && latest.at !== lastSeenAt) {
    bar.classList.remove("is-fresh");
    void bar.offsetWidth;
    bar.classList.add("is-fresh");
    setTimeout(() => bar.classList.remove("is-fresh"), 1600);
  }
  if (latest) lastSeenAt = latest.at;
}

window.addEventListener("sputnik:locale-change", render);
startPolling((rows) => { events = rows; render(); });
