"use client";

import { HoverHint } from "@/components/HoverHint";
import { useLocale } from "@/contexts/LocaleContext";
import { GUEST_POLICY_COPY } from "@/lib/auth/guestPolicy";
import { AUTH_SESSION_POLICY_COPY } from "@/lib/auth/sessionPolicy";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { zc } from "@/lib/uiStack";
import type { ViewerMode } from "@/lib/viewPackages";

type FeatureGuidePanelProps = {
  open: boolean;
  viewerMode?: ViewerMode;
  onClose: () => void;
  /** 첫 방문 1~10 투어 다시 보기 */
  onRestartTour?: () => void;
  onOpenSources?: () => void;
  onOpenParchment?: () => void;
  /** 지구본 조작키 안내 */
  onOpenControlsGuide?: () => void;
};

type GuideSection = {
  title: string;
  steps: string[];
};

function accountGuideSections(lang: LabelLanguage): GuideSection[] {
  const guest = GUEST_POLICY_COPY[lang];
  const session = AUTH_SESSION_POLICY_COPY[lang];
  return [
    { title: guest.title, steps: [...guest.steps] },
    { title: session.title, steps: [...session.steps] },
  ];
}

const GUIDE_SECTIONS_KO: GuideSection[] = [
  {
    title: "이 화면은 무엇인가요",
    steps: [
      "해운사·화주·보험 실무자가 「이 바다는 지금 지나다닐 만한가」를 한 화면에서 판단하도록 만든 해운 위험 상황실입니다.",
      "배가 맞았는지, 그 해역이 얼마나 위험한지, 주변에 군함·군용기가 있는지를 지구본 위에 겹쳐 보여 줍니다.",
      "모든 판정에는 근거와 한계를 같이 적습니다. 자료가 없는 구간은 「배가 없었다」가 아니라 「자료가 없다」로 표시합니다.",
    ],
  },
  {
    title: "첫 화면 읽는 법",
    steps: [
      "UKMTO(영국 해군 해상무역작전본부) 피습·나포 경보가 뜨면 그 위치에 빗금 원이 그려집니다. 지도를 확대할수록 원이 작아져 실제 경보 범위에 가까워집니다.",
      "NAVAREA(해역별로 발령되는 항행경보, 사격훈련·기뢰·위험 구역 알림)는 해당 해역에 면으로 표시됩니다.",
      "AIS(선박이 스스로 쏘는 위치 신호)로 상선·군함 항적을 봅니다. 신호가 끊긴 구간은 비워 두고 추측으로 잇지 않습니다.",
      "불꽃은 공습·피격 지점입니다. 항구·정유소·에너지 시설이 맞은 경우는 시설 이름과 함께 표시됩니다.",
      "미 항모와 군용기는 공개 신호(ADS-B, 항공기가 보내는 위치 신호)로 잡힌 것만 보입니다. 안 보인다고 없는 것은 아닙니다.",
    ],
  },
  {
    title: "오른쪽 속보창",
    steps: [
      "큰 사건이 생기면 화면 오른쪽에 속보창이 알아서 뜹니다. 기준은 세 가지입니다 — 시설·기반시설·인명 피해가 확인된 타격, 선박 피격, 민감 지역의 외교·강경 발언 같은 정세 변화.",
      "창 안 왼쪽 목록은 타격 · 선박 · 정세 · 전선으로 묶여 있고, 묶음 안에서는 최신순입니다. 새로 들어온 건 NEW 표시가 붙습니다.",
      "목록에서 항목을 누르면 그 사건 하나에 대한 사진·본문·근거가 큰 양피지로 열리고, 지도는 그 지역으로 날아가 머뭅니다. 이전·다음 버튼과 위아래 방향키로 넘길 수 있습니다.",
      "사진은 속보 원문 사진을 먼저 쓰고, 없으면 같은 사건을 다룬 기사 사진을 출처와 함께 붙입니다. 현장 사진이 아닐 수 있는 경우에는 그렇다고 적습니다.",
      "「위성으로 보기」를 누르면 같은 자리를 위성 지도로 봅니다. 한글 모드에서는 속보창의 제목·본문·근거가 모두 한글로 나옵니다.",
    ],
  },
  {
    title: "선박·군용기 눌러 보기",
    steps: [
      "AIS 항적(선박)을 누르면 선박 정보, 참고 사진, 그 배와 관련된 기사 몇 건이 열립니다.",
      "군용기를 누르면 같은 방식으로 기종 정보와 관련 기사가 나옵니다. 민항기는 관련 기사 없이 항적 정보만 나옵니다.",
      "빈 바다 위에 마우스를 올려도 설명 카드는 뜨지 않습니다. 화면을 가리지 않게 일부러 뺐습니다.",
    ],
  },
  {
    title: "근거 등급 · 「확인」과 「유력」",
    steps: [
      "피격 선박은 선명이 일치할 때만 「확인」, 정황이 하나로 좁혀질 때는 「유력」으로 구분합니다. 후보가 여럿이면 하나로 찍지 않습니다.",
      "속보·사건에는 「탄탄함 / 교차확인 / 얇음 / 모으는 중」 배지가 붙습니다. 비밀 등급이 아니라, 공개 출처가 서로 얼마나 맞는지입니다.",
      "「왜?」를 누르면 이 소식이 왜 중요한지, 얼마나 믿을지, 다음에 뭘 보면 좋은지가 나옵니다. 의도나 확률은 말하지 않습니다.",
      "근거가 얇은 속보는 큰 양피지에 올리지 않습니다. 사라진 게 아니라 읽기 전에 걸러 둔 것입니다.",
    ],
  },
  {
    title: "무엇을 볼까요 · 묻기",
    steps: [
      "왼쪽 「메뉴」의 「무엇을 볼까요」에서 해운 위험 · 전선·분쟁 · 3D 관측 미리보기 중 하나를 고르면 그에 맞는 레이어가 한 번에 켜집니다.",
      "상단 검색창 옆 「묻기」에 홍해·호르무즈·흑해처럼 짧게 적으면 관련 레이어가 켜지고 지도가 그쪽으로 이동합니다. 긴 해설이 아니라 지도를 맞추는 기능입니다.",
      "상단 「올릴 것」이나 메뉴의 「지도에 올릴 것」에서 레이어를 하나씩 켜고 끌 수 있습니다. 레이어는 지도 위에 겹쳐 보이는 정보층입니다.",
    ],
  },
  {
    title: "북극항로",
    steps: [
      "북동항로(러시아 북쪽 연안)와 북서항로(캐나다 북쪽 군도)가 항로선으로 그려져 있습니다. 선은 대략적인 경로이며 실제 항행 구간과 조금 다를 수 있습니다.",
      "북극권은 수신 기지국이 적어 AIS·항공기 신호가 듬성듬성합니다. 비어 있는 곳은 「배가 없다」가 아니라 「자료가 없다」입니다.",
    ],
  },
  {
    title: "위성 · 3D 건물",
    steps: [
      "사건 카드의 「위성으로 보기」를 누르면 위성 지도로 들어갑니다. 위성 화면에는 선박 항적을 그리지 않습니다(지도가 무거워지는 것을 막기 위해서입니다). 항공기·불꽃·사건 표시는 그대로입니다.",
      "위성 화면에서 충분히 가까이 확대하면 구글의 3D 건물·지형이 기본으로 켜집니다. 끄는 설정은 위성 화면 안에 있습니다.",
    ],
  },
  {
    title: "휴대폰에서",
    steps: [
      "휴대폰 첫 화면은 실시간 속보 피드입니다. 목록에서 사건을 누르면 사진, 근거, 가까운 해협·시설, 관련 기사가 한 카드에 나옵니다.",
      "카드 안의 가벼운 2D 위치 지도에 사건 지점이 표시됩니다. 3D 지구본은 휴대폰에서 열지 않습니다.",
    ],
  },
  {
    title: "전선·분쟁 레이어 (전체 지정학 버전)",
    steps: [
      "「전쟁구역」「외교적 긴장구역」은 빗금 상자로 표시됩니다. 빨강은 실제 전쟁 중, 주황은 외교적으로 팽팽한 지역입니다. 마우스를 올리면 한 줄 요약, 누르면 상세가 열립니다.",
      "도련선(중국이 해상 방어선으로 삼는 섬 줄기)·미군 방어선, CRINK 축(중국·러시아·이란·북한과 그 파트너를 잇는 선), 영토분쟁 모아보기는 「전선·분쟁 보기」에서 켭니다.",
      "「뉴스 · 전투·충돌」「뉴스 · 외교 긴장」「뉴스 · 시위」 칩을 켜면 기사 위치에 빨강·주황·회색 핀이 찍힙니다. 색 뜻은 화면 아래 범례에 있습니다.",
    ],
  },
  {
    title: "지도 조작법",
    steps: [
      "드래그하면 지구본이 돌고, 스크롤하면 확대·축소되며, 빈 바다를 두 번 클릭하면 그 지점으로 확대됩니다.",
      "카메라가 사선으로 눕혀졌을 때 Alt를 누른 채 드래그하면 기울기와 회전을 조절합니다. 좌우는 돌리기, 위아래는 눕히기·세우기입니다.",
      "기사·속보 카드의 🎯(지도) 버튼을 누르면 창을 닫고 그 현장으로 화면이 날아갑니다.",
      "왼쪽 「메뉴」에는 지도에 올릴 것·화면 설정·데이터 출처·도움말이 들어 있습니다.",
    ],
  },
];

