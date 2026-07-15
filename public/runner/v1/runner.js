const PROTOCOL = "arcade.runner.v1";
const GAME_PREFIX = "/__game-assets/games/stitch/";
const ALLOWED_GAME_EVENTS = new Set(["ready", "run-start", "run-end", "exit"]);
const ALLOWED_HOST_COMMANDS = new Set([
  "host:pause",
  "host:resume",
  "host:mute",
  "host:locale",
  "host:restart",
  "host:dispose"
]);

const root = document.querySelector("#game-root");
const status = document.querySelector("#runner-status");
const statusCopy = document.querySelector("#runner-status-copy");
const expectedNonce = window.location.hash.slice(1);

let port = null;
let mountedGame = null;
let locale = navigator.language?.toLowerCase().startsWith("en") ? "en" : "ko";

const COPY = {
  ko: {
    unknown: "알 수 없는 오류가 발생했습니다.",
    failed: "게임을 열지 못했습니다.",
    loading: "게임을 불러오는 중",
    checking: "게임 정보를 확인하는 중",
    connection: "유효한 호스트 연결이 필요합니다."
  },
  en: {
    unknown: "An unknown error occurred.",
    failed: "Could not open the game.",
    loading: "Loading the game",
    checking: "Checking game information",
    connection: "A valid host connection is required."
  }
};

function copy(key) {
  return COPY[locale]?.[key] ?? COPY.ko[key];
}

function reply(type, payload = {}) {
  port?.postMessage({ protocol: PROTOCOL, type, payload });
}

function showStatus(copy) {
  statusCopy.textContent = copy;
  status.hidden = false;
}

function fail(error) {
  const message = error instanceof Error ? error.message : copy("unknown");
  showStatus(copy("failed"));
  reply("runner:error", { message });
}

function validateGameUrl(value, label) {
  if (typeof value !== "string" || !value.startsWith(GAME_PREFIX)) {
    throw new Error(`${label} 경로가 허용된 게임 영역 밖에 있습니다.`);
  }

  const base = new URL(window.location.href);
  const url = new URL(value, base);
  if (url.origin !== base.origin || !url.pathname.startsWith(GAME_PREFIX) || url.pathname.includes("..")) {
    throw new Error(`${label} 경로를 검증하지 못했습니다.`);
  }

  return url.href;
}

function relayGameEvent(event) {
  if (
    !event ||
    event.contractVersion !== 1 ||
    event.gameId !== "stitch" ||
    !ALLOWED_GAME_EVENTS.has(event.type)
  ) {
    throw new Error("게임 이벤트 계약을 검증하지 못했습니다.");
  }

  const payload = event.payload ?? {};
  if (event.type === "ready") reply("game:ready");
  if (event.type === "run-start") reply("game:state", { label: "playing" });
  if (event.type === "run-end") {
    const result = payload.result ?? {};
    reply("game:over", {
      score: Number(result.score) || 0,
      stitches: Number(result.phase) || 0,
      accuracy: Number(result.accuracy) || 0,
      completed: Boolean(result.completed)
    });
  }
  if (event.type === "exit") reply("game:exit");
}

async function disposeGame() {
  if (typeof mountedGame?.destroy === "function") await mountedGame.destroy();
  mountedGame = null;
  root.replaceChildren();
}

async function mount(config) {
  if (config?.slug !== "stitch") throw new Error("이 runner는 STITCH artifact만 허용합니다.");
  if (typeof config.version !== "string" || !config.version.trim()) throw new Error("고정된 artifact 버전이 필요합니다.");

  locale = config.locale === "en" ? "en" : "ko";
  const entryUrl = validateGameUrl(config.entryUrl, "entry");
  const assetBaseUrl = validateGameUrl(config.assetBaseUrl, "asset base");
  const styleUrls = Array.isArray(config.styleUrls)
    ? config.styleUrls.map((url) => validateGameUrl(url, "style"))
    : [];

  showStatus(copy("loading"));
  reply("runner:loading");

  for (const href of styleUrls) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.append(link);
  }

  const gameModule = await import(entryUrl);
  const mountGame = gameModule.mountGame ?? gameModule.default;
  if (typeof mountGame !== "function") {
    throw new Error("artifact가 mountGame 함수를 내보내지 않습니다.");
  }

  mountedGame = await mountGame({
    root,
    assetBaseUrl,
    locale,
    seed: typeof config.seed === "string" ? config.seed : "arcade",
    host: Object.freeze({ emit: relayGameEvent })
  }) ?? {};
  status.hidden = true;
  reply("runner:ready", { version: config.version });
}

async function handlePortMessage(event) {
  const message = event.data;
  if (!message || message.protocol !== PROTOCOL || typeof message.type !== "string") return;

  if (message.type === "host:init") {
    try {
      await mount(message.payload);
    } catch (error) {
      fail(error);
    }
    return;
  }

  if (!ALLOWED_HOST_COMMANDS.has(message.type)) return;
  try {
    if (message.type === "host:pause") mountedGame?.pause?.();
    if (message.type === "host:resume") mountedGame?.resume?.();
    if (message.type === "host:mute") mountedGame?.mute?.(Boolean(message.payload?.muted));
    if (message.type === "host:locale") {
      locale = message.payload?.locale === "en" ? "en" : "ko";
      mountedGame?.setLocale?.(locale);
    }
    if (message.type === "host:restart") mountedGame?.restart?.();
    if (message.type === "host:dispose") {
      await disposeGame();
      port?.close();
    }
  } catch (error) {
    fail(error);
  }
}

function acceptConnection(event) {
  const message = event.data;
  if (
    port ||
    event.source !== window.parent ||
    !message ||
    message.protocol !== PROTOCOL ||
    message.type !== "arcade:connect" ||
    message.nonce !== expectedNonce ||
    !event.ports[0]
  ) return;

  window.removeEventListener("message", acceptConnection);
  port = event.ports[0];
  port.onmessage = handlePortMessage;
  port.start();
  showStatus(copy("checking"));
}

if (!expectedNonce || expectedNonce.length !== 32) {
  showStatus(copy("connection"));
} else {
  window.addEventListener("message", acceptConnection);
}
