"use client";

import { HoverHint } from "@/components/HoverHint";
import { useLocale } from "@/contexts/LocaleContext";
import { GUEST_POLICY_COPY } from "@/lib/auth/guestPolicy";
import { AUTH_SESSION_POLICY_COPY } from "@/lib/auth/sessionPolicy";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { ViewerMode } from "@/lib/viewPackages";

type FeatureGuidePanelProps = {
  open: boolean;
  viewerMode?: ViewerMode;
  onClose: () => void;
  /** 첫 방문 1~10 투어 다시 보기 */
  onRestartTour?: () => void;
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
    title: "빠른 시작",
    steps: [
      "드래그로 지구본을 돌리고, 스크롤로 확대·축소합니다. 빈 바다를 두 번 클릭하면 그 지점으로 확대됩니다.",
      "화면이 사선으로 기울어졌을 때 Alt 키를 누른 채 마우스를 드래그하면 기울기·회전을 조절할 수 있습니다. (좌우=돌리기, 위아래=눕히기/세우기)",
      "좌상단 ≡ 에서 레이어(전선·뉴스·에너지 등)를 켜고 끕니다.",
      "하단 📰 로 검증 보도·전장 뉴스·텔레그램 OSINT를 엽니다. 우측 「주요전장」으로 충돌지에 바로 갈 수 있습니다.",
      "지도 위 핀·분쟁 구역을 클릭하면 오른쪽에 설명이 열립니다.",
    ],
  },
  {
    title: "일일 랭킹 카드",
    steps: [
      "좌하단 「위험 지역 TOP 5 / 공급망 TOP 5」는 매일 UTC 기준으로 자동 집계됩니다.",
      "어제 대비 ▲▼ 순위 변동이 붙고, 「카드 공유」로 1080×1080 PNG를 Threads·릴스에 바로 올릴 수 있습니다.",
      "지정학(전장 긴장)과 지경학(초크포인트 스트레스)이 같은 템플릿으로 한 쌍입니다.",
    ],
  },
  {
    title: "전쟁구역 · 외교적 긴장구역",
    steps: [
      "화면 오른쪽 위 ≡(메뉴) 버튼을 눌러 레이어 패널을 열고 「전쟁구역」이나 「외교적 긴장구역」을 켭니다. (레이어 = 지도 위에 겹쳐 보여 주는 정보층)",
      "지도 위 빗금 친 상자에 마우스를 올리면 그 지역 이름·위험 등급·한 줄 요약이 뜹니다.",
      "상자를 클릭하면 오른쪽에 한국어 설명, 얽혀 있는 나라·세력, 자세한 메모가 열립니다.",
      "색으로 구분합니다 — 빨강은 실제 전쟁 중, 주황은 외교적으로 팽팽한 긴장 상태. 지도를 가까이 확대하면 더 좁은 세부 지역이 먼저 보입니다.",
    ],
  },
  {
    title: "AI 전쟁지역 (맛보기)",
    steps: [
      "레이어 패널에서 「AI 전쟁지역 (데모)」을 켜면, 분쟁 지역과 뉴스에서 전투 언급이 몰리는 곳에 붉은 원이 그려집니다. (뉴스 분석은 전 세계 기사를 자동 수집·분석하는 공개 데이터 GDELT를 사용)",
      "외부 AI 서비스 없이 앱이 자체 규칙으로 대략 판단하는 맛보기(데모) 기능입니다. 중동에 들어가도 자동으로 켜지지는 않습니다.",
      "원 위에 마우스를 올리면 지역 이름, 긴장 정도, 이 판단을 얼마나 믿을 만한지(신뢰도)를 보여 줍니다.",
      "원을 클릭하면 그 지역으로 화면이 이동하고 오른쪽에 자세한 설명 창이 열립니다.",
    ],
  },
  {
    title: "도련선 · 미군 방어선",
    steps: [
      "레이어 패널에서 「도련선 · 미군 방어선」을 켭니다. (대만·한반도 전장 패키지에서는 기본으로 켜질 수 있습니다)",
      "붉은 점선은 중국 제1·제2도련선입니다. 점선이 천천히 흘러 차단벽처럼 보입니다.",
      "푸른 실선은 미군 전방 포위선·전략 심도선입니다. 기지 점(파란 마커)에 마우스를 올리면 탐지 반경이 펼쳐집니다.",
      "대만 주변에 펄스 링이 보이면 — 적·청 선이 교차하는 화약고를 표시한 것입니다.",
    ],
  },
  {
    title: "축 관계망 · 반서방국 충돌사",
    steps: [
      "「축 관계망」을 켜면 이란·중국·러시아·북한 같은 중심 나라(허브)와 그 상대들(스포크)이 곡선으로 이어져 표시됩니다.",
      "위쪽 허브 메뉴 → 「반서방국 충돌사」를 열면 역사 속 11개 충돌 현장(전바오섬·랑선·갈완·츠힌발리 등)을 설명합니다. 카드를 누르면 화면이 부드럽게 그 현장으로 이동하며 옛 문서 느낌의 설명 카드(양피지)가 펼쳐집니다.",
      "오른쪽 위 「주요전장」 목록에서 대만·한반도·우크라이나·중동 같은 충돌지로 한 번에 이동할 수 있습니다.",
      "이어 주는 곡선의 색은 관계의 종류입니다 — 자금 후원 · 무기 지원 · 에너지 · 복합(하이브리드) · 외교.",
    ],
  },
  {
    title: "뉴스 알림 핀 (GDELT)",
    steps: [
      "「뉴스 · 전투·충돌」「뉴스 · 외교 긴장」「뉴스 · 시위」 칩(작은 토글 버튼)을 누르면 관련 뉴스 알림이 켜집니다. (전 세계 기사를 자동 분석하는 공개 데이터 GDELT 기반)",
      "지도에는 빨강·주황·회색 위치 핀이 찍히고, 화면 아래쪽에 「뉴스」 표시가 함께 뜹니다.",
      "핀에 마우스를 올리면 「뉴스 알림」 표시와 함께 뉴스 종류·제목을 볼 수 있습니다.",
      "동맹·시위를 나타내는 핀에도 같은 뉴스 표시가 붙습니다. 색이 무슨 뜻인지는 화면 아래 범례(색상 설명표)에서 확인하세요.",
    ],
  },
  {
    title: "지역 탐색 · 뉴스",
    steps: [
      "화면 위쪽 「충돌지역」「대륙간 갈등」 메뉴에서 대만·한반도·중동 등으로 이동합니다.",
      "지역을 고르면 화면이 그쪽으로 이동하고, 그 지역 뉴스만 모은 정보 요약 창(인텔 시트)이 열립니다.",
      "「주요전선」 탭을 쓰면 대표적인 분쟁 지역으로 빠르게 갈 수 있습니다.",
    ],
  },
  {
    title: "지도 조작법",
    steps: [
      "드래그하면 지구본이 돌고, 스크롤하면 확대·축소되며, 빈 바다를 두 번 클릭하면 그 지점으로 확대됩니다.",
      "카메라가 사선으로 눕혀졌을 때: Alt를 누른 채 드래그하면 기울기(피치)와 회전(베어링)을 직접 맞출 수 있습니다. 좌우로 돌리고, 위아래로 눕히거나 세웁니다.",
      "뉴스 핀이나 분쟁 상자를 클릭하면 그 지역으로 확대되면서 관련 뉴스 요약 창(인텔 시트)이 열립니다.",
      "위쪽 속보 바 또는 📰 아이콘을 누르면 뉴스가 전체 화면으로 열립니다. (마우스 가운데 버튼 클릭도 같은 동작)",
      "기사·속보 카드의 🎯(지도) 버튼을 누르면 창을 닫고 그 현장으로 화면이 날아갑니다.",
      "「✕ 지도로」 또는 아래쪽 닫기를 누르면 전체 화면을 닫고 지구본으로 돌아옵니다.",
      "오른쪽 위 ≡ 메뉴에는 레이어 패널, 자료 출처(NASA FIRMS=위성 화재·열 감지, ADS-B=항공기가 쏘는 위치 신호, MarineTraffic=선박 위치 추적), 도움말, 주요전선 탭이 들어 있습니다.",
    ],
  },
];

