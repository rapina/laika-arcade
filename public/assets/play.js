import { findGame, getRequestedSlug, isPlayableArtifact, loadCatalog } from "/assets/catalog.js";
import { getLocale, initializeI18n, localizeGame, t } from "/assets/i18n.js";

initializeI18n();

const PROTOCOL = "arcade.runner.v1";
const frame = document.querySelector("#game-frame");
const notice = document.querySelector("#player-notice");
const noticeTitle = document.querySelector("#notice-title");
const noticeCopy = document.querySelector("#notice-copy");
const connectionStatus = document.querySelector("#connection-status");
const scoreValue = document.querySelector("#score-value");
const pauseButton = document.querySelector("#pause-button");
const muteButton = document.querySelector("#mute-button");
const restartButton = document.querySelector("#restart-button");

let port = null;
let paused = false;
let muted = false;
let connected = false;
let sourceGame = null;
let noticeKeys = { title: "player.noticeTitle", copy: "player.noticeCopy" };
let connectionKey = "player.connecting";
let connectionLabel = null;
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

function setConnection(key, label = null) {
  connectionKey = key;
  connectionLabel = label;
  renderConnection();
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

function formatResultStatus(result) {
  const statusDisplay = sourceGame?.resultDisplay?.status;
  if (!statusDisplay || typeof statusDisplay.field !== "string") return t("player.finished");
  const copy = resultValue(result, statusDisplay.field)
    ? localizedValue(statusDisplay.whenTrue)
    : localizedValue(statusDisplay.whenFalse);
  return copy || t("player.finished");
}

function renderScore() {
  const result = lastResult ?? scoreResult;
  if (!result) return;
  const formatted = formatResult(result);
  scoreValue.textContent = formatted || "--";
}

function renderConnection() {
  connectionStatus.textContent = runEnded
    ? formatResultStatus(lastResult)
    : connectionLabel ?? t(connectionKey);
}

function renderControlLabels() {
  pauseButton.textContent = t(paused ? "player.resume" : "player.pause");
  muteButton.textContent = t(muted ? "player.unmute" : "player.mute");
  restartButton.textContent = t("player.restart");
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
  renderConnection();
  renderControlLabels();
  renderScore();
}

function enableControls() {
  pauseButton.disabled = false;
  muteButton.disabled = false;
  restartButton.disabled = false;
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
      setConnection("player.loadingGame");
      break;
    case "runner:ready":
    case "game:ready":
      setRunState("ready");
      notice.hidden = true;
      setConnection("player.playing");
      enableControls();
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
      setConnection("player.playing");
      break;
    case "game:over":
      lastResult = message.payload?.result ?? null;
      scoreResult = lastResult;
      runEnded = true;
      setRunState("ended", message.payload?.eventSequence);
      renderConnection();
      renderScore();
      break;
    case "game:exit":
      window.location.assign(document.querySelector("#detail-link").href);
      break;
    case "runner:error":
      runEnded = false;
      setRunState("error");
      setConnection("player.loadError");
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

pauseButton.addEventListener("click", () => {
  paused = !paused;
  renderControlLabels();
  send(paused ? "host:pause" : "host:resume");
});

muteButton.addEventListener("click", () => {
  muted = !muted;
  muteButton.setAttribute("aria-pressed", String(muted));
  renderControlLabels();
  send("host:mute", { muted });
});

restartButton.addEventListener("click", () => {
  paused = false;
  runEnded = false;
  lastResult = null;
  scoreResult = null;
  scoreValue.textContent = "--";
  setRunState("restarting");
  setConnection("player.playing");
  renderControlLabels();
  send("host:restart");
});

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
    setConnection("player.draftTitle", "DRAFT");
  } else {
    connectRunner(game);
  }
} catch (error) {
  setRunState("not-found");
  showNotice(t("player.notFound"), error instanceof Error ? error.message : t("player.notFound"));
  setConnection("player.notFound", "NOT FOUND");
}