const GUIDE_SECTIONS_EN: GuideSection[] = [
  {
    title: "What is this screen?",
    steps: [
      "A shipping-risk desk for carriers, shippers, and insurance staff to answer one question: is this sea passable right now?",
      "It stacks, on one globe, which ship was hit, how risky the area is, and whether warships or military aircraft are nearby.",
      "Every judgement shows its basis and its limits. A stretch with no signal reads “no data”, never “no ship was there”.",
    ],
  },
  {
    title: "Reading the first screen",
    steps: [
      "When UKMTO (the UK Royal Navy's maritime trade operations office) reports an attack or seizure, a hatched circle appears there. The circle shrinks as you zoom in, closer to the real alert radius.",
      "NAVAREA warnings (area navigation alerts: firing drills, mines, hazard zones) show as areas on the sea.",
      "AIS (the position signal ships broadcast) draws merchant and naval tracks. Gaps are left empty, not bridged by guesswork.",
      "Flames mark strikes. When a port, refinery, or energy site is hit, its name is shown with it.",
      "US carriers and military aircraft appear only when public signals (ADS-B, the position signal aircraft broadcast) catch them. Not seeing one does not mean none is there.",
    ],
  },
  {
    title: "The flash desk on the right",
    steps: [
      "When a major event happens, a flash window opens on the right by itself. Three triggers: strikes with confirmed damage to facilities, infrastructure, or people; ship hits; and posture shifts such as diplomacy or hostile rhetoric in sensitive regions.",
      "The list on its left is grouped into Strike · Ship · Posture · Front, newest first inside each group. New arrivals carry a NEW tag.",
      "Click an item to open one big parchment for that single event — photos, text, and basis — while the map flies there and stays. Use Previous / Next or the arrow keys to move through the list.",
      "Photos come from the original flash first; if none, a photo from an article on the same event is used with its source. When it may not be a scene photo, it says so.",
      "“View on satellite” shows the same spot on the satellite map. In Korean mode everything in the desk is shown in Korean.",
    ],
  },
  {
    title: "Click ships and military aircraft",
    steps: [
      "Click an AIS track (a ship) for vessel info, a reference photo, and a few related news stories.",
      "Click a military aircraft for type info and related stories. Civil aircraft show flight data only, without related stories.",
      "Hovering empty ocean no longer opens a card — removed on purpose so it never covers the map.",
    ],
  },
  {
    title: "Evidence grades · Confirmed vs Likely",
    steps: [
      "A hit ship is marked Confirmed only when the name matches, and Likely when the evidence narrows to one candidate. With several candidates, we do not pick one.",
      "Flashes and events may carry Strong / Checked / Thin / Waiting — how well public sources agree, not secrecy.",
      "Why? explains why the item matters, how solid it looks, and what to check next. We never state intent or odds.",
      "Thin items stay off the big parchment. They are filtered before reading, not deleted.",
    ],
  },
  {
    title: "What to see · Ask",
    steps: [
      "In the left 「Menu」, 「What to see」 turns on a matching set of layers at once: Shipping risk, Fronts & conflicts, or 3D observatory preview.",
      "Type a short cue like Red Sea, Hormuz, or Black Sea into 「Ask」 beside the search bar: matching layers turn on and the map flies there. It aligns the map; it is not a long briefing chat.",
      "Use top 「Show」 or the menu's 「What to show」 to toggle layers one by one. A layer is an information overlay on the map.",
    ],
  },
  {
    title: "Arctic routes",
    steps: [
      "The Northern Sea Route (along Russia's north coast) and the Northwest Passage (through Canada's northern islands) are drawn as lane lines. They are approximate and may differ slightly from real transit paths.",
      "Few receivers cover the Arctic, so AIS and aircraft signals are sparse. Empty means “no data”, not “no ship”.",
    ],
  },
  {
    title: "Satellite · 3D buildings",
    steps: [
      "「View on satellite」 on an event card opens the satellite map. Ship tracks are not drawn there, to keep it light. Aircraft, flames, and event markers stay.",
      "Zoom in close on satellite and Google's 3D buildings and terrain turn on by default. The setting to turn them off is inside the satellite view.",
    ],
  },
  {
    title: "On your phone",
    steps: [
      "The phone home screen is the live flash feed. Tap an event for photos, basis, nearby straits and facilities, and related stories in one card.",
      "A light 2D map inside the card marks the spot. The 3D globe does not open on phones.",
    ],
  },
  {
    title: "Fronts & conflicts layers (full geopolitics version)",
    steps: [
      "「War zones」 and 「Diplomatic tension zones」 show as hatched boxes — red is active war, orange is tense diplomacy. Hover for a one-line summary, click for detail.",
      "Island chains (the island arcs China treats as a maritime defense line) with US defense lines, the CRINK axis (links between China, Russia, Iran, DPRK and partners), and territorial disputes turn on from 「Fronts & conflicts」.",
      "「News · combat」「News · diplomatic tension」「News · protest」 chips drop red, orange, and gray pins at article locations. The legend at the bottom explains the colors.",
    ],
  },
  {
    title: "Map controls",
    steps: [
      "Drag to rotate, scroll to zoom, double-click empty ocean to zoom into that point.",
      "When the camera is tilted, hold Alt and drag to adjust pitch and bearing: left/right spins, up/down tilts.",
      "The 🎯 (map) button on a story card closes the window and flies to the spot.",
      "Left 「Menu」 holds What to show, Display, data sources, and help.",
    ],
  },
];

