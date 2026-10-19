import { peelUrlsFromText } from "@/lib/liveuamap/peelTitleUrls";
import type { CaseFile, Verdict } from "@/lib/caseFile/types";
import type { LiveuamapEvent } from "@/lib/liveuamap/types";
import { parseTime, type ProvenanceTimes } from "@/lib/provenance";
import { localizeUkmtoIncidentType, localizeUkmtoPlaceText } from "@/lib/ukmtoHatch";
import {
  extractVesselName,
  guessVesselKind,
  isUkmtoAttackType,
  looksLikeMerchantAttack,
  realVesselName,
} from "@/lib/incidentStack/shipText";

/** 우측 사건 스택(슬롯 A)에 쌓이는 한 건. 출처가 달라도 이 모양으로 모은다. */
export type StackSource = "liveua" | "case" | "ukmto" | "nga" | "newfeeds" | "rss";

/** 해운 사용자가 걸러 보는 해역. 해당 없으면 null */
export type StackSea = "hormuz" | "red_sea" | "gulf_of_aden" | "black_sea" | "baltic";

export type StackItem = {
  id: string;
  source: StackSource;
  /** epoch ms */
  at: number;
  title: string;
  place: string;
  lat: number;
  lng: number;
  sea: StackSea | null;
  /** 원본 이벤트 — 펼친 카드·지도 이동에서 쓴다 */
  liveua?: LiveuamapEvent;
  /** source가 ukmto일 때 — 선박명·사건 유형 등 카드 본문 */
  detail?: string | null;
  /** 사진 찾기·카드 머리글용 (UKMTO) */
  vesselName?: string | null;
  vesselType?: string | null;
  /** source가 case일 때 — 카드 링크와 판정 뱃지 */
  caseId?: string;
  verdict?: Verdict;
  /** 사건 발생·원 소스 발표·우리 확인 시각 */
  times?: ProvenanceTimes;
  /** 출처 표기를 그대로 쓰고 싶을 때 (예: "NewFeeds · Reuters") */
  sourceLabel?: string;
  /** 원문 링크 */
  url?: string;
};

/** 스택 상한 — 최신순으로 자른다 */
export const INCIDENT_STACK_MAX = 50;

type Box = { sea: StackSea; latMin: number; latMax: number; lngMin: number; lngMax: number };

/** 대략적인 해역 박스. 판정용이 아니라 필터 칩용 분류다. */
const SEA_BOXES: Box[] = [
  { sea: "hormuz", latMin: 23.5, latMax: 30.5, lngMin: 48, lngMax: 60 },
  { sea: "red_sea", latMin: 11, latMax: 28, lngMin: 32, lngMax: 45 },
  { sea: "gulf_of_aden", latMin: 10, latMax: 15.5, lngMin: 43, lngMax: 53 },
  { sea: "black_sea", latMin: 40.5, latMax: 46.8, lngMin: 27.3, lngMax: 41.8 },
  { sea: "baltic", latMin: 53.5, latMax: 66, lngMin: 9, lngMax: 30.5 },
];

export function seaForPoint(lat: number, lng: number): StackSea | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  for (const b of SEA_BOXES) {
    if (lat >= b.latMin && lat <= b.latMax && lng >= b.lngMin && lng <= b.lngMax) {
      return b.sea;
    }
  }
  return null;
}

/** 속보 텍스트에서 읽은 선박명·선종 — 확실하지 않으면 비운다 */
function liveuaVesselHints(ev: LiveuamapEvent, title: string): Pick<StackItem, "vesselName" | "vesselType"> {
  const text = `${ev.title} ${ev.titleKo ?? ""} ${title} ${ev.body ?? ""}`;
  return { vesselName: extractVesselName(text), vesselType: guessVesselKind(text) };
}

export function stackItemFromLiveua(ev: LiveuamapEvent, ko: boolean): StackItem | null {
  const at = Date.parse(ev.publishedAt);
  if (!Number.isFinite(at)) return null;
  const raw = ko ? ev.titleKo?.trim() || ev.title : ev.title;
  return {
    id: ev.id,
    source: "liveua",
    at,
    title: peelUrlsFromText(raw).text || raw,
    place: ev.regionId,
    lat: ev.lat,
    lng: ev.lng,
    sea: seaForPoint(ev.lat, ev.lng),
    liveua: ev,
    ...liveuaVesselHints(ev, raw),
    times: { publishedAt: at, firstSeenAt: parseTime(ev.seenAt) },
  };
}

/**
 * 선박 "피격" 사건 여부.
 * - UKMTO·내 케이스는 처음부터 해당(UKMTO는 stackItemFromUkmto에서 피습·나포 유형만 통과시킨다).
 * - liveuamap 속보는 ①감시 해역 안 ②상선 단어 ③피격·나포 단어가 모두 있고 ④군함·연습이 아닐 때만.
 *   통과·입항·제재 같은 일반 해운 소식, 군함 교전은 전선 속보 서랍으로 간다.
 */
export function isShipIncident(item: StackItem): boolean {
  if (item.source !== "liveua") return true;
  if (item.sea === null) return false;
  const ev = item.liveua;
  const text = `${item.title} ${ev?.title ?? ""} ${ev?.titleKo ?? ""} ${ev?.body ?? ""} ${ev?.bodyKo ?? ""}`;
  return looksLikeMerchantAttack(text);
}

