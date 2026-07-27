import type { LabelLanguage } from "@/lib/layerPrefs";
import type { NewsTheater } from "@/lib/news/types";
import type { ViewerMode } from "@/lib/viewPackages";

const UI = {
  close: { ko: "닫기", en: "Close" },
  cancel: { ko: "취소", en: "Cancel" },
  english: { ko: "English", en: "English" },
  korean: { ko: "한국어", en: "Korean" },
  displayLanguage: { ko: "표시 언어", en: "Display language" },
  displayLanguageHint: {
    ko: "지도 라벨 · 뉴스 · 인텔 패널 언어",
    en: "Map labels · news · intel panel language",
  },
  cityLabelsEn: { ko: "도시명 영문", en: "English place names" },
  cityLabelsKo: { ko: "도시명 한글", en: "Korean place names" },
  viewSettings: { ko: "보기 설정", en: "View settings" },
  viewSettingsHint: { ko: "GEOINT · FININT 단말기 모드", en: "GEOINT · FININT terminal mode" },
  changeViewMode: { ko: "보기 모드 변경", en: "Change view mode" },
  resetCheckboxSettings: { ko: "체크박스 설정 초기화", en: "Reset checkbox settings" },
  layers: { ko: "레이어", en: "Layers" },
  layerApplyConfirm: { ko: "설정하시겠습니까?", en: "Apply these layer settings?" },
  layerApplyConfirmHint: {
    ko: "이미 지도에 반영된 선택을 저장합니다.",
    en: "Save the layer choices already shown on the map.",
  },
  layerApplyConfirmYes: { ko: "설정", en: "Apply" },
  layerDraftHint: {
    ko: "체크하면 지도에 바로 반영됩니다. 상단 「설정」으로 저장을 확정할 수 있습니다.",
    en: "Checks apply to the map right away. Use Apply at the top to confirm.",
  },
  askLayersButton: { ko: "묻기", en: "Ask" },
  askLayersButtonHint: {
    ko: "질문하면 관련 지도 레이어를 켭니다",
    en: "Ask to turn on matching map layers",
  },
  backToMap: { ko: "접기", en: "Collapse" },
  closeNewsDock: { ko: "뉴스 닫기 · 지구본만 보기", en: "Close news · map only" },
  closeNewsGlobeOnlyAria: { ko: "뉴스 닫기 · 지구본만 보기", en: "Close news · map only" },
  globeSpinPause: { ko: "자전 정지", en: "Pause spin" },
  globeSpinResume: { ko: "자전 재생", en: "Resume spin" },
  closeTelegramOsint: { ko: "텔레그램 OSINT 닫기", en: "Close Telegram OSINT" },
  closeTelegramOsintHint: {
    ko: "창을 닫으면 레이어 체크박스에서도 꺼집니다.",
    en: "Closing also turns off the layer checkbox.",
  },
  intelDragDismissTitle: { ko: "뉴스 창 내리기", en: "Pull down to close" },
  intelDragDismissBody: {
    ko: "위 핸들을 아래로 끌면 뉴스 창이 닫히고 지구본만 볼 수 있습니다.",
    en: "Drag the handle down to close the news panel and view the globe.",
  },
  intelDragDismissGotIt: { ko: "알겠어요", en: "Got it" },
  intelDockCollapseHint: {
    ko: "아래로 끌어 내리기",
    en: "Drag down to dismiss",
  },
  intelDockCollapseAria: {
    ko: "속보·뉴스 창 내리기",
    en: "Pull down news dock",
  },
  intelDockExpandHint: {
    ko: "올려서 속보·뉴스 다시 열기",
    en: "Pull up to restore headlines",
  },
  intelDockExpandAria: {
    ko: "속보 창 올리기",
    en: "Expand news dock",
  },
  intelDockGlobeFullscreen: {
    ko: "지구본 전체보기",
    en: "Fullscreen globe",
  },
  openOriginal: { ko: "원문 ↗", en: "Source ↗" },
  openPanel: { ko: "열기 ▶", en: "Open ▶" },
  translationKo: { ko: "한국어 번역", en: "Korean translation" },
  translationEn: { ko: "영문 표시", en: "English display" },
  tier3Toggle: { ko: "속보·관영", en: "Breaking · state media" },
  liveNews: { ko: "실시간 뉴스", en: "Live news" },
  telegramOsint: { ko: "텔레그램 OSINT", en: "Telegram OSINT" },
  conflictZone: { ko: "충돌지역", en: "Conflict zone" },
  intercontinental: { ko: "대륙간 갈등과 협력", en: "Intercontinental conflict & cooperation" },
  relatedNews: { ko: "관련 뉴스", en: "Related news" },
  noGdeltEvents: {
    ko: "이 지역·동맹 범위에 해당하는 GDELT 이벤트가 없습니다.",
    en: "No GDELT events match this region or alliance scope.",
  },
  modePickerTitle: { ko: "어떤 관점으로 볼까요?", en: "How would you like to view?" },
  modePickerSubtitle: {
    ko: "두 가지 보기 모드 중 하나를 선택하세요 · 상단에서 언제든 전환 가능",
    en: "Pick a view mode · switch anytime from the top bar",
  },
  modePickerDetailConflictTitle: {
    ko: "GEOINT — 어디를 먼저 볼까요?",
    en: "GEOINT — where to focus first?",
  },
  modePickerDetailEconomyTitle: {
    ko: "FININT — 어느 허브로 갈까요?",
    en: "FININT — which hub first?",
  },
  modePickerDetailSubtitle: {
    ko: "관심 지역을 고르거나 자동으로 두면 신호가 이끕니다",
    en: "Pick a focus, or leave Auto and follow the signals",
  },
  domainGateTitle: { ko: "어느 창으로 들어설까요?", en: "Which window will you enter?" },
  domainUltraLiteOnHint: {
    ko: "켜짐 · 동시 레이어 최대 16개 · 설정창 없이 가벼운 입장",
    en: "On · max 16 layers · light entry, no extra setup screens",
  },
  domainUltraLiteOffHint: {
    ko: "꺼짐 · 동시 레이어 최대 30개",
    en: "Off · max 30 layers at once",
  },
  layerCapWarnTitle: { ko: "레이어를 더 켤 수 없습니다", en: "Can't enable more layers" },
  layerCapWarnBody: {
    ko: "성능을 위해 동시에 켤 수 있는 레이어는 {cap}개까지입니다. 새 레이어를 켜려면 켜져 있는 레이어 중 하나를 먼저 꺼 주세요.",
    en: "For performance, you can enable up to {cap} layers at once. Turn one off before enabling another.",
  },
  layerCapWarnUltra: {
    ko: "Ultra-Lite 모드에서는 상한이 16개입니다.",
    en: "In Ultra-Lite mode the limit is 16.",
  },
  layerClickCautionTag: { ko: "클릭 주의", en: "Click carefully" },
  layerClickCautionHint: {
    ko: "컴퓨터 사양이 안 좋으신가요? 빠끄!! Ultra-Lite인데 이거 켜면 렉 각입니다.",
    en: "Low-spec PC? Hold up!! Turning this on in Ultra-Lite can lag hard.",
  },
  layerToggleAll: { ko: "전체", en: "All" },
  layerToggleOff: { ko: "끔", en: "Off" },
  layerCategoryCollapse: { ko: "접기", en: "Collapse" },
  layerCategoryExpand: { ko: "펼치기", en: "Expand" },
  hoverTapToPin: { ko: "탭하면 설명 고정", en: "Tap to pin tip" },
  hoverLayerPanel: { ko: "레이어 패널", en: "Layers" },
  hoverLayerPanelClose: { ko: "레이어 패널 닫기", en: "Close layers" },
  hoverLayerPanelHint: {
    ko: "지도에 표시할 항목을 켜고 끕니다.",
    en: "Toggle what appears on the map.",
  },
  hoverLayerPanelOpenAria: { ko: "레이어 패널 열기", en: "Open layers panel" },
  hoverHelp: { ko: "도움말", en: "Help" },
  hoverHelpHintConflict: {
    ko: "지정학 뷰어 사용법과 주요 레이어를 안내합니다.",
    en: "How to use the geopolitics viewer and key layers.",
  },
  hoverHelpHintEconomy: {
    ko: "지경학 뷰어 사용법과 시장·물류 레이어를 안내합니다.",
    en: "How to use the geoeconomics viewer and market layers.",
  },
  hoverHelpOpenAria: { ko: "도움말 열기", en: "Open help" },
  hoverSources: { ko: "자료출처", en: "Sources" },
  hoverSourcesHint: {
    ko: "NASA FIRMS · ADS-B · MarineTraffic 및 GDELT, VIINA 등 데이터 라이선스·출처·면책 안내를 봅니다.",
    en: "Licenses and attribution for NASA FIRMS, ADS-B, MarineTraffic, GDELT, VIINA, and more.",
  },
  hoverSourcesAria: { ko: "자료출처 및 라이선스", en: "Sources and licenses" },
  shareView: { ko: "공유", en: "Share" },
  hoverShareView: { ko: "화면 공유", en: "Share view" },
  hoverShareViewHint: {
    ko: "지금 보이는 지도를 워터마크 박힌 이미지로 저장하거나 공유합니다.",
    en: "Save or share the current map view as a watermarked image.",
  },
  hoverShareViewAria: { ko: "현재 화면 이미지로 공유", en: "Share current view as image" },
  hoverUsCarrierTrack: { ko: "미 항공모함 추적", en: "US carrier tracking" },
  hoverUsCarrierAll: {
    ko: "배치·항구 항모를 모두 표시합니다.",
    en: "Show deployed and in-port carriers.",
  },
  hoverUsCarrierDeployed: {
    ko: "작전 배치 항모만 표시합니다.",
    en: "Show deployed carriers only.",
  },
  hoverGpsJam: { ko: "GPS 재밍 (GPSJam)", en: "GPS interference (GPSJam)" },
  hoverGpsJamOff: {
    ko: "켜면 다른 레이어를 숨기고 GNSS 재밍 추정 히트맵만 표시합니다.",
    en: "Turns off other layers and shows the GNSS interference heatmap alone.",
  },
  hoverGpsJamOn: {
    ko: "솔로 모드 — 재밍 히트맵만 표시 중. 끄면 이전 레이어를 복원합니다.",
    en: "Solo mode — interference heatmap only. Off restores previous layers.",
  },
  hoverGpsJamLoading: {
    ko: "GPSJam 데이터를 불러오는 중…",
    en: "Loading GPSJam data…",
  },
  hoverGpsJamError: {
    ko: "GPSJam 데이터를 불러오지 못했습니다.",
    en: "Failed to load GPSJam data.",
  },
  hoverLegendReopen: {
    ko: "닫힌 범례 패널을 다시 엽니다.",
    en: "Reopen the closed legend panel.",
  },
  hoverOpenArticle: { ko: "원문 기사", en: "Full article" },
  hoverOpenArticleHint: {
    ko: "외부 사이트에서 전체 기사를 엽니다.",
    en: "Open the full story on an external site.",
  },
  hoverStockTicker: { ko: "증시 티커", en: "Market ticker" },
  hoverViewOnMap: { ko: "지도에서 보기", en: "View on map" },
  hoverViewOnMapHint: {
    ko: "뉴스 시트를 닫고 해당 전장 위치로 지구본이 이동합니다.",
    en: "Close the news sheet and fly the globe to that theater.",
  },
  hoverBackToMap: { ko: "지도로 돌아가기", en: "Back to map" },
  hoverBackToMapHint: {
    ko: "하단 뉴스 도크를 접고 지구본만 조작합니다.",
    en: "Collapse the bottom news dock and use the globe freely.",
  },
  hoverCloseNews: { ko: "뉴스 닫기", en: "Close news" },
  hoverCloseNewsHint: {
    ko: "하단 뉴스 창을 닫아 지구본이 가려지지 않게 합니다.",
    en: "Close the bottom news panel so the globe stays clear.",
  },
  hoverSheetNews: { ko: "뉴스", en: "News" },
  hoverSheetNewsHint: {
    ko: "Tier별 검증 보도·관영매체 속보 (RSS/GDELT)",
    en: "Tiered verified & state-media briefs (RSS/GDELT)",
  },
  hoverSheetViina: { ko: "VIINA 전선", en: "VIINA front" },
  hoverSheetViinaHint: {
    ko: "점령·경합 셀 기반 전선 이벤트 (화면 표시 전용)",
    en: "Front events from occupation/contest cells (display-only)",
  },
  hoverSheetTelegramHint: {
    ko: "Raw OSINT 피드 · RSS/GDELT·AI 요약과 분리",
    en: "Raw OSINT feed · separate from RSS/GDELT/AI digests",
  },
  hoverTier3Title: { ko: "관영·미검증 속보", en: "State / unverified briefs" },
  hoverTier3Hint: {
    ko: "관영매체·미검증 속보를 함께 봅니다. 사실 단정 전 참고용 신호입니다.",
    en: "State media and unverified briefs — treat as signals, not facts.",
  },
  hoverExplorationFronts: { ko: "주요전장", en: "Key theaters" },
  hoverExplorationFrontsHint: {
    ko: "대만·한반도·우크라이나·중동 등 지정학적 충돌지로 바로 이동합니다.",
    en: "Jump straight to geopolitical flashpoints: Taiwan, Korea, Ukraine, Middle East.",
  },
  hoverExplorationHubs: { ko: "주요 허브", en: "Key hubs" },
  hoverExplorationHubsHint: {
    ko: "호르무즈·수에즈·대만·뉴욕 등 시장·물류 허브로 이동합니다.",
    en: "Fly to Hormuz, Suez, Taiwan, New York, and other market/logistics hubs.",
  },
  hoverDisputeLegendTitle: { ko: "전쟁·외교 긴장 구역", en: "War & diplomatic tension zones" },
  hoverDisputeLegendSubtitle: {
    ko: "마우스 올리기 · 클릭 → 상세",
    en: "Hover · click for details",
  },
  hoverIntelFab: { ko: "Intel 뉴스", en: "Intel news" },
  hoverIntelFabHint: {
    ko: "전체 화면 Tier별 검증 보도·속보를 봅니다. Telegram OSINT는 별도 패널입니다.",
    en: "Full-screen tiered verified briefs. Telegram OSINT is a separate panel.",
  },
  hoverIntelFabOpenAria: { ko: "Intel 뉴스 열기", en: "Open Intel news" },
  hoverEconomyFab: { ko: "경제·증시", en: "Markets" },
  hoverEconomyFabHint: {
    ko: "증시·매크로와 경제 RSS 헤드라인을 봅니다.",
    en: "View markets, macro, and economy RSS headlines.",
  },
  hoverEconomyFabOpenAria: { ko: "경제·증시 열기", en: "Open markets" },
  hoverTheaterAll: { ko: "전체", en: "All" },
  hoverTheaterAllHint: {
    ko: "모든 전장의 Tier별 뉴스를 표시합니다.",
    en: "Show tiered news for all theaters.",
  },
  hoverTheaterMeHint: {
    ko: "중동·이란·이스라엘·홍해 전선 뉴스만 필터링합니다.",
    en: "Filter to Middle East · Iran · Israel · Red Sea.",
  },
  hoverTheaterRuUaHint: {
    ko: "러시아·우크라이나 전선 뉴스만 필터링합니다.",
    en: "Filter to Russia–Ukraine front news.",
  },
  hoverTheaterCnTwHint: {
    ko: "대만해협·남중국해·중국 군사 뉴스만 필터링합니다.",
    en: "Filter to Taiwan Strait · South China Sea · China military.",
  },
  hoverTheaterKoreaHint: {
    ko: "한반도·북한 핵·미사일 관련 뉴스만 필터링합니다.",
    en: "Filter to Korean Peninsula · DPRK nuclear/missile.",
  },
  hoverTheaterJapanHint: {
    ko: "일본 안보·방위·해상 뉴스만 필터링합니다.",
    en: "Filter to Japan security · defense · maritime.",
  },
  hoverTheaterSouthAsiaHint: {
    ko: "인도·파키스탄·LAC 등 남아시아 뉴스만 필터링합니다.",
    en: "Filter to India · Pakistan · LAC / South Asia.",
  },
  hoverTheaterSeAsiaHint: {
    ko: "동남아·남중국해 전선·긴장 뉴스만 (사회이슈 제외).",
    en: "SE Asia · South China Sea frontline/tension only (no social issues).",
  },
  hoverTheaterSouthAmericaHint: {
    ko: "남미 전선·군사 긴장 뉴스만 (사회이슈 제외).",
    en: "South America frontline/military tension only (no social issues).",
  },
  hoverTheaterAfricaHint: {
    ko: "아프리카 전선·무력 분쟁 뉴스만 (사회이슈 제외).",
    en: "Africa frontline/armed conflict only (no social issues).",
  },
  hoverTheaterArcticHint: {
    ko: "북극 항로·하이노스·그린란드 안보 뉴스만 필터링합니다.",
    en: "Filter to Arctic routes · High North · Greenland security.",
  },
  hoverTheaterAtlanticHint: {
    ko: "북대서양·GIUK·NATO 해상 안보 뉴스만 필터링합니다.",
    en: "Filter to North Atlantic · GIUK · NATO maritime security.",
  },
  hoverTheaterGlobalHint: {
    ko: "글로벌 방산·안보 뉴스만 필터링합니다.",
    en: "Filter to global defense · security news.",
  },
  legendDropdown: { ko: "범례", en: "Legend" },
  legendOps: { ko: "작전중", en: "Ops" },
  legendUsCarriers: { ko: "미 항모 {n}척", en: "{n} US carriers" },
  legendShowAll: { ko: " · 전체 표시", en: " · show all" },
  legendAlwaysOn: { ko: " · 항상 표시", en: " · always on" },
  legendNewsAlert: { ko: "뉴스 알림", en: "News alert" },
  legendGdeltPin: { ko: "GDELT 속보 핀", en: "GDELT breaking pin" },
  legendWar: { ko: "전쟁", en: "War" },
  legendWarDetail: { ko: "군사 충돌", en: "Military clash" },
  legendDiplomatic: { ko: "외교", en: "Diplomacy" },
  legendDiplomaticDetail: { ko: "외교적 긴장", en: "Diplomatic tension" },
  legendAlliance: { ko: "동맹", en: "Alliance" },
  legendAllianceDetail: { ko: "동맹국 갈등", en: "Alliance friction" },
  legendProtest: { ko: "시위", en: "Protest" },
  legendProtestDetail: { ko: "집회·시위", en: "Rally · protest" },
  legendFresh: { ko: "최신", en: "Fresh" },
  legendFreshDetail: { ko: "속보 테두리", en: "Breaking border" },
  legendEconLane: { ko: "항로", en: "Lane" },
  legendEconLaneDetail: { ko: "해운로", en: "Shipping route" },
  legendEconChoke: { ko: "초크", en: "Choke" },
  legendEconChokeDetail: { ko: "물류 병목", en: "Logistics choke" },
  legendEconCritical: { ko: "크리티컬", en: "Critical" },
  legendEconCriticalDetail: { ko: "MIT 노드", en: "MIT node" },
  legendEconPipe: { ko: "에너지", en: "Energy" },
  legendEconPipeDetail: { ko: "파이프·LNG", en: "Pipe · LNG" },
  legendEconPort: { ko: "항구", en: "Port" },
  legendEconPortDetail: { ko: "항만·허브", en: "Port · hub" },
  legendUaTitle: { ko: "우크라이나 점령·주장", en: "Ukraine control · claims" },
  legendUaRuOcc: { ko: "RU 점령", en: "RU occupied" },
  legendUaUaOcc: { ko: "UA 점령", en: "UA controlled" },
  legendUaRuClaim: { ko: "RU 진격·주장", en: "RU claim / advance" },
  legendUaUaClaim: { ko: "UA 주장", en: "UA claim" },
  legendUaThinHatch: { ko: "얇은 실선 · 빗금", en: "Thin solid · hatch" },
  legendUaOrangeDash: { ko: "주황 점선 · 빗금", en: "Orange dashed · hatch" },
  legendUaSkyDash: { ko: "하늘색 점선 · 빗금", en: "Sky dashed · hatch" },
  legendUaRuAdvance: { ko: "RU 진격 방향", en: "RU advance direction" },
  legendUaDashArrow: { ko: "점선 화살", en: "Dashed arrow" },
  legendUaCombatRing: { ko: "충돌지역 링", en: "Combat ring" },
  legendUaCombatRingDetail: { ko: "반경 5km", en: "5 km radius" },
  legendDisputeBody: {
    ko: "전쟁구역(빨강)과 외교적 긴장구역(주황)을 각각 켤 수 있습니다. 사각 틀 안에만 빗금이 그려지며, 근접 줌에서는 세부 구역 세그먼트가 우선 표시됩니다.",
    en: "Toggle war zones (red) and diplomatic tension zones (orange) separately. Hatch draws only inside the box; at close zoom, finer segments take priority.",
  },
  legendDisputeCombat: { ko: "전쟁구역", en: "War zone" },
  legendDisputeDiplomatic: { ko: "외교적 긴장구역", en: "Diplomatic tension zone" },
  ariaClosePanel: { ko: "패널 닫기", en: "Close panel" },
  ariaCloseRegionNews: { ko: "지역 뉴스 패널 닫기", en: "Close regional news panel" },
  ariaCloseInfoPanel: { ko: "정보 패널 닫기", en: "Close info panel" },
  ariaCloseEconomyRegion: { ko: "경제 지역 패널 닫기", en: "Close economy region panel" },
  chromeUtilityHide: { ko: "숨기기", en: "Hide" },
  chromeUtilityShow: { ko: "버튼 보이기", en: "Show buttons" },
  chromeUtilityHideAria: {
    ko: "상단 유틸 버튼 숨기기",
    en: "Hide top utility buttons",
  },
  chromeUtilityShowAria: {
    ko: "상단 유틸 버튼 다시 보이기",
    en: "Show top utility buttons",
  },
  domainConflictTitle: { ko: "GEOINT", en: "GEOINT" },
  domainConflictHint: {
    ko: "Geospatial Intelligence — 전선·분쟁·군사·외교",
    en: "Geospatial Intelligence — fronts, disputes, mil–diplomatic",
  },
  domainEconomyTitle: { ko: "FININT", en: "FININT" },
  domainEconomyHint: {
    ko: "Financial Intelligence — 에너지·물류·항로·시장",
    en: "Financial Intelligence — energy, logistics, lanes, markets",
  },
  welcomeLetterCta: { ko: "편지를 접고 신세계로", en: "Fold the letter — enter the New World" },
  hubBriefCta: { ko: "편지를 접기", en: "Fold the letter" },
  entryCautionMustRead: { ko: "반드시 읽어주세요", en: "Please read this carefully" },
  entryCautionTitle: {
    ko: "RESTRICTED · 오퍼레이터 인가",
    en: "RESTRICTED · OPERATOR CLEARANCE",
  },
  entryCautionSubtitle: {
    ko: "귀하의 접속은 임시 작전 요원(OPERATOR NODE)으로 식별됩니다. 본 단말기는 오픈소스 인텔리전스(OSINT) 상황판입니다.",
    en: "Your session is logged as a temporary OPERATOR NODE. This terminal is an open-source intelligence (OSINT) board.",
  },
  entryCautionPhase1: {
    ko: "IP·브라우저 지문이 임시 오퍼레이터 노드로 기록됩니다. 외부 무단 반출·스크레이핑은 금지됩니다.",
    en: "IP and hardware fingerprint are logged as an active observer. Unauthorized export or scraping is prohibited.",
  },
  entryCautionPhase2: {
    ko: "GEOINT(지리·전선) · FININT(공급망·시장) 피드를 동기화합니다. 레이어를 많이 켜면 렉이 납니다 — UI 동시 ON 일반 {uiCap} · Ultra-Lite {ultraCap} · 패키지 hard cap GEOINT {conflictCap} · FININT {economyCap}.",
    en: "Syncing GEOINT (theater) and FININT (supply · markets) feeds. Many layers cause lag — concurrent ON {uiCap} / Ultra-Lite {ultraCap}; package hard caps GEOINT {conflictCap} · FININT {economyCap}.",
  },
  entryCautionLagLabel: { ko: "성능", en: "Performance" },
  entryCautionLagBody: {
    ko: "체크포인트(레이어)를 많이 켜면 렉이 날 수 있습니다. UI 동시 ON 상한은 일반 {uiCap}개 · Ultra-Lite {ultraCap}개이며, 보기 패키지 hard cap은 지정학 {conflictCap}개 · 지경학 {economyCap}개입니다. 상한에 가깝게 켜 두면 프레임이 떨어질 수 있으니 필요한 레이어만 선택하세요.",
    en: "Turning on many layer checkpoints can cause lag. Concurrent ON caps are {uiCap} (normal) · {ultraCap} (Ultra-Lite). View-package hard caps are {conflictCap} (geopolitics) · {economyCap} (geoeconomics). Stay below the caps and enable only what you need.",
  },
  entryCautionSoundLabel: { ko: "소리", en: "Sound" },
  entryCautionSoundBody: {
    ko: "체크박스를 켠다고 바로 소리가 나지는 않습니다. 레이어는 ‘그 위의 소리가 날 수 있게’ 조건을 여는 것이고, 실제로는 카메라가 해당 지역·이벤트에 들어올 때 자동으로 납니다. 공습 사이렌은 칩/버튼으로 지역을 이동할 때만 울립니다. 이어폰을 쓰시거나, 원치 않으면 아래에서 소리를 꺼 주세요. 이후에도 벨 버튼으로 언제든 끌 수 있습니다.",
    en: "Turning a checkbox on does not play sound by itself. Layers only allow sound when you are over that area — audio starts when the camera enters the region or event. Air-raid sirens play only when you fly via the alert chip/button. Use headphones, or mute below. You can toggle the bell anytime afterward.",
  },
  entryCautionSoundWhenTitle: { ko: "언제 소리가 나나요", en: "When sound plays" },
  entryCautionSoundWhen: {
    ko: "• 공습 사이렌: 경보 칩·버튼으로 fly 할 때만\n• S급 속보만 SOS 모스 (A급은 배너만 · Tier3 단독은 S 불가)\n• NEPTUN·FIRMS 폭격음: 해당 레이어 ON + 화면 안으로 들어올 때\n• 전선 교전음(우크라·중동): 줌 LOD — 멀리 포격/짧은폭격 · near 이하 총성+포격+드론 연속(near 이탈까지)\n• 대만해협: 시계 틱 긴장음 · 한반도/고긴장: rumble\n• 항모 갑판: 미 항모가 화면 안에 있을 때\n• 경제 앰비언트: 파이프라인 > 데이터센터 > 항구 > 경제중심 레이어\n• 티커·모드 전환·일반 클릭으로는 소리가 나지 않습니다",
    en: "• Air-raid siren: only when you fly via the alert chip/button\n• SOS Morse for S-grade breaking only (A = banner silent · Tier3 alone cannot be S)\n• NEPTUN / FIRMS combat: layer ON + event enters the viewport\n• Frontline (Ukraine / Middle East): LOD — far artillery/short blasts · at near-or-closer continuous gunfire+artillery+drone until you leave near\n• Taiwan Strait: ticking tension · Korea / high-tension: rumble\n• Carrier deck: when a US carrier is in view\n• Economy ambient: pipeline > datacenter · port · economic hubs\n• Ticker, mode switch, and normal UI clicks stay silent",
  },
  entryCautionPhase4: {
    ko: "본 피드는 공개 소스·와이어·위성/선박 오픈데이터를 가공한 상황판입니다. 공식 경보 대체가 아니며, 무단 반출·왜곡 시 노드 접근이 차단될 수 있습니다. 벙커의 불빛이 꺼지지 않도록 감시 임무에 동참하시겠습니까?",
    en: "This feed is a situation board built from open sources, wires, and open vessel/satellite data — not a substitute for official alerts. Unauthorized export or distortion may terminate node access. Initialize as an autonomous intel observer?",
  },
  entryCautionCta: { ko: "확인했습니다 — 편지로", en: "Got it — continue to letter" },
  entryCautionCtaHint: {
    ko: "인가 후 환영 편지 → GEOINT / FININT 창 선택",
    en: "After ACK → welcome letter → GEOINT / FININT window",
  },
  entryCautionSkip: { ko: "스킵 · 도메인", en: "SKIP · DOMAIN" },
  entryCautionSkipHint: {
    ko: "경고·편지를 건너뛰고 GEOINT·FININT 선택으로",
    en: "Skip caution & letter — GEOINT / FININT choice",
  },
  /** 하단 메인 CTA 옆 — 처음 방문자가 놓치기 쉬운 코너 스킵 대신 눈에 띄는 위치에 배치 */
  entryCautionSkipCta: { ko: "지금 바로 보기 →", en: "Skip straight to the map →" },
  domainGateSubtitle: {
    ko: "창을 고르면 바로 입장합니다 — 추가 세부 설정창 없음. 빠른 선택을 원하면 아래 초기화 모드를 켜세요.",
    en: "Pick a window and enter at once — no extra setup screens. For a lighter start, turn on Init mode below.",
  },
  domainUltraLiteLabel: { ko: "초기화 모드 (가볍게)", en: "Init mode (lite)" },
  domainUltraLiteHook: {
    ko: "설정창 없이 가볍게 즐기기 — 레이어를 줄여 렉을 낮춥니다. 내장 그래픽·8GB도 OK.",
    en: "Jump in light — fewer layers, less lag. Fine for integrated GPUs & 8GB RAM.",
  },
  soundOn: { ko: "소리 켜짐", en: "Sound on" },
  soundOff: { ko: "소리 꺼짐", en: "Sound muted" },
  soundToggleLabel: { ko: "소리 on/off", en: "Sound on/off" },
  soundMuteAria: { ko: "소리 끄기", en: "Mute sound" },
  soundUnmuteAria: { ko: "소리 켜기", en: "Unmute sound" },
  modePickerPreview: { ko: "시작하면 보이는 것", en: "What you'll see on start" },
  modePickerAdvancedShow: { ko: "레이어 직접 설정 (고급)", en: "Custom layers (advanced)" },
  modePickerAdvancedHide: { ko: "고급 옵션 숨기기", en: "Hide advanced options" },
  modePickerCustomLayers: { ko: "레이어 직접 설정", en: "Custom layers" },
  modePickerTheater: { ko: "관심 전장 (선택)", en: "Focus theater (optional)" },
  modePickerTheaterHint: {
    ko: "자동이면 실시간 신호 기준 가장 뜨거운 충돌지로 이동합니다",
    en: "Auto flies to the hottest conflict zone by live signals",
  },
  modePickerHub: { ko: "관심 허브 (선택)", en: "Focus hub (optional)" },
  modePickerHubHint: {
    ko: "자동이면 RSS·분쟁 신호 기준 가장 핫한 지정학·투자 허브로 이동합니다",
    en: "Auto flies to the hottest geopolitical · investment hub",
  },
  modeStartConflict: { ko: "GEOINT로 시작", en: "Initialize GEOINT" },
  modeStartEconomy: { ko: "FININT로 시작", en: "Initialize FININT" },
  viewerModeLabel: { ko: "단말기 모드", en: "Terminal mode" },
  modeConflict: { ko: "GEOINT", en: "GEOINT" },
  modeConflictHint: {
    ko: "Geospatial Intelligence · 전선 · OSINT",
    en: "Geospatial Intelligence · frontline · OSINT",
  },
  modeEconomy: { ko: "FININT", en: "FININT" },
  modeEconomyHint: {
    ko: "Financial Intelligence · 공급망 · 증시",
    en: "Financial Intelligence · supply chain · markets",
  },
  basemapModeLabel: { ko: "지도 표시 모드", en: "Basemap mode" },
  basemapIntel: { ko: "인텔", en: "Intel" },
  basemapIntelHint: {
    ko: "다크 벡터 · 레이어 가독성 우선",
    en: "Dark vector · layer readability first",
  },
  basemapTerrain: { ko: "지형", en: "Terrain" },
  basemapTerrainHint: {
    ko: "밝은 벡터 · DEM 기복 · 고줌 3D 건물",
    en: "Light vector · DEM relief · 3D buildings at high zoom",
  },

  intelNews: { ko: "Intel 뉴스", en: "Intel news" },
  intelEconomy: { ko: "경제·증시", en: "Markets" },
  heroAccordingTo: { ko: "에 따르면 ", en: " reports " },
  justNow: { ko: "방금", en: "just now" },
  minutesAgo: { ko: "분 전", en: "m ago" },
  hoursAgo: { ko: "시간 전", en: "h ago" },
  daysAgo: { ko: "일 전", en: "d ago" },
  itemsCount: { ko: "건", en: " items" },
  economyCount: { ko: "경제", en: "economy" },
  intelSheetNews: { ko: "Tier별 뉴스 · 분석", en: "Tier news · analysis" },
  intelSheetTelegram: { ko: "Telegram OSINT · Raw", en: "Telegram OSINT · Raw" },
  intelSheetViina: { ko: "VIINA · 우크라이나 전선", en: "VIINA · Ukraine front" },
  intelSheetVideo: { ko: "동영상 뉴스 · 공신력 채널", en: "Video news · trusted channels" },
  intelSheetVideoTab: { ko: "동영상 뉴스", en: "Video" },
  intelSheetEconomyNews: { ko: "경제 · RSS · 속보", en: "Economy · RSS · breaking" },
  intelSheetMarkets: { ko: "증시 · 매크로 · 지수", en: "Markets · macro · indices" },
  hoverSheetVideo: { ko: "동영상 뉴스", en: "Video news" },
  hoverSheetVideoHint: {
    ko: "BBC·Reuters·AP·Bloomberg 등 공신력 채널 최신 영상만. 메타만 폴링하고 재생은 클릭 시.",
    en: "Trusted outlets only (BBC, Reuters, AP, Bloomberg…). Metadata polls; play on click.",
  },
  aiDigestLabel: { ko: "AI 요약 (참고용)", en: "AI digest (for reference)" },
  aiDigestClose: { ko: "AI 요약 닫기", en: "Close AI digest" },
  aiDigestFail: {
    ko: "캐시된 요약이 없습니다. 원문·규칙 기반 메모만 표시합니다.",
    en: "No cached digest — showing source title and rule-based notes only.",
  },
  aiDigestPolicy: {
    ko: "검증 매체만 · Telegram 제외 · 사실 단정 금지",
    en: "Whitelist media only · Telegram excluded · no factual claims",
  },
  todayHotLabel: { ko: "오늘 핫한 곳", en: "Today's hotspot" },
  todayHotOpen: { ko: "지도 · 시트 열기", en: "Open map · sheet" },
  todayHotDismiss: { ko: "오늘은 숨기기", en: "Hide for today" },
  watchlistLabel: { ko: "관심종목", en: "Watchlist" },
  watchlistEmpty: {
    ko: "별표를 눌러 관심종목을 저장하세요 (이 기기에만).",
    en: "Star symbols to save a watchlist (this device only).",
  },
  marketsNotAdvice: {
    ko: "투자 권유 아님 · 해석용 시세 · 외부에서 보기",
    en: "Not investment advice · interpretive quotes · view externally",
  },
  openYahoo: { ko: "Yahoo에서 보기", en: "View on Yahoo" },
  addWatch: { ko: "관심 추가", en: "Add to watchlist" },
  removeWatch: { ko: "관심 해제", en: "Remove from watchlist" },
  econGenreBar: { ko: "뉴스 카테고리", en: "News categories" },
  econGenreAll: { ko: "전체", en: "All" },
  econGenreAllHint: {
    ko: "AI·빅테크 · 반도체 · 전기차 · 에너지 · 물류 · 인프라 · 거시 · 와이어",
    en: "AI · semis · EV · energy · shipping · infra · macro · wires",
  },
  worldTensionTitle: { ko: "세계 긴장도", en: "World tension" },
  worldTensionDeltaUp: { ko: "어제보다 {n}점 올라감", en: "up {n} from yesterday" },
  worldTensionDeltaDown: { ko: "어제보다 {n}점 내려감", en: "down {n} from yesterday" },
  worldTensionHint: {
    ko: "전 세계 분쟁·군사 활동을 0~100으로 요약한 점수 (100에 가까울수록 위험)",
    en: "Global conflict and military activity as a 0–100 score (closer to 100 = more dangerous)",
  },
  westpacShipMovesNav: {
    ko: "서태평양 주간 함선 이동기",
    en: "Westpac Weekly Ship Moves",
  },
  westpacShipMovesNavHint: {
    ko: "공개 관측",
    en: "Public obs.",
  },
  regimeConflictsNav: {
    ko: "반서방국 분쟁사",
    en: "Intra-bloc conflicts",
  },
  regimeConflictsNavHint: {
    ko: "11대 현장",
    en: "11 sites",
  },
  disputesOverviewNav: {
    ko: "국경·영토 분쟁 (LSIB)",
    en: "Territorial disputes (LSIB)",
  },
  disputesOverviewNavHint: {
    ko: "실데이터 56건",
    en: "56 curated sites",
  },
  westpacShipMovesTitle: {
    ko: "주간 함선 이동 기록",
    en: "Weekly ship movement record",
  },
  westpacShipMovesDisclaimer: {
    ko: "공개 관측 기반 주간 기록입니다. 실시간 AIS 위치가 아닙니다.",
    en: "Public observation weekly record — not live AIS positions.",
  },
  westpacLocationUnknown: {
    ko: "위치 공개 관측 없음",
    en: "No public location fix",
  },
  westpacMapEligibleOnly: {
    ko: "지도에는 승인·좌표 확정 건만 표시",
    en: "Map shows approved fixes with coordinates only",
  },
  westpacConfidenceObserved: { ko: "직접 관측", en: "Observed" },
  westpacConfidenceReported: { ko: "보도 서술", en: "Reported" },
  westpacConfidenceEstimated: { ko: "추정", en: "Estimated" },
  westpacVesselUncertain: { ko: "식별 불확실", en: "ID uncertain" },
  westpacTrailLegend: {
    ko: "점 연결은 공개 관측 연결선이며 실제 항적이 아닙니다",
    en: "Lines connect public observations — not actual tracks",
  },
  westpacEmptyTimeline: {
    ko: "승인된 주간 기록이 아직 없습니다.",
    en: "No approved weekly records yet.",
  },
  westpacLoading: { ko: "불러오는 중…", en: "Loading…" },
  westpacExit: { ko: "나가기", en: "Exit" },
  westpacOpenSource: { ko: "출처", en: "Source" },
} as const;