const ECONOMY_GUIDE_SECTIONS_KO: GuideSection[] = [
  {
    title: "지경학 데스크",
    steps: [
      "같은 터미널의 시장 창입니다. 지정학(GTS·전선·제재 회피)과 짝을 이루며, 초크·에너지·항로로 ‘돈이 어디서 막히는가’를 봅니다.",
      "GSCPI·PortWatch·해운 프록시는 막힘 강도. 지도는 그 원인이 어디인지 보여 줍니다.",
    ],
  },
  {
    title: "물류 경보 · 근거 등급",
    steps: [
      "초크포인트 스트레스 양피지에도 「교차확인 / 얇음」 같은 근거 등급이 붙습니다. 투자 신호가 아니라 공개 관측이 얼마나 겹쳤는지입니다.",
      "「왜?」로 왜 중요한지·얼마나 믿을지를 보고, 「관측에서 보기」로 3D 관측대로 넘어갈 수 있습니다. 전황 보고서는 여기 없습니다.",
      "근거가 부족한 경보는 큰 양피지에 올리지 않습니다 — 다 보여주기보다, 읽을 만한 것만 강조합니다.",
    ],
  },
  {
    title: "빠른 시작",
    steps: [
      "첫 화면: 초크포인트 · 항로 · 항구 · 가스/LNG · 무역 코리도 · 에너지·결제 축.",
      "상단 「올릴 것」 또는 왼쪽 「메뉴」에서 BRI/DFC·송유관·민간 AIS·제재 명단은 필요할 때만 켭니다.",
      "검색 옆 「묻기」로 호르무즈·수에즈를 물으면 물류·초크 레이어를 맞출 수 있습니다.",
      "하단 📈·티커로 유가·VIX·지수를 보고, 허브를 고르면 관련 시장이 열립니다. (투자 권유 아님)",
    ],
  },
  {
    title: "일일 공급망 랭킹",
    steps: [
      "좌하단 「공급망 TOP 5」는 초크포인트별 AIS·인근 긴장 신호를 묶어 매일 집계합니다.",
      "지정학 「위험 지역」카드와 같은 날 한 쌍으로 공유하면 콘텐츠 엔진이 됩니다.",
    ],
  },
  {
    title: "초크 · 에너지 · 물류",
    steps: [
      "초크포인트(호르무즈·수에즈 등)와 항로가 기본입니다. 물류 스트레스를 켜면 막힌 곳이 붉게 보입니다.",
      "가스관·LNG는 기본 ON. 송유관·해저 파이프·매장지는 토글.",
      "에너지·결제 축(중–이란 원유 등)은 지경학 축 네트워크로 보입니다. 제재 회피 강도 칩·회랑은 지정학 창에 있습니다.",
    ],
  },
  {
    title: "하단 시세줄 · 경제 정보",
    steps: [
      "화면 아래 좁은 패널에 주요 증시·VIX(공포지수)·유가가 흐르는 시세 표시줄(티커)로 나옵니다.",
      "📈 버튼을 누르면 경제 뉴스와 증시 화면을 모은 정보 요약 창(인텔 시트)이 열립니다.",
      "뉴스는 신뢰도 등급으로 나뉩니다 — 공식·통신사 / 시장 전문 매체 / 아직 확인 안 된 속보.",
    ],
  },
  {
    title: "경제 지도 이동 (Geo Markets)",
    steps: [
      "위쪽 검색·메뉴에서 호르무즈 해협·수에즈 운하·금융 중심 도시·TSMC 등으로 이동합니다.",
      "항목을 클릭하면 관련 뉴스(RSS)와 시세(티커)를 경제 정보 패널에서 봅니다.",
      "「주요 허브」 탭으로 초크포인트나 금융 도시로 빠르게 이동할 수 있습니다.",
    ],
  },
  {
    title: "지도 조작법",
    steps: [
      "드래그하면 회전, 스크롤하면 확대·축소, 두 번 클릭하면 그 지점으로 확대됩니다.",
      "카메라가 사선으로 눕혀졌을 때 Alt + 드래그로 기울기·회전을 조절합니다.",
      "위쪽 「지정학 | 경제·시장」 스위치로 보기 모드를 바꿉니다.",
      "모드를 바꾸면 레이어, 위쪽 메뉴, 아래쪽 정보 창이 함께 바뀝니다.",
    ],
  },
];

