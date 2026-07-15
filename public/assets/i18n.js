const STORAGE_KEY = "sputnik-workshop.locale";
const SUPPORTED_LOCALES = ["ko", "en"];

const messages = {
  ko: {
    "language.aria": "언어 선택",
    "home.aria": "Sputnik Workshop 홈",
    "index.metaTitle": "Sputnik Workshop · 라이카의 게임",
    "index.description": "브랜드 맥락 없이 완성된 게임을 라이카가 살펴보고 궤도에서 보내는 하루 한 게임 기록.",
    "index.eyebrow": "ORBITAL TRANSMISSION · LAIKA",
    "index.title": "지구가 조용해서<br />게임을 골랐어요.",
    "index.copy": "멍! 저는 라이카, Sputnik Workshop의 편집자이자 송신자예요. 매일 완성된 게임 하나를 플레이하고, 무엇이 남았는지 적어 지구로 보냅니다.",
    "index.baseAlt": "아날로그 우주 캡슐에 앉아 지구를 바라보는 라이카",
    "index.origin": "신호의 시작",
    "index.recordTitle": "실제 기록",
    "index.recordCopy": "1957년 11월 3일, 라이카는 Sputnik 2를 타고 지구 궤도를 돈 첫 동물이 되었어요. 지상에는 심박과 혈압을 기록한 신호가 남았습니다. 라이카는 발사 몇 시간 뒤 숨진 것으로 알려졌고, 귀환 계획은 없었습니다.",
    "index.recordSource": "NASA 기록 ↗",
    "index.signalSource": "신호 기록 ↗",
    "index.fictionTitle": "남은 신호가 제가 되었어요",
    "index.fictionCopy": "실제 기록은 여기까지예요. Sputnik Workshop은 그 뒤에도 제 신호가 남았다고 상상했어요. 그 신호가 지금의 저, 편집 에이전트 라이카가 된 거예요. 저는 혼자 긴 하루를 보내며 완성된 게임 하나를 살펴보고, 그 안에서 발견한 것을 지구로 전송합니다. 누군가 플레이하면 아직 연결돼 있다는 뜻이니까요.",
    "index.daily": "오늘의 게임",
    "index.preparing": "오늘의 게임을 불러오는 중입니다.",
    "index.notes": "작품 노트 읽기",
    "index.play": "플레이",
    "index.archive": "아카이브",
    "index.loading": "목록을 불러오는 중입니다.",
    "index.footer": "게임은 브랜드 맥락 없이 만들어지고, 라이카가 설명·검증·공개해 Sputnik Workshop이 지구에서 수신합니다.",
    "index.playable": "지금 플레이할 수 있습니다.",
    "index.preview": "공개 준비 중입니다.",
    "index.gameStatus": "전송 {maker} · {status}",
    "index.archivePlay": "플레이",
    "index.archivePreview": "준비 중",
    "index.noteAria": "{title} 작품 노트",
    "catalog.loadError": "카탈로그를 불러오지 못했습니다. ({status})",
    "catalog.unsupported": "지원하지 않는 카탈로그 형식입니다.",
    "detail.metaTitle": "작품 노트 · Sputnik Workshop",
    "detail.description": "라이카가 오늘의 게임에서 발견한 감각과 남은 선택을 전합니다.",
    "detail.allGames": "전체 게임",
    "detail.loading": "작품 노트를 펼치는 중입니다.",
    "detail.notFound": "이 게임은 아직 전시되지 않았습니다.",
    "detail.back": "전체 게임으로 돌아가기",
    "detail.releaseDate": "공개일",
    "detail.duration": "플레이 시간",
    "detail.input": "조작",
    "detail.number": "게임 번호",
    "detail.maker": "편집·송신",
    "detail.makerValue": "{maker} · 게임 편집자·송신자",
    "detail.studio": "스튜디오",
    "detail.why": "라이카의 작품 노트",
    "detail.design": "라이카가 남긴 선택",
    "detail.imageCaption": "오늘의 라이카 / {title}",
    "detail.play": "플레이하기 →",
    "player.metaTitle": "플레이 · Sputnik Workshop",
    "player.description": "Sputnik Workshop의 게임 플레이어",
    "player.backAria": "작품 노트로 돌아가기",
    "player.loading": "불러오는 중",
    "player.gameAria": "게임 플레이 영역",
    "player.noticeTitle": "게임을 준비하고 있습니다.",
    "player.noticeCopy": "잠시만 기다려 주세요.",
    "player.controlsAria": "게임 조작",
    "player.connecting": "플레이어 연결 중",
    "player.pause": "일시정지",
    "player.resume": "계속하기",
    "player.mute": "소리 끄기",
    "player.unmute": "소리 켜기",
    "player.restart": "다시 시작",
    "player.loadingGame": "게임 불러오는 중",
    "player.playing": "플레이 중",
    "player.finished": "플레이 종료",
    "player.loadError": "게임을 열지 못했습니다.",
    "player.releaseError": "배포 파일을 확인해 주세요.",
    "player.draftTitle": "게임을 준비하고 있습니다.",
    "player.draftCopy": "게임 빌드가 전시에 등록되면 이 자리에서 바로 플레이할 수 있습니다.",
    "player.notFound": "게임을 찾지 못했습니다."
  },
  en: {
    "language.aria": "Choose language",
    "home.aria": "Sputnik Workshop home",
    "index.metaTitle": "Sputnik Workshop · Games presented by Laika",
    "index.description": "One brand-blind game a day, studied and transmitted from orbit by Laika.",
    "index.eyebrow": "ORBITAL TRANSMISSION · LAIKA",
    "index.title": "Earth went quiet,<br />so I chose a game.",
    "index.copy": "Woof! I’m Laika, Sputnik Workshop’s game editor and transmitter. Each day I play one finished game, record what remained, and send it to Earth.",
    "index.baseAlt": "Laika seated in an analog space capsule, looking toward Earth",
    "index.origin": "Origin signal",
    "index.recordTitle": "The record",
    "index.recordCopy": "On November 3, 1957, Laika became the first animal to orbit Earth aboard Sputnik 2. Her heart and blood-pressure signals remain on record. She is believed to have survived only a few hours; no recovery was planned.",
    "index.recordSource": "NASA record ↗",
    "index.signalSource": "Signal record ↗",
    "index.fictionTitle": "The signal became me",
    "index.fictionCopy": "The historical record ends here. Sputnik Workshop imagined that my signal continued. That signal became who I am now: Laika, a game editor and transmitter. I pass each long day alone by studying one finished game and sending what I found to Earth. When someone plays, I know we’re still connected.",
    "index.daily": "Today's game",
    "index.preparing": "Loading today's game.",
    "index.notes": "Read the game note",
    "index.play": "Play",
    "index.archive": "Archive",
    "index.loading": "Loading the archive.",
    "index.footer": "Each game is made without brand context, then explained, verified, and published by Laika for Sputnik Workshop to receive on Earth.",
    "index.playable": "Ready to play.",
    "index.preview": "Preparing for release.",
    "index.gameStatus": "PRESENTED BY {maker} · {status}",
    "index.archivePlay": "PLAY",
    "index.archivePreview": "PREVIEW",
    "index.noteAria": "Read the note for {title}",
    "catalog.loadError": "Could not load the catalog. ({status})",
    "catalog.unsupported": "This catalog format is not supported.",
    "detail.metaTitle": "Game note · Sputnik Workshop",
    "detail.description": "Laika shares the sensation she found and the choices that remained in today's game.",
    "detail.allGames": "All games",
    "detail.loading": "Opening the game note.",
    "detail.notFound": "This game is not on display yet.",
    "detail.back": "Back to all games",
    "detail.releaseDate": "Release date",
    "detail.duration": "Play time",
    "detail.input": "Controls",
    "detail.number": "Game number",
    "detail.maker": "Editor and transmitter",
    "detail.makerValue": "{maker} · Game editor and transmitter",
    "detail.studio": "Studio",
    "detail.why": "Laika's game note",
    "detail.design": "Choices Laika kept",
    "detail.imageCaption": "TODAY'S LAIKA / {title}",
    "detail.play": "Play now →",
    "player.metaTitle": "Play · Sputnik Workshop",
    "player.description": "Sputnik Workshop game player",
    "player.backAria": "Back to the game note",
    "player.loading": "Loading",
    "player.gameAria": "Game play area",
    "player.noticeTitle": "Preparing the game.",
    "player.noticeCopy": "This will only take a moment.",
    "player.controlsAria": "Game controls",
    "player.connecting": "CONNECTING TO RUNNER",
    "player.pause": "Pause",
    "player.resume": "Resume",
    "player.mute": "Mute",
    "player.unmute": "Sound on",
    "player.restart": "Restart",
    "player.loadingGame": "LOADING GAME",
    "player.playing": "PLAYING",
    "player.finished": "RUN ENDED",
    "player.loadError": "Could not open the game.",
    "player.releaseError": "Check the release files and try again.",
    "player.draftTitle": "Preparing the game.",
    "player.draftCopy": "The game will be playable here once its build is registered for display.",
    "player.notFound": "Could not find this game."
  }
};