const GUIDE_SECTIONS_EN: GuideSection[] = [
  {
    title: "Quick start",
    steps: [
      "Drag to rotate the globe, scroll to zoom. Double-click empty ocean to zoom into that point.",
      "When the view is tilted, hold Alt and drag to adjust pitch and bearing (left/right = spin, up/down = tilt).",
      "Use ≡ (top-left) to toggle layers — fronts, news, energy, and more.",
      "Tap 📰 at the bottom for verified reports, theater news, and Telegram OSINT. Use Key theaters on the right to jump to conflict zones.",
      "Click pins or conflict zones on the map to open details on the right.",
    ],
  },
  {
    title: "Daily ranking cards",
    steps: [
      "Bottom-left 「Risk TOP 5 / Supply-chain TOP 5」 auto-aggregates daily on UTC.",
      "▲▼ shows rank change vs yesterday; 「Share card」 exports a 1080×1080 PNG for Threads or Reels.",
      "Conflict (theater tension) and Economy (chokepoint stress) share the same card template as a pair.",
    ],
  },
  {
    title: "War zones · Diplomatic tension",
    steps: [
      "Open ≡ (top-right) and enable War zones or Diplomatic tension zones. (A layer is an information overlay on the map.)",
      "Hover a hatched box to see name, risk level, and a one-line summary.",
      "Click a box for a description, involved actors, and detailed notes on the right.",
      "Color coding — red = active war, orange = diplomatic tension. Zoom in to reveal narrower sub-regions first.",
    ],
  },
  {
    title: "AI war regions (demo)",
    steps: [
      "Enable 「AI war regions (demo)」 in the layer panel — red circles mark dispute areas and news clusters mentioning combat (powered by GDELT, a public worldwide news analysis feed).",
      "This is an in-app heuristic demo with no external AI service. It does not auto-enable when you enter the Middle East.",
      "Hover a circle for region name, tension level, and confidence.",
      "Click a circle to fly there and open a detail panel on the right.",
    ],
  },
  {
    title: "Island chains · US defense lines",
    steps: [
      "Enable 「Island chains · US defense lines」 in the layer panel (may be on by default in Taiwan/Korea theater packages).",
      "Red dashed lines are China’s first and second island chains — the dashes drift slowly like a barrier.",
      "Blue solid lines are US forward containment / strategic depth. Hover blue base markers for detection radii.",
      "A pulse ring near Taiwan marks where red and blue lines cross — a powder keg.",
    ],
  },
  {
    title: "Axis network · anti-West conflict history",
    steps: [
      "「Axis network」 links hub states (Iran, China, Russia, DPRK) to partners with curved spokes.",
      "Hub menu → 「Anti-West conflict history」 covers 11 historic flashpoints (Zhenbao, Lang Son, Galwan, Tsorak, and more). Tap a card to fly there and open a parchment brief.",
      "Use Key theaters (top-right) to jump to Taiwan, Korea, Ukraine, or the Middle East.",
      "Spoke colors mean relationship type — funding, arms, energy, hybrid, diplomacy.",
    ],
  },
  {
    title: "News alert pins (GDELT)",
    steps: [
      "Toggle 「News · combat」「News · diplomatic tension」「News · protest」 chips (GDELT-based).",
      "Red, orange, and gray pins appear on the map with a News badge in the strip below.",
      "Hover a pin for alert type and headline.",
      "Alliance/protest pins use the same badge. Check the legend at the bottom for color meanings.",
    ],
  },
  {
    title: "Explore regions · news",
    steps: [
      "Use top menus (Conflict regions / Intercontinental friction) to jump to Taiwan, Korea, the Middle East, and more.",
      "Choosing a region flies the camera and opens an intel sheet filtered to that area.",
      "The Key fronts tab jumps quickly to major dispute theaters.",
    ],
  },
  {
    title: "Map controls",
    steps: [
      "Drag to rotate, scroll to zoom, double-click empty ocean to zoom in.",
      "When the camera is tilted: hold Alt and drag to set pitch and bearing — left/right spins, up/down tilts.",
      "Click a news pin or conflict box to zoom in and open the related intel sheet.",
      "The top breaking bar or 📰 opens news full-screen (middle-click does the same).",
      "The 🎯 (map) button on a story card closes the sheet and flies to that location.",
      "「✕ Map」 or the bottom close control returns you to the globe.",
      "≡ (top-right) holds layers, sources (NASA FIRMS, ADS-B, MarineTraffic), help, and Key fronts.",
    ],
  },
];