export type UiStringKey = keyof typeof UI;

export function t(key: UiStringKey, lang: LabelLanguage): string {
  return UI[key][lang];
}

export const THEATER_LABELS: Record<LabelLanguage, Record<NewsTheater, string>> = {
  ko: {
    "middle-east": "중동",
    "russia-ukraine": "러·우",
    "china-taiwan": "중·대",
    korea: "한반도",
    japan: "일본",
    "south-asia": "남아시아",
    "southeast-asia": "동남아",
    "south-america": "남미",
    africa: "아프리카",
    arctic: "북극",
    atlantic: "대서양",
    global: "글로벌",
  },
  en: {
    "middle-east": "Middle East",
    "russia-ukraine": "Russia-Ukraine",
    "china-taiwan": "China-Taiwan",
    korea: "Korea",
    japan: "Japan",
    "south-asia": "South Asia",
    "southeast-asia": "SE Asia",
    "south-america": "South America",
    africa: "Africa",
    arctic: "Arctic",
    atlantic: "Atlantic",
    global: "Global",
  },
};

export function theaterLabel(theater: NewsTheater, lang: LabelLanguage): string {
  return THEATER_LABELS[lang][theater];
}

export const VIEW_THEATER_LABELS: Record<
  LabelLanguage,
  Record<
    | "auto"
    | "korea"
    | "japan"
    | "china-taiwan"
    | "russia-ukraine"
    | "middle-east"
    | "southeast-asia"
    | "south-america"
    | "africa"
    | "global",
    string
  >