const ECONOMY_GUIDE_SECTIONS_EN: GuideSection[] = [
  {
    title: "Geoeconomics desk",
    steps: [
      "The markets desk — pairs with geopolitics (GTS, fronts, sanctions-evasion intensity) for chokepoints, energy, and shipping stress.",
      "GSCPI, PortWatch, and shipping proxies measure congestion; the map shows where it comes from.",
    ],
  },
  {
    title: "Logistics alerts · evidence grades",
    steps: [
      "Chokepoint stress parchments carry the same evidence grades (Checked / Thin…) — about overlapping public signals, not investment tips.",
      "Why? explains why it matters and how solid it looks; View in Observe jumps to the 3D desk. No theater sitrep book here.",
      "Weak alerts stay off the hero parchment — we emphasize readable items, not everything collected.",
    ],
  },
  {
    title: "Quick start",
    steps: [
      "First screen: chokepoints, shipping lanes, ports, gas/LNG, land logistics corridors, energy/payment axes.",
      "Use top 「Show」 or left 「Menu」 for BRI/DFC, oil pipelines, civilian AIS, sanctions list — only when needed.",
      "「Ask」 beside search aligns logistics layers for Hormuz, Suez, and lanes.",
      "Use 📈 and the ticker for oil, VIX, and indices; hubs open related markets (not investment advice).",
    ],
  },
  {
    title: "Daily supply-chain ranking",
    steps: [
      "Bottom-left Supply TOP 5 rolls chokepoint AIS and nearby tension signals each day.",
      "Pair it with geopolitics risk cards as a same-day content engine.",
    ],
  },
  {
    title: "Chokes · energy · logistics",
    steps: [
      "Chokepoints (Hormuz, Suez, …) and shipping lanes are on by default; logistics stress paints blocked spots red.",
      "Gas pipelines and LNG start ON; oil/subsea pipes and deposits stay toggles.",
      "Energy/payment axes show on the economy axis network. Sanctions-evasion intensity chip and corridors live on the geopolitics desk.",
    ],
  },
  {
    title: "Ticker strip · economy intel",
    steps: [
      "The bottom strip streams major indices, VIX, and oil as a ticker.",
      "📈 opens an intel sheet with economy news and markets.",
      "News is split by trust tier — official/wire · specialist market media · unverified breaking.",
    ],
  },
  {
    title: "Geo Markets navigation",
    steps: [
      "Jump from search/menus to Hormuz, Suez, finance hubs, TSMC, and more.",
      "Selecting an item shows related RSS and tickers in the economy region panel.",
      "Use Key hubs to fly quickly to chokepoints or finance cities.",
    ],
  },
  {
    title: "Map controls",
    steps: [
      "Drag to rotate, scroll to zoom, double-click to zoom into a point.",
      "When the camera is tilted, Alt + drag adjusts pitch and bearing.",
      "Use the Conflict | Economy switch at the top — layers, menus, and bottom chrome follow.",
    ],
  },
];

