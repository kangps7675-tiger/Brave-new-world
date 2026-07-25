/**
 * 물류 스트레스 — "관측 기반" 초크포인트 상태 요약.
 *
 * 정확도 최우선 설계:
 *  - 여러 신호를 가중치로 섞어 하나의 숫자를 "합성"하지 않는다.
 *    (가중치는 임의값 → "왜 그 값이냐"에서 신뢰가 무너진다)
 *  - 대신 관측된 사실을 그대로 나열하고, 등급은 명시적 규칙으로만 매긴다.
 *  - 등급은 3단계(정상/경계/높음)까지만. 정밀 숫자(0~100) 금지.
 *  - 신호마다 출처 신뢰도(A/B/C)와 관측 시점을 붙인다.
 *  - A급(공식) 신호가 없으면 등급을 "확정"하지 않고 "관측 부족"으로 둔다.
 *  - 항상 "추정·비공식"임을 표기한다(공식 물류 지표 아님).
 *
 * 신호 신뢰도 등급:
 *  A = 공식·직접 (UKMTO 피습·나포 경보) — 등급 확정의 근거
 *  B = 관측·간접 (AIS 통항 변화) — 보조
 *  C = 대리지표 (유가 변동성) — 참고, 단독 판단 금지
 */

import type { LabelLanguage } from "@/lib/layerPrefs";
import type { UkmtoIncidentPoint } from "@/lib/ukmtoHatch";

export type StressLevel = "normal" | "watch" | "elevated" | "unknown";

export type SignalTier = "A" | "B" | "C";

export type StressSignal = {
  tier: SignalTier;
  /** 관측 사실 한 줄 (합성값 아님) */
  labelKo: string;
  labelEn: string;
  /** 출처 표시 (예: "UKMTO(공식)") */
  sourceKo: string;
  sourceEn: string;
  /** 관측/갱신 시각 ISO. 없으면 "시점 미상"으로 표기 */
  observedAt?: string | null;
  /**
   * 시연용 목업 신호 여부. true면 UI에 [DEMO] 배지.
   * 목업 신호는 등급 확정·사이렌 근거로 절대 쓰지 않는다(진짜 A급만).
   */
  isDemo?: boolean;
};

export type ChokepointStress = {
  chokepointId: string;
  level: StressLevel;
  /** 등급이 확정(A급 신호 존재)됐는지. false면 참고용 관측만 있음 */
  graded: boolean;
  signals: StressSignal[];
  /** 이 판단에 쓰인 가장 최근 관측 시각 (신선도 표시용) */
  latestObservedAt: string | null;
};

/** 초크포인트별 UKMTO 사건을 걸러낼 반경(도). logisticsRiskPoints의 링 반경과 별개, 판단용은 조금 넓게. */
const CHOKE_MATCH_RADIUS_DEG: Record<string, number> = {
  "choke-hormuz": 3.5,
  "choke-suez": 3.0,
  "choke-bab-el-mandeb": 4.0,
  "choke-malacca": 4.0,
  "choke-taiwan": 3.0,
  "choke-panama": 3.0,
  "choke-bosporus": 2.0,
  "choke-gibraltar": 2.5,
  "choke-good-hope": 5.0,
};

const DEFAULT_MATCH_RADIUS_DEG = 3.5;

/** UKMTO 사건이 초크포인트 인근인지 (거친 각거리, 판단 필터용) */
function incidentNearChoke(
  incident: Pick<UkmtoIncidentPoint, "lat" | "lng">,
  choke: { lat: number; lng: number },
  radiusDeg: number,
): boolean {
  const latD = Math.abs(incident.lat - choke.lat);
  const lngRaw = Math.abs(incident.lng - choke.lng);
  const lngD = Math.min(lngRaw, 360 - lngRaw);
  return Math.sqrt(latD * latD + lngD * lngD) <= radiusDeg;
}

/** 최근 N일 이내인가 (관측 신선도 필터) */
function withinDays(iso: string | null | undefined, days: number): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= days * 24 * 60 * 60 * 1000;
}

function latestIso(isos: (string | null | undefined)[]): string | null {
  let best: number | null = null;
  for (const iso of isos) {
    if (!iso) continue;
    const t = Date.parse(iso);
    if (Number.isNaN(t)) continue;
    if (best == null || t > best) best = t;
  }
  return best == null ? null : new Date(best).toISOString();
}

