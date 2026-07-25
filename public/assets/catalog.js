import { getLocale, t } from "/assets/i18n.js";

const CATALOG_URL = "/catalog/games.json";

export async function loadCatalog() {
  const response = await fetch(CATALOG_URL, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(t("catalog.loadError", { status: response.status }));
  }

  const catalog = await response.json();
  if (catalog?.schemaVersion !== 2 || !Array.isArray(catalog.games)) {
    throw new Error(t("catalog.unsupported"));
  }

  return catalog;
}

export function getRequestedSlug() {
  const querySlug = new URLSearchParams(window.location.search).get("slug");
  if (querySlug) return querySlug;

  const segments = window.location.pathname.split("/").filter(Boolean);
  if (segments[0] === "games" || segments[0] === "play") return segments[1] ?? "";
  return "";
}

export function findGame(catalog, slug) {
  return catalog.games.find((game) => game.slug === slug);
}

export function isPlayableArtifact(game) {
  if (game?.artifact?.status === "published") return true;
  return game?.artifact?.status === "local"
    && ["127.0.0.1", "localhost"].includes(window.location.hostname);
}

export function formatReleaseDate(value) {
  const date = new Date(`${value}T00:00:00+09:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(getLocale() === "en" ? "en-US" : "ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(date);
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