const SATELLITE_GUIDE_SECTIONS_KO: GuideSection[] = [
  {
    title: "관측대란?",
    steps: [
      "실시간 3D 관측 창입니다. 항적·전선·화재·해상 경보를 한자리에서 봅니다.",
      "비밀 정보가 아닙니다. 공개 소식 중 서로 맞춰진 것만 크게 보여 줍니다.",
    ],
  },
  {
    title: "오늘 볼 안건",
    steps: [
      "오른쪽 목록은 레이어 스위치가 아닙니다. 전황 보고서·해상 경보 중 읽을 만한 것만 모은 짧은 목록입니다.",
      "제목을 누르면 보고서가 열립니다. 「왜?」는 왜 지금 보면 좋은지·얼마나 믿을지를 말해 줍니다.",
      "「모으는 중」은 사라진 게 아닙니다 — 출처가 더 쌓이면 위로 올라옵니다.",
      "관심 주제는 오늘 특히 지켜보는 창(우크라·홍해 등)과 얼마나 이어지는지입니다.",
    ],
  },
  {
    title: "전선 속보 · 누가 어디를 잡았나",
    steps: [
      "LiveUA 속보 양피지에서는 이전·다음으로 같은 지역의 다른 핀을 넘길 수 있습니다.",
      "전선·통제면은 우크라만이 아닙니다. 이란·예멘·레바논·이스라엘/팔 전장도 같이 봅니다.",
      "속보 아래 「이 소식이 건드릴 수 있는 곳」은 시세·회랑 참고용입니다. 투자 권유가 아닙니다.",
    ],
  },
  {
    title: "사건 파일 · 공습·항적",
    steps: [
      "「사건」탭에서 기사·좌표로 초안을 만들고, 화재·공습 이력·선박·군용기 항적을 근거로 붙일 수 있습니다.",
      "항적·전선·화재·공중 위협 칩으로 지도 레이어를 빠르게 켜고 끕니다.",
      "아래 시간으로 하루 중 시각을 돌려 볼 수 있습니다. 공식 경보 앱이 아니니 참고용으로만 보세요.",
    ],
  },
];

