/** 워커에서도 쓰므로 앱 별칭(@/)을 import하지 않는다 — LabelLanguage와 호환되는 문자열 */
type LabelLanguage = "ko" | "en" | string;

/**
 * 사건 출처 시각 — 신뢰를 위해 "언제 일어났나 / 원 소스가 언제 발표했나 / 우리가 언제 확인했나"를
 * 년·월·일·시각까지 그대로 보여 준다. 시차를 숨기지 않는 것이 목적이다.
 */
export type ProvenanceTimes = {
  /** 사건 발생 (epoch ms) */
  occurredAt?: number;
  /** 원 소스(UKMTO·Liveuamap)가 발표·게시한 시각 */
  publishedAt?: number;
  /** 우리가 처음 확인한 시각 */
  firstSeenAt?: number;
  /** 최초 확인 시각을 모를 때 쓰는 가장 최근 확인 시각 */
  lastSeenAt?: number;
};

export function parseTime(value: string | number | null | undefined): number | undefined {
  if (value == null || value === "") return undefined;
  const t = typeof value === "number" ? value : Date.parse(value);
  return Number.isFinite(t) ? t : undefined;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** "2026-10-18 12:10 UTC" (한글 모드는 한국시간을 괄호로 덧붙인다: "(21:10 KST)") */
export function formatUtcFull(ms: number, lang: LabelLanguage): string {
  const d = new Date(ms);
  const utc = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
  if (lang === "en") return utc;
  const k = new Date(ms + 9 * 3_600_000);
  const sameDay = k.getUTCDate() === d.getUTCDate();
  const kst = sameDay
    ? `${pad(k.getUTCHours())}:${pad(k.getUTCMinutes())} KST`
    : `${pad(k.getUTCMonth() + 1)}-${pad(k.getUTCDate())} ${pad(k.getUTCHours())}:${pad(k.getUTCMinutes())} KST`;
  return `${utc} (${kst})`;
}

/** 소요 시간: 12분 / 3시간 5분 / 2일 4시간 */
export function formatLag(ms: number, lang: LabelLanguage): string {
  const en = lang === "en";
  if (ms < 60_000) return en ? "under 1 min" : "1분 미만";
  const m = Math.round(ms / 60_000);
  if (m < 60) return en ? `${m} min` : `${m}분`;
  const h = Math.floor(m / 60);
  if (h < 48) return en ? `${h} h ${m % 60} min` : `${h}시간 ${m % 60}분`;
  const d = Math.floor(h / 24);
  return en ? `${d} d ${h % 24} h` : `${d}일 ${h % 24}시간`;
}

export type ProvenanceLine = { label: string; value: string };

/**
 * 표시용 줄 — 값이 있는 것만. 발표→확인 사이가 길면 지연을 덧붙인다.
 * sourceName: "UKMTO" | "Liveuamap" 같은 원 소스 이름.
 */
export function provenanceLines(
  times: ProvenanceTimes,
  sourceName: string,
  lang: LabelLanguage,
): ProvenanceLine[] {
  const en = lang === "en";
  const lines: ProvenanceLine[] = [];
  if (times.occurredAt != null) {
    lines.push({ label: en ? "Occurred" : "사건 발생", value: formatUtcFull(times.occurredAt, lang) });
  }
  if (times.publishedAt != null) {
    lines.push({
      label: en ? `${sourceName} published` : `${sourceName} 발표`,
      value: formatUtcFull(times.publishedAt, lang),
    });
  }
  const seen = times.firstSeenAt ?? times.lastSeenAt;
  if (seen != null) {
    const lag =
      times.publishedAt != null && seen >= times.publishedAt ? seen - times.publishedAt : undefined;
    const base = formatUtcFull(seen, lang);
    lines.push({
      label:
        times.firstSeenAt != null
          ? en
            ? "Confirmed by us"
            : "우리가 확인"
          : en
            ? "Last checked"
            : "마지막 확인",
      value: lag != null && lag >= 60_000 ? `${base} · ${en ? "+" : "발표 후 "}${formatLag(lag, lang)}` : base,
    });
  }
  return lines;
}
