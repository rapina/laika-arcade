const PROTOCOL = "arcade.runner.v1";
const MAX_EVENT_BYTES = 16 * 1024;
const GAME_EVENT_TYPES = new Set(["ready", "started", "score", "ended", "error", "exit"]);
const LEGACY_EVENT_TYPES = new Map([
  ["ready", "ready"],
  ["run-start", "started"],
  ["run-end", "ended"],
  ["exit", "exit"]
]);
const BRIDGE_MODES = new Set(["contract-v1", "legacy-run-v1"]);
const ALLOWED_HOST_COMMANDS = new Set([
  "host:pause",
  "host:resume",
  "host:mute",
  "host:locale",
  "host:restart",
  "host:dispose"
]);
const SLUG_PATTERN = /^[a-z][a-z0-9-]{0,63}$/;
const VERSION_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/;

const root = document.querySelector("#game-root");
const status = document.querySelector("#runner-status");
const statusCopy = document.querySelector("#runner-status-copy");
const expectedNonce = window.location.hash.slice(1);

let port = null;
let mountedGame = null;
let mountedConfig = null;
let mounting = false;
let lastGameSequence = 0;
let legacySequence = 0;
let gameEventFailed = false;
let locale = navigator.language?.toLowerCase().startsWith("en") ? "en" : "ko";
const mountedStyles = [];

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

function showStatus(value) {
  statusCopy.textContent = value;
  status.hidden = false;
}

function fail(error) {
  const message = error instanceof Error ? error.message : copy("unknown");
  showStatus(copy("failed"));
  reply("runner:error", { message: String(message).slice(0, 300) });
}

function releasePrefix(slug, version) {
  if (typeof slug !== "string" || !SLUG_PATTERN.test(slug)) {
    throw new Error("게임 slug 형식이 올바르지 않습니다.");
  }
  if (typeof version !== "string" || !VERSION_PATTERN.test(version)) {
    throw new Error("고정된 artifact 버전 형식이 올바르지 않습니다.");
  }
  return `/__game-assets/games/${slug}/${version}/`;
}

function validateGameUrl(value, label, prefix, exact = false) {
  if (
    typeof value !== "string" ||
    !value.startsWith(prefix) ||
    value.includes("%") ||
    value.includes("\\") ||
    value.slice(1).includes("//") ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new Error(`${label} 경로가 허용된 게임 릴리스 밖에 있습니다.`);
  }

  const base = new URL(window.location.href);
  const url = new URL(value, base);
  const releasePath = value.slice(prefix.length);
  const hasCanonicalSegments = exact
    ? releasePath === ""
    : releasePath.length > 0 && releasePath.split("/").every((segment) => segment && segment !== "." && segment !== "..");
  if (
    url.origin !== base.origin ||
    url.pathname !== value ||
    !hasCanonicalSegments ||
    url.search ||
    url.hash
  ) {
    throw new Error(`${label} 경로를 검증하지 못했습니다.`);
  }

  return url.href;
}

function serializedBytes(value) {
  let serialized;
  try {
    serialized = JSON.stringify(value);
  } catch {
    throw new Error("게임 이벤트 payload를 직렬화하지 못했습니다.");
  }
  if (serialized === undefined) throw new Error("게임 이벤트 payload가 올바르지 않습니다.");
  return new TextEncoder().encode(serialized).byteLength;
}