> = {
  ko: {
    auto: "자동",
    korea: "한반도",
    japan: "일본",
    "china-taiwan": "대만",
    "russia-ukraine": "우크라",
    "middle-east": "중동",
    "southeast-asia": "동남아",
    "south-america": "남미",
    africa: "아프리카",
    global: "글로벌",
  },
  en: {
    auto: "Auto",
    korea: "Korea",
    japan: "Japan",
    "china-taiwan": "Taiwan",
    "russia-ukraine": "Ukraine",
    "middle-east": "Middle East",
    "southeast-asia": "SE Asia",
    "south-america": "South America",
    africa: "Africa",
    global: "Global",
  },
};

export const MODE_PICKER_CHROME: Record<
  ViewerMode,
  Record<LabelLanguage, { title: string; tagline: string; bullets: string[] }>
> = {
  conflict: {
    ko: {
      title: "지정학",
      tagline: "전선 · GDELT · Telegram OSINT",
      bullets: [
        "우크라이나 전선·NEPTUN 드론·미사일 궤적",
        "GDELT 전투·외교 뉴스 핀",
        "Telegram OSINT · VIINA 점령지",
        "하단: 속보 + GDELT 범례",
      ],
    },
    en: {
      title: "Geopolitics",
      tagline: "Frontline · GDELT · Telegram OSINT",
      bullets: [
        "Ukraine front · NEPTUN drone & missile tracks",
        "GDELT combat · diplomatic news pins",
        "Telegram OSINT · VIINA occupation map",
        "Bottom: breaking news + GDELT legend",
      ],
    },
  },
  economy: {
    ko: {
      title: "경제 · 시장",
      tagline: "빅테크 · 반도체 · 전기차 · 에너지",
      bullets: [
        "주요 증시·VIX·유가 티커",
        "경제 RSS · 빅테크·반도체·전기차·에너지 기업 속보",
        "제재·파이프라인·해운·초크포인트 레이어",
        "하단: 티커 + 시장 속보 (GDELT/TG 없음)",
      ],
    },
    en: {
      title: "Markets",
      tagline: "Big Tech · semis · EV · energy",
      bullets: [
        "Major indices · VIX · oil tickers",
        "Economy RSS · Big Tech · chips · EV · oil majors",
        "Sanctions · pipelines · shipping · chokepoints",
        "Bottom: ticker + market headlines (no GDELT/TG)",
      ],
    },
  },
};