const SATELLITE_GUIDE_SECTIONS_EN: GuideSection[] = [
  {
    title: "What is the Observatory?",
    steps: [
      "A live 3D desk for tracks, fronts, fires, and maritime alerts.",
      "Not secret intel — we highlight open-source items that cross-check.",
    ],
  },
  {
    title: "Today's watch items",
    steps: [
      "The list on the right is not a layer switch — a short reading queue of theater reports and maritime alerts.",
      "Tap a title for the report. Why? explains why it matters now and how solid it looks.",
      "Waiting items are not deleted — they move up when more sources arrive.",
      "Priority topics show how an item ties to today's windows (Ukraine, Red Sea, etc.).",
    ],
  },
  {
    title: "Frontline flashes · who holds the ground",
    steps: [
      "On a LiveUA flash parchment, use Previous / Next to flip other pins in the same theater.",
      "Control layers are not Ukraine-only — Iran, Yemen, Lebanon, and Israel/Palestine too.",
      "“Where this may show up next” is market/corridor context — not investment advice.",
    ],
  },
  {
    title: "Case file · air raids · tracks",
    steps: [
      "In the Case tab, draft from an article or coordinates, then attach fires, air-raid history, ships, or military tracks as evidence.",
      "Use track / front / fire / air-threat chips to toggle map layers quickly.",
      "The day scrubber moves the clock through the day. Reference only — not an official alert app.",
    ],
  },
];

