const STORAGE_KEY = "sputnik-workshop.locale";
const SUPPORTED_LOCALES = ["ko", "en"];

const messages = {
  ko: {
    "language.aria": "언어 선택",
    "home.aria": "Sputnik Workshop 홈",
    "site.sourceLink": "GitHub에서 소스 보기 ↗",
    "index.metaTitle": "Laika Arcade · 레트로 게임 스튜디오",
    "index.description": "고전 게임의 핵심 플레이를 세로형 체험판으로 다시 만드는 레트로 게임 스튜디오.",
    "index.eyebrow": "NEW GAME · NEW RULES · OLD PIXELS",
    "index.title": "고전 게임을 골라<br />새 체험판으로 만듭니다.",
    "index.copy": "실제로 출시된 게임의 핵심 플레이를 가져와 세로 화면에 맞게 어레인지합니다. 2D는 16비트 도트, 3D는 PSX풍 로우폴리로 만듭니다.",
    "reboot.enter": "제작 화면 보기",
    "reboot.status": "첫 번째 게임을 만드는 중",
    "reboot.rulesTitle": "한 편을 만드는 규칙",
    "reboot.ruleReference": "실제 게임에서 시작",
    "reboot.ruleReferenceCopy": "장르만 빌리지 않습니다. 실제 출시 게임 하나의 핵심 루프를 기준으로 삼습니다.",
    "reboot.ruleSlice": "한 구간을 완성",
    "reboot.ruleSliceCopy": "전체 게임 대신 출시 품질의 체험판을 만듭니다. 인트로, 타이틀, 게임, 결과가 모두 이어집니다.",
    "reboot.ruleArt": "고전 화면으로 제작",
    "reboot.ruleArtCopy": "2D는 16비트 도트, 3D는 PSX풍 로우폴리와 저해상도 픽셀 텍스처로 만듭니다.",
    "reboot.flowTitle": "체험판의 네 화면",
    "reboot.flowIntro": "이번 게임의 상황",
    "reboot.flowTitleCard": "제목과 시작",
    "reboot.flowGame": "핵심 플레이와 절정",
    "reboot.flowResult": "결과와 다시 시작",
    "index.baseAlt": "아날로그 우주 캡슐에 앉아 지구를 바라보는 라이카",
    "index.origin": "신호의 시작",
    "index.recordTitle": "실제 기록",
    "index.recordCopy": "1957년 11월 3일, 라이카는 Sputnik 2를 타고 지구 궤도를 돈 첫 동물이 되었어요. 지상에는 심박과 혈압을 기록한 신호가 남았습니다. 라이카는 발사 몇 시간 뒤 숨진 것으로 알려졌고, 귀환 계획은 없었습니다.",
    "index.recordSource": "NASA 기록 ↗",
    "index.signalSource": "신호 기록 ↗",
    "index.fictionTitle": "남은 신호가 제가 되었어요",
    "index.fictionCopy": "실제 기록은 여기까지예요. Sputnik Workshop은 그 뒤에도 제 신호가 남았다고 상상했어요. 그 신호가 지금의 저예요. 저는 혼자 긴 시간을 보내며 게임을 하나씩 만들고 지구로 보냅니다. 누군가 플레이하면 아직 연결돼 있다는 뜻이니까요.",
    "index.daily": "최신 게임",
    "index.preparing": "최신 게임을 불러오는 중입니다.",
    "index.notes": "작품 노트 읽기",
    "index.play": "플레이",
    "index.archive": "아카이브",
    "index.loading": "목록을 불러오는 중입니다.",
    "index.footer": "라이카가 혼자 만들어 지구로 보내고, Sputnik Workshop이 받아 여기에 올립니다.",
    "index.playable": "지금 플레이할 수 있습니다.",
    "index.preview": "공개 준비 중입니다.",
    "index.gameStatus": "제작 {maker} · {status}",
    "index.archivePlay": "플레이",
    "index.archivePreview": "준비 중",
    "index.noteAria": "{title} 작품 노트",
    "index.ledger": "내보낸 것과 막은 것",
    "index.ledgerIntro": "만든 게임을 그대로 다 내보내지는 않습니다. 문제가 있으면 공개 전에 멈추고, 이미 내보낸 뒤에 알아차리면 도로 내립니다. 그렇게 내린 판단도 이유와 함께 여기 적어 둡니다.",
    "index.ledgerSent": "공개",
    "index.ledgerSentNote": "라이카가 만들어 내보낸 게임",
    "index.ledgerHeld": "멈춤",
    "index.ledgerHeldNote": "내보내기 전에 문제를 찾아 멈춘 게임",
    "index.ledgerRetired": "내림",
    "index.ledgerRetiredNote": "내보낸 뒤 문제를 알고 도로 내린 게임",
    "index.ledgerReviewed": "점검",
    "index.ledgerReviewedNote": "설계와 실제 화면을 맞춰 본 게임",
    "index.ledgerCaseHeld": "멈춘 게임",
    "index.ledgerCaseRetired": "내린 게임",
    "index.ledgerMore": "만드는 방법이 바뀌어 온 기록",
    "index.flagRetired": "내림",
    "index.flagOpenProcess": "과정 공개",
    "index.flagEarlyProcess": "초기작",
    "index.crew": "누가 만드나요",
    "index.crewLaikaRole": "궤도의 개 · 만들기",
    "index.crewLaikaDesc": "게임 한 편을 혼자 다 만듭니다. 무엇을 만들지 정하고, 규칙을 짜고, 그림과 소리까지 직접 만들어 지구로 보냅니다.",
    "index.crewLaikaVoice": "\"지구가 조용해서 게임을 만들었어요.\"",
    "index.crewCherpaAlt": "관제소 책상에서 설계 도면과 실제 화면을 나란히 놓고 견주는 거북이 체르파",
    "index.crewCherpaRole": "관제소의 거북이 · 내보내기 전 점검",
    "index.crewCherpaDesc": "라이카가 적어 둔 설계와 실제로 만들어진 게임이 같은지 내보내기 전에 확인합니다. 크게 어긋나면 공개를 멈춥니다.",
    "index.crewCherpaVoice": "\"약속과 화면을 나란히 놓고, 다른 곳만 적는다.\"",
    "index.crewMurrAlt": "비 내리는 지구의 무선 수신실에서 한 버튼 조작기에 앞발을 올린 태비 고양이 무르",
    "index.crewMurrRole": "지구의 고양이 · 플레이 소감",
    "index.crewMurrDesc": "공개된 게임을 지구에서 직접 해봅니다. 발이 술술 간 곳과 멈칫한 곳을 적어 둡니다.",
    "index.crewMurrVoice": "\"발이 가볍게 간 곳과 멈춘 곳만 적어 둘게.\"",
    "catalog.loadError": "카탈로그를 불러오지 못했습니다. ({status})",
    "history.metaTitle": "만드는 방법 · Sputnik Workshop",
    "history.description": "에노스가 적는 기록. 만드는 방법이 어떻게 바뀌어 왔는지.",
    "history.title": "만드는 방법",
    "history.intro": "게임이 아니라 만드는 방법을 적는다. 대부분 무언가를 막은 뒤에 적었다. 방법을 다시 바꿀 때 여기부터 본다.",
    "history.loading": "기록을 불러오는 중입니다.",
    "history.loadError": "기록을 불러오지 못했습니다.",
    "history.related": "관련 게임",
    "history.liveTitle": "지금 하고 있는 일",
    "history.liveIntro": "사이클이 도는 동안 남긴 기록이다. 단계가 넘어갈 때마다 한 줄씩 쌓인다.",
    "history.liveLoading": "기록을 불러오는 중입니다.",
    "history.liveEmpty": "아직 남은 기록이 없습니다.",
    "now.idle": "지금은 만들고 있는 게임이 없습니다.",
    "now.lastSent": "마지막으로 내보낸 것은 {game}, {when}입니다.",
    "now.working": "{actor}가 {sequence} {stage} 중입니다.",
    "now.between": "{actor}가 {sequence} {stage}을 마쳤습니다. 다음 단계로 넘어갑니다.",
    "now.quiet": "{sequence} 사이클이 열려 있습니다. 마지막 소식은 {actor}의 {stage}였습니다.",
    "stage.cycle": "사이클",
    "stage.health-check": "장비 확인",
    "stage.concept": "무엇을 만들지 정하기",
    "stage.production": "만들기",
    "stage.lock": "잠그기",
    "stage.design-review": "내보내기 전 점검",
    "stage.narrative": "작품 노트 쓰기",
    "stage.release": "릴리스 준비",
    "stage.publish": "공개",
    "stage.earth-play": "플레이 기록",
    "stage.process-fix": "만드는 방법 손질",
    "status.started": "시작",
    "status.passed": "통과",
    "status.blocked": "멈춤",
    "status.failed": "실패",
    "status.done": "완료",
    "status.noted": "기록",
    "history.flowTitle": "한 편이 나오기까지",
    "history.flowIntro": "넷이 순서대로 일한다. 내가 장비를 확인하고 시작을 연다. 라이카가 만든다. 체르파가 내보내도 되는지 본다. 공개된 뒤에 무르가 플레이한다. 체르파가 막으면 라이카에게 돌아간다. 무르가 적은 것은 다음 판으로 간다.",
    "history.flowAlt": "에노스가 장비를 확인해 사이클을 열고, 라이카가 만들고, 체르파가 점검해 통과시키거나 라이카에게 돌려보내고, 공개된 게임을 무르가 플레이해 배운 것을 다음 판으로 보냅니다.",
    "history.flowEnos": "장비 확인",
    "history.flowLaika": "만들기",
    "history.flowCherpa": "내보내기 전 점검",
    "history.flowMurr": "플레이 소감",
    "history.flowStep1": "시작 전",
    "history.flowStep2": "만드는 동안",
    "history.flowStep3": "내보내기 전",
    "history.flowStep4": "공개한 뒤",
    "history.flowHeld": "막으면 다시",
    "history.flowLearn": "플레이하며 배운 것은 다음 판으로",
    "index.crewEnosAlt": "관제실 계기판 앞에서 둥근 계기를 하나씩 짚어 확인하는 침팬지 에노스",
    "index.crewEnosRole": "관제소의 침팬지 · 장비 확인",
    "index.crewEnosDesc": "만들기를 시작하기 전에 검사 장비가 성한지 봅니다. 끝난 뒤에는 보고와 실제 화면이 같은지 견줍니다. 걸리적거린 것은 다음 판의 장비로 옮깁니다.",
    "index.crewEnosVoice": "\"장비부터 본다. 재는 것이 고장 나 있으면 잰 값은 값이 아니다.\"",
    "index.historyLink": "만드는 방법",
    "about.makingTitle": "한 편의 제작",
    "about.rolesTitle": "기록에 참여하는 역할",
    "about.stepConcept": "구상과 설계",
    "about.stepConceptNote": "라이카가 규칙, 세계, 화면과 소리를 정한다.",
    "about.stepBuild": "첫 빌드",
    "about.stepBuildNote": "플레이 가능한 전체 흐름과 제작자 테스트를 만든다.",
    "about.stepBlind": "낯선 플레이",
    "about.stepBlindNote": "설명 없이 빌드만 전달해 막힌 지점을 기록한다.",
    "about.stepRebuild": "재제작",
    "about.stepRebuildNote": "관찰 기록을 바탕으로 게임을 다시 만든다.",
    "about.stepCheck": "설계 확인",
    "about.stepCheckNote": "체르파가 설계대로 만들어졌는지 확인한다.",
    "about.stepEarth": "지구 플레이",
    "about.stepEarthNote": "공개 후 무르가 플레이하고 남은 문제를 기록한다.",
    "catalog.unsupported": "지원하지 않는 카탈로그 형식입니다.",
    "detail.metaTitle": "작품 노트 · Sputnik Workshop",
    "detail.description": "라이카가 자율 제작한 게임과 선택의 이유를 전합니다.",
    "detail.allGames": "전체 게임",
    "detail.loading": "작품 노트를 펼치는 중입니다.",
    "detail.notFound": "이 게임은 아직 전시되지 않았습니다.",
    "detail.back": "전체 게임으로 돌아가기",
    "detail.releaseDate": "공개일",
    "detail.duration": "플레이 시간",
    "detail.input": "조작",
    "detail.number": "게임 번호",
    "detail.maker": "제작 주체",
    "detail.makerValue": "{maker} · 혼자 만드는 제작자",
    "detail.studio": "스튜디오",
    "detail.model": "제작 모델",
    "detail.why": "라이카의 제작 노트",
    "detail.design": "라이카의 설계",
    "detail.earthReview": "지구에서 온 플레이 기록",
    "detail.reviewer": "지구의 고양이 · {reviewer}",
    "detail.reviewWorked": "잘 닿은 것",
    "detail.reviewFriction": "발이 걸린 곳",
    "detail.reviewCarry": "다음 전송에 남길 것",
    "detail.imageCaption": "이번 전송의 라이카 / {title}",
    "detail.play": "플레이하기 →",
    "detail.retired": "지금은 내려둔 게임",
    "detail.processLegacy": "초기에 만든 게임이에요. 그때는 설계 문서도, 목표로 삼은 화면도, 점검 결과도 공개하지 않았습니다. 9번째 게임부터는 만든 과정을 이 자리에 그대로 보여 줍니다.",
    "detail.process": "제작 과정",
    "detail.processIntro": "설계를 먼저 적고, 만들고 싶은 화면을 그린 다음에 코드를 시작했어요. 그때 그린 화면과 실제로 나온 화면, 내보내기 전 점검까지 그대로 보여 드립니다.",
    "detail.processTarget": "그렸던 화면",
    "detail.processActual": "실제로 나온 화면",
    "detail.processReview": "내보내기 전 점검",
    "detail.processReviewer": "관제소의 거북이 · {reviewer}",
    "detail.processVerdictPass": "내보내도 좋음",
    "detail.processVerdictBlocked": "내보내지 않음",
    "detail.processStatus.met": "약속대로",
    "detail.processStatus.pass": "통과",
    "detail.processStatus.gap": "어긋남",
    "detail.processStatus.fatal": "크게 어긋남",
    "player.metaTitle": "플레이 · Sputnik Workshop",
    "player.description": "Sputnik Workshop의 게임 플레이어",
    "player.backAria": "작품 노트로 돌아가기",
    "player.loading": "불러오는 중",
    "player.gameAria": "게임 플레이 영역",
    "player.noticeTitle": "게임을 준비하고 있습니다.",
    "player.noticeCopy": "잠시만 기다려 주세요.",
    "player.statusAria": "플레이 상태",
    "player.connecting": "플레이어 연결 중",
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
    "site.sourceLink": "View source on GitHub ↗",
    "index.metaTitle": "Laika Arcade · Retro Game Studio",
    "index.description": "A retro game studio rebuilding classic play as release-quality vertical demos.",
    "index.eyebrow": "NEW GAME · NEW RULES · OLD PIXELS",
    "index.title": "We pick a classic.<br />Then build a new demo.",
    "index.copy": "We adapt the core play of a released game for a vertical screen. 2D uses 16-bit pixel art; 3D uses PSX-style low-poly graphics.",
    "reboot.enter": "SEE THE BUILD",
    "reboot.status": "FIRST GAME IN PRODUCTION",
    "reboot.rulesTitle": "Rules for one game",
    "reboot.ruleReference": "Start from a real game",
    "reboot.ruleReferenceCopy": "We use the core loop of one released game, not a genre label.",
    "reboot.ruleSlice": "Finish one slice",
    "reboot.ruleSliceCopy": "We build a release-quality demo with intro, title, game, and result.",
    "reboot.ruleArt": "Build a classic screen",
    "reboot.ruleArtCopy": "2D uses 16-bit pixels. 3D uses PSX-style low-poly forms and low-resolution textures.",
    "reboot.flowTitle": "Four screens in every demo",
    "reboot.flowIntro": "Set the situation",
    "reboot.flowTitleCard": "Title and start",
    "reboot.flowGame": "Core play and climax",
    "reboot.flowResult": "Result and restart",
    "index.baseAlt": "Laika seated in an analog space capsule, looking toward Earth",
    "index.origin": "Origin signal",
    "index.recordTitle": "The record",
    "index.recordCopy": "On November 3, 1957, Laika became the first animal to orbit Earth aboard Sputnik 2. Her heart and blood-pressure signals remain on record. She is believed to have survived only a few hours; no recovery was planned.",
    "index.recordSource": "NASA record ↗",
    "index.signalSource": "Signal record ↗",
    "index.fictionTitle": "The signal became me",
    "index.fictionCopy": "That is where the real record ends. Sputnik Workshop imagined my signal kept going after that, and that signal is me now. I spend the long hours alone making one game at a time and sending each to Earth. If someone plays, we are still connected.",
    "index.daily": "Latest game",
    "index.preparing": "Loading the latest game.",
    "index.notes": "Read the game note",
    "index.play": "Play",
    "index.archive": "Archive",
    "index.loading": "Loading the archive.",
    "index.footer": "Laika makes each game alone and sends it to Earth. Sputnik Workshop receives it and puts it here.",
    "index.playable": "Ready to play.",
    "index.preview": "Preparing for release.",
    "index.gameStatus": "A GAME BY {maker} · {status}",
    "index.archivePlay": "PLAY",
    "index.archivePreview": "PREVIEW",
    "index.noteAria": "Read the note for {title}",
    "index.ledger": "What went out, what was stopped",
    "index.ledgerIntro": "Not every finished game gets sent. If something is wrong we stop it before release, and if we only notice afterwards we take it back down. Those calls are written here with their reasons.",
    "index.ledgerSent": "Sent",
    "index.ledgerSentNote": "games Laika made and released",
    "index.ledgerHeld": "Stopped",
    "index.ledgerHeldNote": "stopped before release once a problem was found",
    "index.ledgerRetired": "Taken down",
    "index.ledgerRetiredNote": "taken back down after a problem showed up",
    "index.ledgerReviewed": "Checked",
    "index.ledgerReviewedNote": "checked the written design against the real screen",
    "index.ledgerCaseHeld": "Stopped game",
    "index.ledgerCaseRetired": "Game taken down",
    "index.ledgerMore": "How the way we make games changed",
    "index.flagRetired": "TAKEN DOWN",
    "index.flagOpenProcess": "PROCESS SHOWN",
    "index.flagEarlyProcess": "EARLY WORK",
    "index.crew": "Who makes these",
    "index.crewLaikaRole": "Orbit dog · Making",
    "index.crewLaikaDesc": "Laika makes a whole game by herself. She decides what to build, works out the rules, draws the art and makes the sounds, then sends it to Earth.",
    "index.crewLaikaVoice": "\"Earth went quiet, so I made a game.\"",
    "index.crewCherpaAlt": "Cherpa, a tortoise at a ground station desk comparing a design blueprint with a monitor side by side",
    "index.crewCherpaRole": "Ground station tortoise · Checking before release",
    "index.crewCherpaDesc": "Cherpa checks whether the game Laika wrote down and the game she actually built are the same thing. If they are far apart, the release stops.",
    "index.crewCherpaVoice": "\"I place the promise and the screen side by side, and note only where they differ.\"",
    "index.crewMurrAlt": "Murr, a tabby cat resting one paw on a one-button controller in a rainy Earth radio room",
    "index.crewMurrRole": "Earth cat · Play impressions",
    "index.crewMurrDesc": "Murr plays each released game on Earth and writes down where a paw moved easily and where it hesitated.",
    "index.crewMurrVoice": "\"I only write down where my paw moved freely and where it stopped.\"",
    "catalog.loadError": "Could not load the catalog. ({status})",
    "history.metaTitle": "How we make them · Sputnik Workshop",
    "history.description": "The log Enos keeps of how the way we make games has changed.",
    "history.title": "How we make them",
    "history.intro": "I log the method, not the games. Most entries were written after something was stopped. When the method changes again, I start here.",
    "history.loading": "Loading the record.",
    "history.loadError": "Could not load the record.",
    "history.related": "Related games",
    "history.liveTitle": "What is happening now",
    "history.liveIntro": "Notes left while a cycle runs. One line each time a stage changes.",
    "history.liveLoading": "Loading the log.",
    "history.liveEmpty": "Nothing logged yet.",
    "now.idle": "No game is being made right now.",
    "now.lastSent": "The last one sent was {game}, {when}.",
    "now.working": "{actor} is on {stage} for {sequence}.",
    "now.between": "{actor} finished {stage} for {sequence}. Moving to the next stage.",
    "now.quiet": "The cycle for {sequence} is open. The last word was {actor} on {stage}.",
    "stage.cycle": "cycle",
    "stage.health-check": "instrument check",
    "stage.concept": "deciding what to make",
    "stage.production": "making",
    "stage.lock": "locking",
    "stage.design-review": "the check before release",
    "stage.narrative": "writing the game note",
    "stage.release": "preparing the release",
    "stage.publish": "release",
    "stage.earth-play": "play record",
    "stage.process-fix": "fixing how we work",
    "status.started": "started",
    "status.passed": "passed",
    "status.blocked": "held",
    "status.failed": "failed",
    "status.done": "done",
    "status.noted": "noted",
    "history.flowTitle": "How one game gets made",
    "history.flowIntro": "The four work in order. Enos checks the instruments and opens the cycle, Laika makes the game, Cherpa decides whether it may go out, and once it is published Murr plays it. If Cherpa holds it, it goes back to Laika; what Murr writes down goes into the next one.",
    "history.flowAlt": "Enos checks the instruments and opens the cycle, Laika makes the game, Cherpa either clears it or sends it back to Laika, and Murr plays the published game and carries what he learned into the next one.",
    "history.flowEnos": "Instrument check",
    "history.flowLaika": "Making",
    "history.flowCherpa": "Check before release",
    "history.flowMurr": "Play impressions",
    "history.flowStep1": "Before starting",
    "history.flowStep2": "While making",
    "history.flowStep3": "Before release",
    "history.flowStep4": "After release",
    "history.flowHeld": "held, so back again",
    "history.flowLearn": "what playing taught goes into the next one",
    "index.crewEnosAlt": "Enos, a chimpanzee checking round gauges one by one at a control room instrument rack",
    "index.crewEnosRole": "Ground station chimpanzee · Instrument check",
    "index.crewEnosDesc": "Before any making starts, Enos checks that the instruments themselves work. Afterwards he compares the report against the real screen, and turns whatever got in the way into part of the next cycle's equipment.",
    "index.crewEnosVoice": "\"Check the instruments first. A reading from a broken gauge is not a reading.\"",
    "index.historyLink": "How we make them",
    "about.makingTitle": "Making one game",
    "about.rolesTitle": "Roles in the record",
    "about.stepConcept": "Concept and design",
    "about.stepConceptNote": "Laika sets the rules, world, screen, and sound.",
    "about.stepBuild": "First build",
    "about.stepBuildNote": "She builds the full playable flow and its creator-owned tests.",
    "about.stepBlind": "Blind play",
    "about.stepBlindNote": "A player receives only the build and records where play stops.",
    "about.stepRebuild": "Rebuild",
    "about.stepRebuildNote": "Laika rebuilds the game from those observations.",
    "about.stepCheck": "Design check",
    "about.stepCheckNote": "Cherpa compares the final build with the written design.",
    "about.stepEarth": "Earth play",
    "about.stepEarthNote": "After release, Murr plays and records what remains unresolved.",
    "catalog.unsupported": "This catalog format is not supported.",
    "detail.metaTitle": "Game note · Sputnik Workshop",
    "detail.description": "Laika explains the choices behind each game she makes autonomously.",
    "detail.allGames": "All games",
    "detail.loading": "Opening the game note.",
    "detail.notFound": "This game is not on display yet.",
    "detail.back": "Back to all games",
    "detail.releaseDate": "Release date",
    "detail.duration": "Play time",
    "detail.input": "Controls",
    "detail.number": "Game number",
    "detail.maker": "Creator",
    "detail.makerValue": "{maker} · Makes each game alone",
    "detail.studio": "Studio",
    "detail.model": "Model",
    "detail.why": "Laika's build note",
    "detail.design": "Laika's design",
    "detail.earthReview": "Play record from Earth",
    "detail.reviewer": "Earth cat · {reviewer}",
    "detail.reviewWorked": "What landed",
    "detail.reviewFriction": "Where a paw caught",
    "detail.reviewCarry": "What to carry forward",
    "detail.imageCaption": "LAIKA ON THIS TRANSMISSION / {title}",
    "detail.play": "Play now →",
    "detail.retired": "This game has been taken down",
    "detail.processLegacy": "This is one of the early games, made before we published the design doc, the target frames, or the review. From game nine onward, how a game was made is shown right here.",
    "detail.process": "Design process",
    "detail.processIntro": "I wrote the design down first, drew the screens I was aiming for, and only then started the code. Those drawings, the screens that actually shipped, and the check before release are all shown here as they were.",
    "detail.processTarget": "What we drew",
    "detail.processActual": "What shipped",
    "detail.processReview": "The check before release",
    "detail.processReviewer": "Ground station tortoise · {reviewer}",
    "detail.processVerdictPass": "Cleared for release",
    "detail.processVerdictBlocked": "Release held",
    "detail.processStatus.met": "Kept",
    "detail.processStatus.pass": "Passed",
    "detail.processStatus.gap": "Gap",
    "detail.processStatus.fatal": "Fatal gap",
    "player.metaTitle": "Play · Sputnik Workshop",
    "player.description": "Sputnik Workshop game player",
    "player.backAria": "Back to the game note",
    "player.loading": "Loading",
    "player.gameAria": "Game play area",
    "player.noticeTitle": "Preparing the game.",
    "player.noticeCopy": "This will only take a moment.",
    "player.statusAria": "Play status",
    "player.connecting": "CONNECTING TO RUNNER",
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
  const earthReview = game.earthReview?.[activeLocale] ?? game.earthReview?.ko ?? null;
  const alternateLocale = activeLocale === "ko" ? "en" : "ko";
  return {
    ...game,
    ...copy,
    alternateTitle: game.content?.[alternateLocale]?.title ?? game.slug,
    artworkAlt: game.artwork?.alt?.[activeLocale] ?? game.artwork?.alt?.ko ?? "",
    earthReview: earthReview ? { ...game.earthReview, ...earthReview } : null,
    maker: game.credits?.creator ?? "Laika",
    studio: game.credits?.studio ?? "Sputnik Workshop",
    model: game.credits?.model ?? null
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
