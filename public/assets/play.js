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
let lastResult = null;

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
  connectionStatus.textContent = label ?? t(key);
}

function renderScore() {
  if (!lastResult) return;
  scoreValue.textContent = `${lastResult.stitches}${t("player.stitchesShort")} · ${lastResult.accuracy.toFixed(1)}%`;
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
  connectionStatus.textContent = connectionLabel ?? t(connectionKey);
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
      setConnection("player.loadingGame");
      break;
    case "runner:ready":
    case "game:ready":
      notice.hidden = true;
      setConnection("player.playing");
      enableControls();
      break;
    case "game:score":
      scoreValue.textContent = String(Math.max(0, Number(message.payload?.score) || 0));
      break;
    case "game:state":
      setConnection("player.playing");
      break;
    case "game:over":
      lastResult = {
        stitches: Math.max(0, Number(message.payload?.stitches) || 0),
        accuracy: Math.max(0, Number(message.payload?.accuracy) || 0)
      };
      setConnection(message.payload?.completed ? "player.complete" : "player.failed");
      renderScore();
      break;
    case "game:exit":
      window.location.assign(document.querySelector("#detail-link").href);
      break;
    case "runner:error":
      setConnection("player.loadError");
      showTranslatedNotice("player.loadError", "player.releaseError");
      break;
  }
}

function connectRunner(game) {
  const nonceBytes = new Uint8Array(16);
  crypto.getRandomValues(nonceBytes);
  const nonce = Array.from(nonceBytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  frame.src = `/runner/v1/index.html#${nonce}`;

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
      title: game.title,
      locale: getLocale(),
      version: game.artifact.version,
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
  lastResult = null;
  scoreValue.textContent = "--";
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
  const slug = getRequestedSlug() || "stitch";
  const catalog = await loadCatalog();
  sourceGame = findGame(catalog, slug);
  if (!sourceGame) throw new Error(t("detail.notFound"));

  const game = localizeGame(sourceGame);
  document.querySelector("#detail-link").href = `/games/${encodeURIComponent(game.slug)}`;
  renderGameChrome();

  if (!isPlayableArtifact(game)) {
    showTranslatedNotice("player.draftTitle", "player.draftCopy");
    setConnection("player.draftTitle", "DRAFT");
  } else {
    connectRunner(game);
  }
} catch (error) {
  showNotice(t("player.notFound"), error.message);
  setConnection("player.notFound", "NOT FOUND");
}