export function previewModeSelectionLocalized(
  mode: ViewerMode,
  lang: LabelLanguage,
  theaterLabel_: string,
  hubLabel: string,
  isAutoTheater: boolean,
  isAutoHub: boolean,
): string[] {
  const bullets = [...MODE_PICKER_CHROME[mode][lang].bullets];
  if (mode === "conflict") {
    bullets.push(
      isAutoTheater
        ? lang === "ko"
          ? "시작 시 가장 뜨거운 충돌지로 자동 이동"
          : "Auto-fly to the hottest conflict zone on start"
        : lang === "ko"
          ? `시작 시 ${theaterLabel_} 전장으로 카메라 이동`
          : `Camera starts at ${theaterLabel_} theater`,
    );
  } else {
    bullets.push(
      isAutoHub
        ? lang === "ko"
          ? "시작 시 가장 핫한 지정학·투자 허브로 자동 이동"
          : "Auto-fly to the hottest geopolitical · investment hub"
        : lang === "ko"
          ? `시작 시 ${hubLabel} 허브로 카메라 이동`
          : `Camera starts at ${hubLabel} hub`,
    );
  }
  return bullets.slice(0, 6);
}

export function formatRelativeAge(pubDate: string, lang: LabelLanguage): string {
  const ts = Date.parse(pubDate);
  if (!Number.isFinite(ts)) return "";
  const minutes = Math.max(0, Math.round((Date.now() - ts) / 60_000));
  if (minutes < 1) return t("justNow", lang);
  if (minutes < 60) return `${minutes}${t("minutesAgo", lang)}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}${t("hoursAgo", lang)}`;
  return `${Math.floor(hours / 24)}${t("daysAgo", lang)}`;
}
