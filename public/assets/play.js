import { findGame, getRequestedSlug, isPlayableArtifact, loadCatalog } from "/assets/catalog.js";
import { getLocale, initializeI18n, localizeGame, t } from "/assets/i18n.js";

initializeI18n();

const PROTOCOL = "arcade.runner.v1";
// Every published runtime renders a 400×711 logical scene.
const DESIGN_ASPECT = 400 / 711;
const frame = document.querySelector("#game-frame");
const frameWrap = document.querySelector("#frame-wrap");

// Keep the game frame at its portrait design aspect: games letterbox
// internally, but the frame itself must never hand them a stretched box.
function sizeFrame() {
  const stage = frameWrap?.parentElement;
  if (!stage || !frameWrap) return;
  const styles = getComputedStyle(stage);
  const availW = stage.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
  const availH = stage.clientHeight - parseFloat(styles.paddingTop) - parseFloat(styles.paddingBottom);
  if (availW <= 0 || availH <= 0) return;
  const height = Math.min(availH, 920, availW / DESIGN_ASPECT);
  const width = Math.min(availW, height * DESIGN_ASPECT);
  frameWrap.style.width = `${Math.round(width)}px`;
  frameWrap.style.height = `${Math.round(height)}px`;
}
window.addEventListener("resize", sizeFrame);
sizeFrame();
const notice = document.querySelector("#player-notice");
const noticeTitle = document.querySelector("#notice-title");
const noticeCopy = document.querySelector("#notice-copy");
const scoreValue = document.querySelector("#score-value");

let port = null;
let connected = false;
let sourceGame = null;
let noticeKeys = { title: "player.noticeTitle", copy: "player.noticeCopy" };
let scoreResult = null;
let lastResult = null;
let runEnded = false;

function setRunState(state, eventSequence = null) {
  document.body.dataset.runState = state;
  if (Number.isSafeInteger(eventSequence) && eventSequence > 0) {
    document.body.dataset.runSequence = String(eventSequence);
  } else if (state !== "ended") {
    delete document.body.dataset.runSequence;
  }
}

setRunState("connecting");

function showNotice(title, copy, keys = null) {
  noticeTitle.textContent = title;
  noticeCopy.textContent = copy;
  noticeKeys = keys;
  notice.hidden = false;
}

function showTranslatedNotice(titleKey, copyKey) {
  showNotice(t(titleKey), t(copyKey), { title: titleKey, copy: copyKey });
}

function localizedValue(value) {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  return value[getLocale()] ?? value.ko ?? value.en ?? "";
}

function resultValue(result, field) {
  if (!result || typeof result !== "object" || Array.isArray(result)) return undefined;
  return result[field];
}

function formatMetric(metric, result) {
  if (!metric || typeof metric.field !== "string") return "";
  const value = Number(resultValue(result, metric.field));
  if (!Number.isFinite(value)) return "";
  const fractionDigits = Number.isInteger(metric.fractionDigits)
    ? Math.max(0, Math.min(3, metric.fractionDigits))
    : 0;
  const number = new Intl.NumberFormat(getLocale() === "en" ? "en-US" : "ko-KR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
    useGrouping: metric.useGrouping === true
  }).format(value);
  return `${localizedValue(metric.prefix)}${number}${localizedValue(metric.suffix)}`;
}

function formatResult(result) {
  const display = sourceGame?.resultDisplay;
  if (!display) return "";
  return [formatMetric(display.primary, result), formatMetric(display.secondary, result)]
    .filter(Boolean)
    .join(typeof display.separator === "string" ? display.separator : " · ");
}

function renderScore() {
  const result = lastResult ?? scoreResult;
  if (!result) return;
  const formatted = formatResult(result);
  scoreValue.textContent = formatted || "--";
}