export type LogisticsStressInputs = {
  chokepointId: string;
  chokeLat: number;
  chokeLng: number;
  /** UKMTO 사건 목록 (A급). 없으면 등급 미확정 */
  ukmtoIncidents: UkmtoIncidentPoint[];
  /**
   * (선택) AIS 통항 관측 (B급). 앱에서 산출된 값을 넘기면 신호로 추가.
   * throughputChangePct: 최근 기준 통항 증감(%). 음수면 감소(우회 가능성).
   */
  aisObservation?: { changePct: number; observedAt?: string | null; isDemo?: boolean } | null;
  /**
   * (선택) 유가 변동성 관측 (C급). 참고 신호로만.
   * volatilityHint: "high" | "elevated" | "normal"
   */
  oilVolatility?: {
    hint: "high" | "elevated" | "normal";
    observedAt?: string | null;
    isDemo?: boolean;
  } | null;
  /** 최근 며칠까지의 UKMTO 사건을 유효 신호로 볼지 (기본 7일) */
  windowDays?: number;
};

/**
 * 초크포인트 하나의 물류 스트레스 관측을 구성한다.
 * 절대 신호를 곱해 점수를 만들지 않는다 — 관측을 모으고 규칙으로 등급만 매긴다.
 */
export function computeChokepointStress(input: LogisticsStressInputs): ChokepointStress {
  const windowDays = input.windowDays ?? 7;
  const radius = CHOKE_MATCH_RADIUS_DEG[input.chokepointId] ?? DEFAULT_MATCH_RADIUS_DEG;
  const signals: StressSignal[] = [];

  // --- A급: UKMTO 공식 사건 ---
  const nearIncidents = input.ukmtoIncidents.filter(
    (inc) =>
      Number.isFinite(inc.lat) &&
      Number.isFinite(inc.lng) &&
      incidentNearChoke(inc, { lat: input.chokeLat, lng: input.chokeLng }, radius) &&
      withinDays(inc.utcDateOfIncident, windowDays),
  );

  // 사건 유형별 심각도 판단 (등급 규칙용)
  const severeTypes = new Set(["Hijack", "Boarding", "Attack"]);
  const severeCount = nearIncidents.filter((i) => severeTypes.has(i.incidentTypeName)).length;
  const anyCount = nearIncidents.length;

  const hasAGrade = anyCount > 0;

  if (anyCount > 0) {
    signals.push({
      tier: "A",
      labelKo: `최근 ${windowDays}일 인근 상선 피습·의심활동 ${anyCount}건${severeCount > 0 ? ` (심각 ${severeCount}건)` : ""}`,
      labelEn: `${anyCount} merchant-vessel incident(s) nearby in last ${windowDays}d${severeCount > 0 ? ` (${severeCount} severe)` : ""}`,
      sourceKo: "UKMTO (공식·비공식 엔드포인트)",
      sourceEn: "UKMTO (official body, unofficial endpoint)",
      observedAt: latestIso(nearIncidents.map((i) => i.utcDateOfIncident)),
    });
  }

  // --- B급: 통과량 관측 (있을 때만) — 실측=IMF PortWatch, isDemo면 시연 ---
  if (input.aisObservation && Number.isFinite(input.aisObservation.changePct)) {
    const pct = input.aisObservation.changePct;
    const isDemo = input.aisObservation.isDemo ?? false;
    // 통항 급감(우회 시사)만 스트레스 신호로. 증가는 중립.
    if (pct <= -12) {
      signals.push({
        tier: "B",
        labelKo: `선박 통항 관측치 ${pct.toFixed(0)}% (우회 가능성)`,
        labelEn: `Vessel transit ${pct.toFixed(0)}% (possible rerouting)`,
        sourceKo: isDemo
          ? "AIS 관측 (시연)"
          : "IMF PortWatch (IMF/Oxford)",
        sourceEn: isDemo
          ? "AIS observation (demo)"
          : "IMF PortWatch (IMF/Oxford)",
        observedAt: input.aisObservation.observedAt ?? null,
        isDemo,
      });
    }
  }

  // --- C급: 유가 변동성 (참고, 단독 판단 금지) ---
  if (input.oilVolatility && input.oilVolatility.hint !== "normal") {
    signals.push({
      tier: "C",
      labelKo: `유가 변동성 ${input.oilVolatility.hint === "high" ? "높음" : "다소 높음"} (대리지표)`,
      labelEn: `Oil-price volatility ${input.oilVolatility.hint} (proxy only)`,
      sourceKo: "시세 변동성 (대리지표)",
      sourceEn: "Price volatility (proxy)",
      observedAt: input.oilVolatility.observedAt ?? null,
      isDemo: input.oilVolatility.isDemo ?? false,
    });
  }

  // --- 등급 규칙 (A급 있을 때만 확정) ---
  // 정확도 원칙: A급 신호가 없으면 B·C만으로 등급을 단정하지 않는다.
  let level: StressLevel;
  let graded: boolean;

  if (!hasAGrade) {
    level = "unknown"; // 관측 부족 — 판단 보류
    graded = false;
  } else if (severeCount >= 2) {
    level = "elevated";
    graded = true;
  } else if (severeCount >= 1 || anyCount >= 3) {
    level = "watch";
    graded = true;
  } else {
    level = "normal";
    graded = true;
  }

  return {
    chokepointId: input.chokepointId,
    level,
    graded,
    signals,
    latestObservedAt: latestIso(signals.map((s) => s.observedAt)),
  };
}