function normalizeGameEvent(event) {
  if (!event || typeof event !== "object" || Array.isArray(event)) {
    throw new Error("게임 이벤트 계약을 검증하지 못했습니다.");
  }
  if (event.contractVersion !== 1 || event.gameId !== mountedConfig?.slug) {
    throw new Error("게임 이벤트 identity가 현재 릴리스와 다릅니다.");
  }

  const bridgeMode = mountedConfig.bridgeMode;
  const type = bridgeMode === "legacy-run-v1" ? LEGACY_EVENT_TYPES.get(event.type) : event.type;
  const sequence = bridgeMode === "legacy-run-v1" ? ++legacySequence : event.sequence;
  if (!GAME_EVENT_TYPES.has(type)) throw new Error("허용되지 않은 게임 이벤트 타입입니다.");
  if (!Number.isSafeInteger(sequence) || sequence <= lastGameSequence) {
    throw new Error("게임 이벤트 sequence가 증가하지 않았습니다.");
  }

  const payload = event.payload ?? {};
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("게임 이벤트 payload는 객체여야 합니다.");
  }
  if (serializedBytes(payload) > MAX_EVENT_BYTES) {
    throw new Error("게임 이벤트 payload가 허용 크기를 넘었습니다.");
  }

  lastGameSequence = sequence;
  return { type, payload };
}

function resultFrom(payload) {
  return Object.hasOwn(payload, "result") ? payload.result : payload;
}

function relayGameEvent(rawEvent) {
  const event = normalizeGameEvent(rawEvent);
  if (event.type === "ready") reply("game:ready");
  if (event.type === "started") reply("game:state", { state: "playing" });
  if (event.type === "score") {
    reply("game:score", { result: resultFrom(event.payload), eventSequence: lastGameSequence });
  }
  if (event.type === "ended") {
    reply("game:over", { result: resultFrom(event.payload), eventSequence: lastGameSequence });
  }
  if (event.type === "error") {
    gameEventFailed = true;
    const message = typeof event.payload.message === "string" ? event.payload.message : copy("unknown");
    fail(new Error(message));
  }
  if (event.type === "exit") reply("game:exit");
}

function receiveGameEvent(rawEvent) {
  if (gameEventFailed) return;
  try {
    relayGameEvent(rawEvent);
  } catch (error) {
    gameEventFailed = true;
    fail(error);
  }
}

async function disposeGame() {
  const game = mountedGame;
  mountedGame = null;
  try {
    if (typeof game?.destroy === "function") await game.destroy();
  } finally {
    mountedConfig = null;
    lastGameSequence = 0;
    legacySequence = 0;
    gameEventFailed = false;
    root.replaceChildren();
    for (const style of mountedStyles.splice(0)) style.remove();
  }
}

async function mount(config) {
  if (mounting || mountedConfig) throw new Error("게임은 한 번만 초기화할 수 있습니다.");
  mounting = true;

  try {
    const prefix = releasePrefix(config?.slug, config?.version);
    const bridgeMode = config?.bridgeMode ?? "contract-v1";
    if (!BRIDGE_MODES.has(bridgeMode)) throw new Error("지원하지 않는 게임 브리지 형식입니다.");

    locale = config.locale === "en" ? "en" : "ko";
    const entryUrl = validateGameUrl(config.entryUrl, "entry", prefix);
    const assetBaseUrl = validateGameUrl(config.assetBaseUrl, "asset base", prefix, true);
    const styleUrls = Array.isArray(config.styleUrls)
      ? config.styleUrls.map((url) => validateGameUrl(url, "style", prefix))
      : [];

    mountedConfig = Object.freeze({ slug: config.slug, version: config.version, bridgeMode });
    showStatus(copy("loading"));
    reply("runner:loading");

    for (const href of styleUrls) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      document.head.append(link);
      mountedStyles.push(link);
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
      host: Object.freeze({ emit: receiveGameEvent })
    }) ?? {};
    if (gameEventFailed) throw new Error("게임 이벤트 계약을 초기화하지 못했습니다.");
    status.hidden = true;
    reply("runner:ready", { version: config.version });
  } catch (error) {
    let failure = error;
    try {
      await disposeGame();
    } catch (disposeError) {
      const message = disposeError instanceof Error ? disposeError.message : String(disposeError);
      failure = new Error(`${error instanceof Error ? error.message : String(error)} (${message})`);
    }
    throw failure;
  } finally {
    mounting = false;
  }
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