/** 속보를 선박 사건(우측 스택)과 일반 전선 소식(서랍)으로 가른다. */
export function splitShipAndFront(items: StackItem[]): { ship: StackItem[]; front: StackItem[] } {
  const ship: StackItem[] = [];
  const front: StackItem[] = [];
  for (const it of items) (isShipIncident(it) ? ship : front).push(it);
  return { ship, front };
}

type UkmtoLikePoint = {
  id: string;
  lat: number;
  lng: number;
  place: string | null;
  region: string | null;
  incidentTypeName: string;
  vesselName: string | null;
  vesselType: string | null;
  detail: string | null;
  utcDateOfIncident: string | null;
  utcDateCreated?: string | null;
  firstSeenAt?: string | null;
  ingestedAt?: string | null;
};

const VESSEL_TYPE_KO: Record<string, string> = {
  tanker: "유조선",
  cargo: "화물선",
  container: "컨테이너선",
  "container ship": "컨테이너선",
  bulk: "벌크선",
  "bulk carrier": "벌크선",
  merchant: "상선",
  "lng tanker": "LNG 운반선",
  fishing: "어선",
};

/** UKMTO 상선 피습·나포 경보 → 스택 행. 좌표·시각이 없으면 넣지 않는다. ko면 사건 유형·선종·지명을 한글로. */
export function stackItemFromUkmto(u: UkmtoLikePoint, ko = false): StackItem | null {
  if (!Number.isFinite(u.lat) || !Number.isFinite(u.lng)) return null;
  if (!isUkmtoAttackType(u.incidentTypeName)) return null; // Advisory·Suspicious Activity는 경고일 뿐
  const at = u.utcDateOfIncident ? Date.parse(u.utcDateOfIncident) : Number.NaN;
  if (!Number.isFinite(at)) return null;
  const name = realVesselName(u.vesselName); // UKMTO는 선박명을 비공개 — 자리표시어는 이름이 아니다
  // 실제 응답의 vesselType이 "Tanker "처럼 끝에 공백이 붙어 온다
  const typeLabel = ko
    ? localizeUkmtoIncidentType(u.incidentTypeName, "ko")
    : u.incidentTypeName;
  const vesselType = u.vesselType?.trim();
  const vesselLabel = ko && vesselType ? (VESSEL_TYPE_KO[vesselType.toLowerCase()] ?? vesselType) : vesselType;
  const parts = [typeLabel, vesselLabel, name]
    .map((p) => p?.trim())
    .filter((p): p is string => Boolean(p));
  return {
    id: `ukmto:${u.id}`,
    source: "ukmto",
    at,
    title: parts.join(" · "),
    place: localizeUkmtoPlaceText(u.place?.trim() || u.region?.trim() || "", ko ? "ko" : "en"),
    lat: u.lat,
    lng: u.lng,
    sea: seaForPoint(u.lat, u.lng),
    detail: u.detail,
    vesselName: name,
    vesselType: u.vesselType?.trim() || null,
    times: {
      occurredAt: at,
      publishedAt: parseTime(u.utcDateCreated),
      firstSeenAt: parseTime(u.firstSeenAt),
      lastSeenAt: parseTime(u.ingestedAt),
    },
  };
}

/** 출처 표기 이름 (카드·양피지·알림 머리글) */
export function stackSourceName(item: Pick<StackItem, "source"> & { sourceLabel?: string }): string {
  if (item.sourceLabel) return item.sourceLabel;
  if (item.source === "ukmto") return "UKMTO";
  if (item.source === "nga") return "NGA";
  if (item.source === "newfeeds") return "NewFeeds";
  if (item.source === "rss") return "RSS";
  return "Liveuamap";
}

/** 같은 id는 한 번만, 최신순, 상한까지. */
export function mergeStackItems(
  groups: StackItem[][],
  max: number = INCIDENT_STACK_MAX,
): StackItem[] {
  const seen = new Set<string>();
  const out: StackItem[] = [];
  for (const it of groups.flat().sort((a, b) => b.at - a.at)) {
    if (seen.has(it.id)) continue;
    seen.add(it.id);
    out.push(it);
    if (out.length >= max) break;
  }
  return out;
}

export function filterBySea(items: StackItem[], sea: StackSea | null): StackItem[] {
  return sea ? items.filter((i) => i.sea === sea) : items;
}

/** 내 케이스 → 스택 행. 장소 좌표가 없으면 지도에 못 보내므로 넣지 않는다. */
export function stackItemFromCase(c: CaseFile): StackItem | null {
  const place = c.incident?.place;
  if (!place) return null;
  const when = c.incident.occurredAt ?? c.updatedAt ?? c.createdAt ?? null;
  const at = when ? Date.parse(when) : Number.NaN;
  if (!Number.isFinite(at)) return null;
  return {
    id: `case:${c.id}`,
    source: "case",
    at,
    title: c.title?.trim() || c.article.text.slice(0, 80),
    place: place.label,
    lat: place.lat,
    lng: place.lng,
    sea: seaForPoint(place.lat, place.lng),
    caseId: c.id,
    verdict: c.verdict,
  };
}