export function FeatureGuidePanel({
  open,
  viewerMode = "conflict",
  onClose,
  onRestartTour,
  onOpenSources,
  onOpenParchment,
  onOpenControlsGuide,
}: FeatureGuidePanelProps) {
  const { lang } = useLocale();
  const en = lang === "en";
  if (!open) return null;

  const base =
    viewerMode === "economy"
      ? en
        ? ECONOMY_GUIDE_SECTIONS_EN
        : ECONOMY_GUIDE_SECTIONS_KO
      : viewerMode === "satellite"
        ? en
          ? SATELLITE_GUIDE_SECTIONS_EN
          : SATELLITE_GUIDE_SECTIONS_KO
        : en
          ? GUIDE_SECTIONS_EN
          : GUIDE_SECTIONS_KO;
  const sections = [...base, ...accountGuideSections(lang)];

  return (
    <>
      <button
        type="button"
        aria-label={en ? "Close guide" : "사용 안내 닫기"}
        className={`fixed inset-0 ${zc("panelScrim")} bg-[#0a1528]/50 backdrop-blur-[1px]`}
        onClick={onClose}
      />
      <aside
        className={`intel-panel fixed right-3 top-14 ${zc("panel")} flex max-h-[calc(100vh-4.5rem)] w-[min(calc(100vw-1.5rem),360px)] flex-col overflow-hidden rounded-2xl shadow-2xl`}
        role="dialog"
        aria-label={en ? "Feature guide" : "기능 사용 안내"}
      >
        <div className="flex items-start justify-between gap-3 border-b border-sky-300/15 px-4 py-3">
          <div>
            <p className="text-micro uppercase tracking-[0.28em] text-sky-200/70">Guide</p>
            <h2 className="mt-1 text-lg font-semibold text-sky-50">
              {en ? "Feature guide" : "기능 사용 안내"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-sky-200/15 px-2 py-1 text-xs text-sky-100/80 transition hover:border-sky-200/30 hover:text-sky-50"
          >
            {en ? "Close" : "닫기"}
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {onOpenSources || onOpenParchment || onOpenControlsGuide ? (
            <div className="space-y-2">
              {onOpenControlsGuide ? (
                <button
                  type="button"
                  onClick={onOpenControlsGuide}
                  className="w-full rounded-xl border border-sky-300/35 bg-sky-500/10 px-3 py-2.5 text-left text-caption font-medium text-sky-50 transition hover:border-sky-200/50 hover:bg-sky-500/15"
                >
                  {en ? "Globe controls (keys) →" : "지구본 조작키 →"}
                  <span className="mt-0.5 block text-micro font-normal text-sky-100/60">
                    {en
                      ? "WASD, arrows, +/−, Alt+drag, scroll"
                      : "WASD·화살표·+/−·Alt+드래그·휠"}
                  </span>
                </button>
              ) : null}
              {onOpenParchment ? (
                <button
                  type="button"
                  onClick={onOpenParchment}
                  className="w-full rounded-xl border border-amber-300/35 bg-amber-500/10 px-3 py-2.5 text-left text-caption font-medium text-amber-50 transition hover:border-amber-200/50 hover:bg-amber-500/15"
                >
                  {en ? "Source parchment (8 bookmarks) →" : "데이터 출처 양피지 (8개 책갈피) →"}
                  <span className="mt-0.5 block text-micro font-normal text-amber-100/60">
                    {en
                      ? "Honest inventory — what is real, demo, or missing"
                      : "진짜·데모·공백을 솔직히 정리한 안내서"}
                  </span>
                </button>
              ) : null}
              {onOpenSources ? (
                <button
                  type="button"
                  onClick={onOpenSources}
                  className="w-full rounded-xl border border-sky-300/25 bg-sky-500/10 px-3 py-2.5 text-left text-caption font-medium text-sky-50 transition hover:border-sky-200/40 hover:bg-sky-500/15"
                >
                  {en ? "Full sources catalog →" : "어떤 자료를 쓰는지 →"}
                  <span className="mt-0.5 block text-micro font-normal text-sky-100/60">
                    {en
                      ? "What’s live, what’s a snapshot, and what we leave out"
                      : "실시간·고정 자료·일부러 빼 둔 것까지 정리"}
                  </span>
                </button>
              ) : null}
            </div>
          ) : null}
          {onRestartTour ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onRestartTour();
              }}
              className="w-full rounded-xl border border-amber-300/35 bg-amber-500/10 px-3 py-2.5 text-left text-caption font-medium text-amber-50 transition hover:border-amber-200/50 hover:bg-amber-500/15"
            >
              {en ? "Start screen tour" : "화면 투어 시작"}
              <span className="mt-0.5 block text-micro font-normal text-amber-100/60">
                {en
                  ? "You advance with Next — steps never auto-flip. First-time invite is remembered in this browser."
                  : "「다음」을 눌러야 넘어갑니다. 첫 방문 권유는 이 브라우저에 기억됩니다."}
              </span>
            </button>
          ) : null}
          {sections.map((section) => (
            <section key={section.title} className="rounded-xl border border-sky-300/12 bg-black/20 p-3">
              <h3 className="text-sm font-medium text-sky-50/95">{section.title}</h3>
              <ol className="mt-2.5 list-decimal space-y-1.5 pl-4 text-caption leading-5 text-sky-100/75">
                {section.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      </aside>
    </>
  );
}

export function FeatureGuideButton({
  onClick,
  viewerMode = "conflict",
}: {
  onClick: () => void;
  viewerMode?: ViewerMode;
}) {
  const isEconomy = viewerMode === "economy";
  const { t } = useLocale();
  return (
    <HoverHint
      placement="bottom"
      title={t("hoverHelp")}
      detail={isEconomy ? t("hoverHelpHintEconomy") : t("hoverHelpHintConflict")}
    >
      <button
        type="button"
        id="feature-guide-button"
        aria-label={t("hoverHelpOpenAria")}
        onClick={onClick}
        className="flex h-10 shrink-0 items-center justify-center rounded-xl border border-sky-200/15 bg-[#1e3a5f]/55 px-2.5 text-meta font-medium text-sky-50/90 shadow-lg backdrop-blur-md transition hover:border-sky-200/30 hover:bg-[#254875]/65"
      >
        {t("hoverHelp")}
      </button>
    </HoverHint>
  );
}