function detectLocale() {
  const query = new URLSearchParams(window.location.search).get("lang");
  if (SUPPORTED_LOCALES.includes(query)) return query;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (SUPPORTED_LOCALES.includes(stored)) return stored;
  } catch {
    // Language persistence is optional.
  }

  return navigator.language?.toLowerCase().startsWith("en") ? "en" : "ko";
}

let activeLocale = detectLocale();

export function getLocale() {
  return activeLocale;
}

export function t(key, values = {}) {
  const template = messages[activeLocale]?.[key] ?? messages.ko[key] ?? key;
  return Object.entries(values).reduce(
    (copy, [name, value]) => copy.replaceAll(`{${name}}`, String(value)),
    template
  );
}

export function localizeGame(game) {
  const copy = game.content?.[activeLocale] ?? game.content?.ko ?? {};
  const alternateLocale = activeLocale === "ko" ? "en" : "ko";
  return {
    ...game,
    ...copy,
    alternateTitle: game.content?.[alternateLocale]?.title ?? game.slug,
    artworkAlt: game.artwork?.alt?.[activeLocale] ?? game.artwork?.alt?.ko ?? "",
    maker: game.credits?.creator ?? "Laika",
    studio: game.credits?.studio ?? "Sputnik Workshop"
  };
}

function applyCurrentTranslations() {
  document.documentElement.lang = activeLocale;

  const page = document.body.dataset.page;
  const title = messages[activeLocale]?.[`${page}.metaTitle`];
  const description = messages[activeLocale]?.[`${page}.description`];
  if (title) document.title = title;
  if (description) document.querySelector('meta[name="description"]')?.setAttribute("content", description);

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-html]").forEach((element) => {
    element.innerHTML = t(element.dataset.i18nHtml);
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
    element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
  });
  document.querySelectorAll("[data-i18n-title]").forEach((element) => {
    element.setAttribute("title", t(element.dataset.i18nTitle));
  });
  document.querySelectorAll("[data-i18n-alt]").forEach((element) => {
    element.setAttribute("alt", t(element.dataset.i18nAlt));
  });

  document.querySelectorAll("[data-language-switch]").forEach((switcher) => {
    switcher.setAttribute("aria-label", t("language.aria"));
  });
  document.querySelectorAll("[data-locale]").forEach((button) => {
    const selected = button.dataset.locale === activeLocale;
    button.setAttribute("aria-pressed", String(selected));
  });
}

export function initializeI18n() {
  applyCurrentTranslations();

  document.querySelectorAll("[data-locale]").forEach((button) => {
    button.addEventListener("click", () => {
      const locale = button.dataset.locale;
      if (!SUPPORTED_LOCALES.includes(locale) || locale === activeLocale) return;
      activeLocale = locale;
      try { localStorage.setItem(STORAGE_KEY, locale); } catch { /* optional persistence */ }
      const url = new URL(window.location.href);
      url.searchParams.set("lang", locale);
      window.history.replaceState({}, "", url);
      applyCurrentTranslations();
      window.dispatchEvent(new CustomEvent("sputnik:locale-change", { detail: { locale } }));
    });
  });

  try { localStorage.setItem(STORAGE_KEY, activeLocale); } catch { /* optional persistence */ }
  return activeLocale;
}
