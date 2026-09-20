/**
 * peacesciencer 배경 — 지정학/지경학 전용 앵글·연한 전망.
 * 사실 코어(접경·라이벌)는 고정. 바꾸는 것은 강조 각도와 “구조상 ~되기 쉽다” 전망뿐.
 * 단정·날짜·결과 예언·투자/대피 지시 금지.
 */

export type PeaceScienceDomain = "conflict" | "economy";

/** 속보 본문에서 고르는 강조 각도 */
export type PeaceScienceAngle =
  | "kinetic"
  | "patrol"
  | "diplomacy"
  | "chokepoint"
  | "market";

const KINETIC_RE =
  /\b(strik(?:e|es|ing|uck)|attack(?:s|ed|ing)?|shell(?:s|ed|ing)?|bomb(?:s|ed|ing)?|invad(?:e|es|ed|ing)|missile|artillery|offensive|raid)\b|공습|타격|포격|폭격|침공|미사일|포병|공세|기습|교전/i;

const PATROL_RE =
  /\b(patrol|exercise|drill|sortie|transit|encroach|incursion|adiz|gray.?zone)\b|순찰|연습|훈련|초계|침범|회색지대|ADIZ|무력시위/i;

const DIPLOMACY_RE =
  /\b(sanction|embargo|summit|talks?|negotiat|ceasefire|treaty|diplomacy|envoy|resolution)\b|제재|정상회담|협상|휴전|조약|외교|특사|결의/i;

const CHOKEPOINT_RE =
  /\b(hormuz|suez|malacca|bab.?el.?mandeb|strait|chokepoint|canal|shipping.?lane|tanker|freight)\b|호르무즈|수에즈|말라카|해협|초크|운하|항로|유조선|운임/i;

const MARKET_RE =
  /\b(market|stock|oil|crude|lng|tariff|supply.?chain|chip|semiconductor|inflation|fx|currency)\b|시장|증시|유가|원유|LNG|관세|공급망|반도체|물가|환율/i;

/**
 * 도메인 기본 앵글 + 본문 키워드로 각도 선택.
 * 지경학은 초크/시장을 우선, 지정학은 군사·순찰·외교를 우선.
 */
export function detectPeaceScienceAngle(
  text: string,
  domain: PeaceScienceDomain,
): PeaceScienceAngle {
  const blob = text.trim();
  if (domain === "economy") {
    if (CHOKEPOINT_RE.test(blob)) return "chokepoint";
    if (MARKET_RE.test(blob)) return "market";
    if (DIPLOMACY_RE.test(blob)) return "diplomacy";
    if (KINETIC_RE.test(blob)) return "kinetic";
    if (PATROL_RE.test(blob)) return "patrol";
    return "market";
  }
  if (KINETIC_RE.test(blob)) return "kinetic";
  if (PATROL_RE.test(blob)) return "patrol";
  if (DIPLOMACY_RE.test(blob)) return "diplomacy";
  if (CHOKEPOINT_RE.test(blob)) return "chokepoint";
  if (MARKET_RE.test(blob)) return "market";
  return "patrol";
}

type AngleCopy = { emphasizeKo: string; emphasizeEn: string; outlookKo: string; outlookEn: string };