function renderGameChrome() {
  if (sourceGame) {
    const game = localizeGame(sourceGame);
    document.title = `${game.title} · Sputnik Workshop`;
    document.querySelector("#game-title").textContent = game.title;
    document.querySelector("#game-subtitle").textContent = `${game.alternateTitle} · LAIKA`;
  }
  if (noticeKeys && !notice.hidden) {
    noticeTitle.textContent = t(noticeKeys.title);
    noticeCopy.textContent = t(noticeKeys.copy);
  }
  renderScore();
}

function send(type, payload = {}) {
  if (!port) return;
  port.postMessage({ protocol: PROTOCOL, type, payload });
}

function handleRunnerMessage(event) {
  const message = event.data;
  if (!message || message.protocol !== PROTOCOL || typeof message.type !== "string") return;

  switch (message.type) {
    case "runner:loading":
      setRunState("loading");
      break;
    case "runner:ready":
    case "game:ready":
      setRunState("ready");
      notice.hidden = true;
      // 키 이벤트가 부모 문서가 아닌 게임 iframe으로 들어가야 한다.
      frame.focus({ preventScroll: true });
      break;
    case "game:score":
      scoreResult = message.payload?.result ?? null;
      renderScore();
      break;
    case "game:state":
      runEnded = false;
      lastResult = null;
      scoreResult = null;
      scoreValue.textContent = "--";
      setRunState("playing");
      break;
    case "game:over":
      lastResult = message.payload?.result ?? null;
      scoreResult = lastResult;
      runEnded = true;
      setRunState("ended", message.payload?.eventSequence);
      renderScore();
      break;
    case "game:exit":
      window.location.assign(document.querySelector("#detail-link").href);
      break;
    case "runner:error":
      runEnded = false;
      setRunState("error");
      showTranslatedNotice("player.loadError", "player.releaseError");
      break;
  }
}

function connectRunner(game) {
  const runnerVersion = game.artifact.runnerVersion;
  if (typeof runnerVersion !== "string" || !/^v[1-9][0-9]*$/.test(runnerVersion)) {
    throw new Error(t("player.releaseError"));
  }

  const nonceBytes = new Uint8Array(16);
  crypto.getRandomValues(nonceBytes);
  const nonce = Array.from(nonceBytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  frame.src = `/runner/${runnerVersion}/index.html#${nonce}`;

  frame.addEventListener("load", () => {
    if (connected) return;
    connected = true;

    const channel = new MessageChannel();
    port = channel.port1;
    port.onmessage = handleRunnerMessage;
    port.start();

    frame.contentWindow.postMessage(
      { protocol: PROTOCOL, type: "arcade:connect", nonce },
      "*",
      [channel.port2]
    );

    send("host:init", {
      slug: game.slug,
      locale: getLocale(),
      version: game.artifact.version,
      bridgeMode: game.artifact.bridgeMode ?? "contract-v1",
      entryUrl: game.artifact.entryUrl,
      styleUrls: game.artifact.styleUrls,
      assetBaseUrl: game.artifact.assetBaseUrl
    });
  }, { once: true });
}

window.addEventListener("sputnik:locale-change", () => {
  renderGameChrome();
  send("host:locale", { locale: getLocale() });
});

window.addEventListener("pagehide", () => {
  send("host:dispose");
  port?.close();
}, { once: true });

try {
  const slug = getRequestedSlug();
  if (!slug) throw new Error(t("player.notFound"));
  const catalog = await loadCatalog();
  sourceGame = findGame(catalog, slug);
  if (!sourceGame) throw new Error(t("detail.notFound"));

  const game = localizeGame(sourceGame);
  document.querySelector("#detail-link").href = `/games/${encodeURIComponent(game.slug)}`;
  renderGameChrome();

  if (!isPlayableArtifact(game)) {
    setRunState("draft");
    showTranslatedNotice("player.draftTitle", "player.draftCopy");
  } else {
    connectRunner(game);
  }
} catch (error) {
  setRunState("not-found");
  showNotice(t("player.notFound"), error instanceof Error ? error.message : t("player.notFound"));
}