const ECONOMY_GUIDE_SECTIONS_KO: GuideSection[] = [
  {
    title: "빠른 시작",
    steps: [
      "드래그·줌으로 지구본을 탐색합니다.",
      "화면이 사선으로 기울면 Alt + 드래그로 기울기·회전을 맞춥니다.",
      "≡ 에서 유가·가스·해운·제재·AI DC 레이어를 켭니다.",
      "하단 📈 와 티커로 지수·VIX·경제 속보를 보고, 상단 nav에서 수에즈·호르무즈 등을 고르면 관련 시장이 열립니다.",
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
    title: "제재 · 에너지 · 물류 레이어",
    steps: [
      "≡(메뉴) 버튼 → 「인프라 · 시장」에서 제재, 송유관(파이프라인), LNG(액화천연가스), 해운 항로, 초크포인트를 켭니다. (초크포인트 = 세계 무역이 반드시 지나가는 좁은 길목, 예: 호르무즈 해협)",
      "물류 위험 핀에 마우스를 올리면 Brent(브렌트유 = 국제 유가 기준)·VIX(공포지수 = 시장이 얼마나 불안한지) 같은 관련 시장 수치가 함께 뜹니다.",
      "경제 모드에서는 실시간 속보·텔레그램 수집이 없습니다. 대신 경제 뉴스(RSS = 여러 매체 기사를 한곳에 모아 받는 방식)와 시세 표시줄(티커)을 사용하세요.",
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
      "위쪽 검색·메뉴에서 호르무즈 해협·수에즈 운하·금융 중심 도시·TSMC(세계 최대 대만 반도체 기업) 등으로 이동합니다.",
      "항목을 클릭하면 오른쪽 경제 지역 패널에서 관련 뉴스(RSS)와 시세(티커)를 봅니다.",
      "「주요 허브」 탭으로 초크포인트(무역 길목)나 금융 도시로 빠르게 이동할 수 있습니다.",
    ],
  },
  {
    title: "지도 조작법",
    steps: [
      "드래그하면 회전, 스크롤하면 확대·축소, 두 번 클릭하면 그 지점으로 확대됩니다.",
      "카메라가 사선으로 눕혀졌을 때 Alt + 드래그로 기울기·회전을 조절합니다. (좌우=돌리기, 위아래=눕히기/세우기)",
      "위쪽 「지정학 | 경제·시장」 스위치로 보기 모드를 바꿉니다.",
      "모드를 바꾸면 레이어, 위쪽 메뉴, 아래쪽 정보 창이 함께 바뀝니다.",
    ],
  },
];

const ECONOMY_GUIDE_SECTIONS_EN: GuideSection[] = [
  {
    title: "Quick start",
    steps: [
      "Drag and zoom to explore the globe.",
      "When the view is tilted, Alt + drag adjusts pitch and bearing.",
      "Use ≡ to toggle oil, gas, shipping, sanctions, and AI DC layers.",
      "Use 📈 and the ticker for indices, VIX, and economy briefs; pick Suez, Hormuz, and more from the top nav to open related markets.",
    ],
  },
  {
    title: "Daily supply-chain ranking",
    steps: [
      "Bottom-left 「Supply-chain TOP 5」 aggregates AIS and nearby tension signals per chokepoint daily.",
      "Pair it with the Conflict 「Risk regions」 card the same day for a content engine.",
    ],
  },
  {
    title: "Sanctions · energy · logistics layers",
    steps: [
      "≡ → Infrastructure · markets: sanctions, pipelines, LNG, shipping lanes, chokepoints (narrow trade bottlenecks such as the Strait of Hormuz).",
      "Hover logistics-risk pins for related market reads like Brent and VIX.",
      "Economy mode has no live breaking / Telegram ingest — use economy RSS and the ticker strip instead.",
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
      "When the camera is tilted, Alt + drag adjusts pitch and bearing (left/right = spin, up/down = tilt).",
      "Use the Conflict | Economy switch at the top to change view mode.",
      "Switching modes also swaps layers, top menus, and the bottom intel chrome.",
    ],
  },
];

export function FeatureGuidePanel({
  open,
  viewerMode = "conflict",
  onClose,
  onRestartTour,
}: FeatureGuidePanelProps) {
  const { lang } = useLocale();
  const en = lang === "en";
  if (!open) return null;

  const base =
    viewerMode === "economy"
      ? en
        ? ECONOMY_GUIDE_SECTIONS_EN
        : ECONOMY_GUIDE_SECTIONS_KO
      : en
        ? GUIDE_SECTIONS_EN
        : GUIDE_SECTIONS_KO;
  const sections = [...base, ...accountGuideSections(lang)];

  return (
    <>
      <button
        type="button"
        aria-label={en ? "Close guide" : "사용 안내 닫기"}
        className="absolute inset-0 z-[58] bg-[#0a1528]/50 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <aside
        className="intel-panel absolute right-3 top-14 z-[62] flex max-h-[calc(100vh-4.5rem)] w-[min(calc(100vw-1.5rem),360px)] flex-col overflow-hidden rounded-2xl shadow-2xl"
        role="dialog"
        aria-label={en ? "Feature guide" : "기능 사용 안내"}
      >
        <div className="flex items-start justify-between gap-3 border-b border-sky-300/15 px-4 py-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-sky-200/70">Guide</p>
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
          {onRestartTour ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onRestartTour();
              }}
              className="w-full rounded-xl border border-amber-300/35 bg-amber-500/10 px-3 py-2.5 text-left text-[12px] font-medium text-amber-50 transition hover:border-amber-200/50 hover:bg-amber-500/15"
            >
              {en ? "Replay screen tour 1→10" : "화면 투어 1→10 다시 보기"}
              <span className="mt-0.5 block text-[10px] font-normal text-amber-100/60">
                {en
                  ? "Walks through globe, nav, layers, news sheet, and alerts in order"
                  : "지구본·탐색·레이어·뉴스 시트·알림을 순서대로 가리킵니다"}
              </span>
            </button>
          ) : null}
          {sections.map((section) => (
            <section key={section.title} className="rounded-xl border border-sky-300/12 bg-black/20 p-3">
              <h3 className="text-sm font-medium text-sky-50/95">{section.title}</h3>
              <ol className="mt-2.5 list-decimal space-y-1.5 pl-4 text-[12px] leading-5 text-sky-100/75">
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
        className="flex h-10 shrink-0 items-center justify-center rounded-xl border border-sky-200/15 bg-[#1e3a5f]/55 px-2.5 text-[11px] font-medium text-sky-50/90 shadow-lg backdrop-blur-md transition hover:border-sky-200/30 hover:bg-[#254875]/65"
      >
        {t("hoverHelp")}
      </button>
    </HoverHint>
  );
}