/** 등급 라벨 (UI 표시용) */
export function stressLevelLabel(level: StressLevel, lang: LabelLanguage): string {
  const en = lang === "en";
  switch (level) {
    case "elevated":
      return en ? "Elevated" : "높음";
    case "watch":
      return en ? "Watch" : "경계";
    case "normal":
      return en ? "Normal" : "정상";
    default:
      return en ? "Insufficient observation" : "관측 부족";
  }
}

/** 등급 색 (다크 배경용) */
export function stressLevelColor(level: StressLevel): string {
  switch (level) {
    case "elevated":
      return "#f87171"; // red-400
    case "watch":
      return "#fbbf24"; // amber-400
    case "normal":
      return "#34d399"; // emerald-400
    default:
      return "#94a3b8"; // slate-400
  }
}

/** "추정·비공식" 고지 문구 */
export function stressDisclaimer(lang: LabelLanguage): string {
  return lang === "en"
    ? "Observation-based estimate. Not an official logistics indicator."
    : "관측 기반 추정치입니다. 공식 물류 지표가 아닙니다.";
}

/**
 * 목업 B·C 신호 생성 — AIS/유가 유료 데이터가 붙기 전까지의 "시연용".
 *
 * 원칙:
 *  - 이 신호들은 isDemo=true 로 표시된다. UI에서 [DEMO]로 구분.
 *  - computeChokepointStress는 목업으로 등급을 확정하지 않는다(등급은 A급=UKMTO만).
 *  - 결정론적(초크포인트 id 기반) 값이라 새로고침마다 안 흔들린다 — "가짜 실시간" 연출 금지.
 *
 * 유료 데이터가 붙으면 이 함수를 호출하는 쪽에서 실제 aisObservation/oilVolatility로
 * 교체하기만 하면 된다(로직 본체는 그대로).
 */
export function demoStressSignals(chokepointId: string): {
  aisObservation: { changePct: number; observedAt: string; isDemo: true } | null;
  oilVolatility: { hint: "high" | "elevated" | "normal"; observedAt: string; isDemo: true } | null;
} {
  // 초크포인트 id를 시드로 한 결정론적 값 (해시)
  let h = 0;
  for (let i = 0; i < chokepointId.length; i++) {
    h = (h * 31 + chokepointId.charCodeAt(i)) >>> 0;
  }
  const now = new Date().toISOString();
  // 데모는 항상 표시 임계(-12%)를 넘도록 -15 ~ -39% 범위 (시연 가시성 보장)
  const changePct = -((h % 25) + 15);
  // 데모 유가 힌트는 normal 제외 (normal이면 신호가 안 떠 시연이 비어 보임)
  const volHints: ("high" | "elevated")[] = ["elevated", "high"];
  const hint = volHints[h % 2];

  return {
    aisObservation: { changePct, observedAt: now, isDemo: true },
    oilVolatility: { hint, observedAt: now, isDemo: true },
  };
}

/**
 * 사이렌 발동 판단 — 오직 "확정 등급(A급 근거) elevated"에서만 true.
 * 목업 신호는 절대 사이렌을 울리지 않는다.
 */
export function shouldSoundLogisticsSiren(stress: ChokepointStress): boolean {
  return stress.graded && stress.level === "elevated";
}