/** 도메인×앵글 공통 템플릿 — dyad 불변 사실과 분리된 연한 전망 */
const ANGLE_COPY: Record<PeaceScienceDomain, Record<PeaceScienceAngle, AngleCopy>> = {
  conflict: {
    kinetic: {
      emphasizeKo:
        "이번 속보는 군사력·강제력이 직접 쓰인 장면으로 읽힙니다.",
      emphasizeEn:
        "This flash reads as a moment when military or coercive force was used directly.",
      outlookKo:
        "구조상 상대의 대응 순찰·포격·외교 항의가 이어질 수 있습니다. 확전·종전 시점은 이 데이터가 말하지 않습니다.",
      outlookEn:
        "Structurally, counter-patrols, fire, or diplomatic protests may follow. This data does not say when escalation or de-escalation will land.",
    },
    patrol: {
      emphasizeKo:
        "이번 속보는 순찰·연습·초계처럼 ‘일상’과 ‘신호’ 경계의 움직임으로 읽힙니다.",
      emphasizeEn:
        "This flash reads as patrol, exercise, or gray-zone movement on the line between routine and signal.",
      outlookKo:
        "같은 축에서 초계·연습 일정이 더 겹치면 긴장 인식이 올라갈 수 있습니다. 단정적인 침공·합의 전망은 하지 않습니다.",
      outlookEn:
        "More overlapping patrol or exercise calendars on the same axis can lift perceived tension. We do not assert invasion or settlement outcomes.",
    },
    diplomacy: {
      emphasizeKo:
        "이번 속보는 제재·회담·조약 같은 외교·제도 레버가 움직인 장면으로 읽힙니다.",
      emphasizeEn:
        "This flash reads as diplomacy or institutional levers—sanctions, talks, treaties—moving.",
      outlookKo:
        "후속 협상 일정이나 제재 세부 조항이 보도에 더 붙을 수 있습니다. 타결·결렬을 예단하지 않습니다.",
      outlookEn:
        "Follow-on talks or sanction details may appear in later wires. We do not prejudge breakthrough or collapse.",
    },
    chokepoint: {
      emphasizeKo:
        "이번 속보는 해협·항로 같은 병목이 안보 긴장과 맞물린 장면으로 읽힙니다.",
      emphasizeEn:
        "This flash reads as a chokepoint—strait or sea lane—tied into security tension.",
      outlookKo:
        "보험·우회 항로·해군 호위 논의가 같이 흔들릴 수 있습니다. 봉쇄 성패는 예단하지 않습니다.",
      outlookEn:
        "Insurance, diversion routes, or escort talk may co-move. We do not claim a blockade will succeed or fail.",
    },
    market: {
      emphasizeKo:
        "이번 속보는 안보 긴장이 시장·공급 신호로도 번진 장면으로 읽힙니다.",
      emphasizeEn:
        "This flash reads as security tension spilling into market or supply signals.",
      outlookKo:
        "방산·에너지·환율 같은 해석용 시세가 먼저 움직일 수 있습니다. 투자 권유가 아닙니다.",
      outlookEn:
        "Interpretive quotes in defense, energy, or FX may move first. This is not investment advice.",
    },
  },
  economy: {
    kinetic: {
      emphasizeKo:
        "이번 속보는 군사 사건이 운임·보험·공급 차질로 옮겨 붙을 수 있는 장면으로 읽힙니다.",
      emphasizeEn:
        "This flash reads as a military event that can spill into freight, insurance, or supply disruption.",
      outlookKo:
        "물류 비용과 납기 공지가 먼저 흔들릴 수 있습니다. 가격 방향이나 투자 판단을 제시하지 않습니다.",
      outlookEn:
        "Logistics cost and delivery notices may move first. We do not give price direction or investment calls.",
    },
    patrol: {
      emphasizeKo:
        "이번 속보는 순찰·연습이 항로·허브 불확실성으로 번질 수 있는 장면으로 읽힙니다.",
      emphasizeEn:
        "This flash reads as patrols or exercises that can lift uncertainty on routes and hubs.",
      outlookKo:
        "선사·보험 쪽 경계 고지가 늘어날 수 있습니다. 봉쇄나 시장 붕괴를 예단하지 않습니다.",
      outlookEn:
        "Carrier or insurer caution notices may rise. We do not assert blockade or market collapse.",
    },
    diplomacy: {
      emphasizeKo:
        "이번 속보는 제재·관세·협상이 무역·금융 규칙에 닿는 장면으로 읽힙니다.",
      emphasizeEn:
        "This flash reads as sanctions, tariffs, or talks touching trade and finance rules.",
      outlookKo:
        "허가·우회 거래·금융 채널 공지가 이어질 수 있습니다. 합의 성사 여부를 예단하지 않습니다.",
      outlookEn:
        "Licensing, diversion trade, or finance-channel notices may follow. We do not prejudge a deal.",
    },
    chokepoint: {
      emphasizeKo:
        "이번 속보는 초크포인트(병목 항로)가 물동량·운임을 건드리는 장면으로 읽힙니다.",
      emphasizeEn:
        "This flash reads as a chokepoint touching throughput and freight.",
      outlookKo:
        "우회 항로·대기 일수·할증료 이야기가 먼저 나올 수 있습니다. 수치 예측은 하지 않습니다.",
      outlookEn:
        "Diversion routes, wait days, or surcharges may surface first. We do not forecast specific numbers.",
    },
    market: {
      emphasizeKo:
        "이번 속보는 원자재·금융·공급망 가격 신호가 핵심인 장면으로 읽힙니다.",
      emphasizeEn:
        "This flash reads as commodity, finance, or supply-chain price signals in the lead.",
      outlookKo:
        "관련 시세·환율이 해석용으로 같이 움직일 수 있습니다. 투자 권유·수익 보장이 아닙니다.",
      outlookEn:
        "Related quotes or FX may co-move for interpretation only. Not advice and not a return guarantee.",
    },
  },
};

export function angleCopyFor(
  domain: PeaceScienceDomain,
  angle: PeaceScienceAngle,
): AngleCopy {
  return ANGLE_COPY[domain][angle];
}

/** 유저 고지 — 시세 ‘투자 권유 아님’과 같은 축 */
export const PEACE_SCIENCE_DISCLAIMER = {
  ko: "역사 패턴 해석이며 예측·공식 경보·투자 권유가 아닙니다.",
  en: "Historical-pattern interpretation — not a forecast, official alert, or investment advice.",
} as const;
