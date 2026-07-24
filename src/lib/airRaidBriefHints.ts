/**
 * 공습경보 브리핑용 순수 헬퍼 — 브라우저 안전 (Node/Anthropic 미사용).
 * LLM rewrite는 `@/lib/llm/airRaidNarrative` (서버 전용).
 */

const TZEVA_CATEGORY_LABEL: Record<number, { ko: string; en: string }> = {
  1: { ko: "로켓·미사일", en: "rocket/missile" },
  2: { ko: "적대 항공기", en: "hostile aircraft" },
  3: { ko: "로켓·미사일", en: "rocket/missile" },
  4: { ko: "로켓·미사일", en: "rocket/missile" },
  6: { ko: "무단 항공기", en: "unauthorized aircraft" },
  7: { ko: "적대 항공기", en: "hostile aircraft" },
  8: { ko: "침투", en: "infiltration" },
  14: { ko: "사전 경고", en: "pre-warning" },
};

/** Oref·ISO·상대 시각을 브리핑용 문장으로 */
export function formatAlertIssuedAt(raw: string | undefined, lang: "ko" | "en"): string {
  const trimmed = raw?.trim();
  if (!trimmed) return lang === "en" ? "moments ago" : "방금 전";

  // Oref: "19.07.2026 11:14:00" or "19.07.2026 11:14"
  const oref = trimmed.match(
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/,
  );
  if (oref) {
    const [, dd, mm, yyyy, hh, min] = oref;
    if (lang === "en") {
      return `${yyyy}-${mm!.padStart(2, "0")}-${dd!.padStart(2, "0")} ${hh!.padStart(2, "0")}:${min} (local alert clock)`;
    }
    return `${yyyy}년 ${Number(mm)}월 ${Number(dd)}일 ${Number(hh)}시 ${min}분(경보 시각)`;
  }

  const ms = Date.parse(trimmed);
  if (Number.isFinite(ms)) {
    const d = new Date(ms);
    if (lang === "en") {
      return d.toLocaleString("en-GB", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZoneName: "short",
      });
    }
    return d.toLocaleString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZoneName: "short",
    });
  }

  return trimmed;
}

/** 방위각(위협이 향하는 방향) → “어느 쪽에서 날아오는지” 문장 */
export function approachFromBearing(bearingDeg: number, lang: "ko" | "en"): string {
  const from = ((bearingDeg + 180) % 360 + 360) % 360;
  const sectors =
    lang === "en"
      ? ([
          [22.5, "the north"],
          [67.5, "the northeast"],
          [112.5, "the east"],
          [157.5, "the southeast"],
          [202.5, "the south"],
          [247.5, "the southwest"],
          [292.5, "the west"],
          [337.5, "the northwest"],
          [360, "the north"],
        ] as const)
      : ([
          [22.5, "북쪽"],
          [67.5, "북동쪽"],
          [112.5, "동쪽"],
          [157.5, "남동쪽"],
          [202.5, "남쪽"],
          [247.5, "남서쪽"],
          [292.5, "서쪽"],
          [337.5, "북서쪽"],
          [360, "북쪽"],
        ] as const);
  let label = lang === "en" ? "an undetermined direction" : "특정되지 않은 방면";
  for (const [max, name] of sectors) {
    if (from <= max) {
      label = name;
      break;
    }
  }
  return lang === "en"
    ? `Track data puts the approach roughly from ${label}`
    : `궤적 기준으로는 ${label}에서 이 쪽으로 접근하는 흐름으로 읽힙니다`;
}

/**
 * 이스라엘 경보 좌표로 지리적으로 가까운 방면만 추정 (발사 주체 단정 아님).
 */
export function inferIsraelApproachHint(
  lat: number,
  lng: number,
  lang: "ko" | "en",
): string {
  if (lat >= 32.85) {
    return lang === "en"
      ? "Geographically this sits in the northern belt, where approaches from Lebanon/Syria are often discussed — the feed itself does not name a launcher"
      : "지리적으로는 북부 권역이라 레바논·시리아 방면 접근이 자주 거론되나, 이 피드만으로 발사 주체를 특정하진 않습니다";
  }
  if (lat <= 31.55 && lng <= 34.95) {
    return lang === "en"
      ? "Geographically this is the southern/southwestern belt nearer Gaza — again a map clue, not a confirmed origin in the alert packet"
      : "지리적으로는 가자 지구에 가까운 남부·서남 권역입니다. 지도상 단서일 뿐 경보 패킷이 발사 원점을 확정하진 않습니다";
  }
  if (lng >= 35.35) {
    return lang === "en"
      ? "Geographically this leans eastern, nearer the Jordan Valley / West Bank flank — origin remains unverified in the feed"
      : "지리적으로는 요르단강 서안·동부 쪽 권역에 가깝습니다. 발사 원점은 피드에서 미확인입니다";
  }
  return lang === "en"
    ? "The alert does not state which direction the threat came from; only the warned locality is confirmed"
    : "어느 쪽에서 날아왔는지는 경보문 자체에 없고, 확인된 것은 경보가 걸린 위치뿐입니다";
}

export function tzevaCategoryThreatLabel(
  category: number | undefined,
  lang: "ko" | "en",
): string | undefined {
  if (category == null) return undefined;
  const hit = TZEVA_CATEGORY_LABEL[category];
  if (!hit) return undefined;
  return lang === "en" ? hit.en : hit.ko;
}
