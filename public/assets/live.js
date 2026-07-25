/**
 * 지금 무슨 일이 벌어지고 있는가.
 *
 * 사이클이 도는 동안 감독자와 관제가 남긴 사건을 읽어, 마지막 상태를 한 줄로
 * 보여 준다. 목록보다 "지금 누가 무엇을 하는 중인가"가 이 화면의 값어치다.
 *
 * 실시간 구독 대신 주기적으로 다시 읽는다. 사건은 몇 분에 하나씩 생기므로 20초
 * 간격이면 체감 차이가 없고, supabase-js를 번들에 넣지 않아도 되며 CSP도
 * WebSocket까지 열지 않아도 된다.
 */
const SUPABASE_URL = "https://mbxkrnydkgjxhoqtuvsv.supabase.co";
const SUPABASE_KEY = "sb_publishable_O351ldwoQWdLBxqRsBCEMA_TLvVYQ44";
const POLL_MS = 20000;
const FEED_LIMIT = 40;

const ACTORS = {
  enos: { name: "ENOS", art: "/art/enos-base-640.jpg", focus: "26% 26%" },
  laika: { name: "LAIKA", art: "/art/laika-base-480.jpg", focus: "50% 35%" },
  cherpa: { name: "CHERPA", art: "/art/cherpa-base-640.jpg", focus: "42% 45%" },
  murr: { name: "MURR", art: "/art/murr-base-640.jpg", focus: "42% 42%" },
};

export async function fetchEvents(limit = FEED_LIMIT) {
  const url = `${SUPABASE_URL}/rest/v1/cycle_events`
    + `?select=at,actor,stage,status,sequence,slug,note_ko,note_en`
    + `&order=at.desc&limit=${limit}`;
  const response = await fetch(url, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(String(response.status));
  return response.json();
}

/** 사이클은 cycle/started 로 열리고 cycle/done 으로 닫힌다. */
export function currentState(events) {
  const opener = events.find((event) => event.stage === "cycle");
  const running = opener?.status === "started";
  const latest = events.find((event) => event.stage !== "cycle") ?? opener ?? null;
  const lastPublished = events.find((event) => event.stage === "publish" && event.status === "done");
  return { running, latest, opener, lastPublished };
}

export function actorOf(event) {
  return ACTORS[event?.actor] ?? null;
}

export function noteOf(event, locale) {
  if (!event) return "";
  return (locale === "en" ? event.note_en : event.note_ko) ?? event.note_en ?? event.note_ko ?? "";
}

export function elapsedText(iso, locale) {
  const then = new Date(iso.includes("Z") || iso.includes("+") ? iso : `${iso}Z`);
  const minutes = Math.max(0, Math.round((Date.now() - then.getTime()) / 60000));
  if (locale === "en") {
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.round(minutes / 60);
    return hours < 24 ? `${hours} h ago` : `${Math.round(hours / 24)} d ago`;
  }
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours}시간 전` : `${Math.round(hours / 24)}일 전`;
}

export function startPolling(render) {
  let stopped = false;
  const tick = async () => {
    if (stopped) return;
    try {
      render(await fetchEvents());
    } catch {
      // 피드가 끊겨도 페이지의 나머지는 그대로 둔다.
    }
    if (!stopped) setTimeout(tick, POLL_MS);
  };
  tick();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && !stopped) tick();
  });
  return () => { stopped = true; };
}
