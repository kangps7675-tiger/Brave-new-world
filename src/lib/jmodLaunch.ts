/**
 * 일본 방위성 「北朝鮮のミサイル等関連情報」 발표문 → 비행거리·최고고도·낙하 영역.
 * 2026-11-12 실제 발표 3건(2025-11-07, 2026-03-14, 2026-09-20)과 목록 페이지로 구조를 확인했다.
 *  - 발표문에는 좌표가 없다. 발사 지점은 "북한 서안 부근", 낙하는 "일본해의 우리나라 EEZ 밖"처럼 영역으로만 적힌다.
 *  - 그래서 점을 찍지 않고, 숫자(비행거리·고도)와 영역 서술만 출처를 붙여 보여 준다.
 *  - "約450kmを超えて"는 정확값이 아니라 하한이라 `distanceAtLeast`로 따로 둔다.
 */

export type JmodReport = {
  url: string;
  title: string;
  /** 발사 시각(UTC ISO). 일본 표준시 "12時34分頃"를 변환했다. 못 읽으면 null */
  launchAt: string | null;
  distanceKm?: number;
  distanceAtLeast?: boolean;
  apogeeKm?: number;
  /** "北朝鮮西岸" 같은 발사 지점 서술(원문 그대로) */
  launchPlace?: string;
  /** 낙하 서술(원문 그대로) */
  landing?: string;
  /** 낙하가 일본 EEZ 밖이라고 밝혔는가(true) / 안이거나 못 읽음(null) */
  outsideJapanEez: boolean | null;
};

export type JmodListItem = { title: string; url: string; date: string };

const norm = (s: string) => s.normalize("NFKC");

/** 목록 페이지에서 북한 미사일 관련 항목만. 연도는 주소(/news/2026/10/29d.html)에서 읽는다. */
export function parseJmodList(html: string): JmodListItem[] {
  const out: JmodListItem[] = [];
  const seen = new Set<string>();
  for (const m of html.matchAll(/<a\b[^>]*href="(\/j\/press\/news\/(\d{4})\/(\d{2})\/(\d{2})[a-z]?\.html)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const title = norm(m[5].replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
    if (!/北朝鮮のミサイル/.test(title) || seen.has(m[1])) continue;
    seen.add(m[1]);
    out.push({ title, url: `https://www.mod.go.jp${m[1]}`, date: `${m[2]}-${m[3]}-${m[4]}` });
  }
  return out;
}

/** 상세 페이지 HTML에서 발표 본문 줄만 */
function bodyText(html: string): string {
  return norm(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, "\n"));
}

export function parseJmodReport(html: string, item: JmodListItem): JmodReport | null {
  const text = bodyText(html);
  const flat = text.replace(/\s+/g, " ");
  const t = /(\d{1,2})時(\d{1,2})分頃/.exec(flat);
  let launchAt: string | null = null;
  if (t) {
    const [y, mo, d] = item.date.split("-").map(Number);
    const ms = Date.UTC(y, mo - 1, d, Number(t[1]) - 9, Number(t[2]));
    launchAt = new Date(ms).toISOString();
  }
  const apogee = /最高高度約?\s*([\d,]+)\s*km/.exec(flat);
  const dist = /約\s*([\d,]+)\s*km(?:程度)?(を超えて)?\s*飛翔/.exec(flat);
  const place = /北朝鮮([^、。]{0,6}?)(?:付近)?から/.exec(flat);
  const landing = /落下(?:した|し)(?:の|たもの)?は?、?([^。]{2,60}?)(?:と推定|であると推定|に落下したと推定)/.exec(flat) ?? /([^。、]{2,40}に落下したと推定)/.exec(flat);
  const landingText = landing ? landing[1].replace(/^[にはのを\s]+/, "").trim() : undefined;
  if (!dist && !apogee && !landingText) return null;
  const outside = landingText ? (/EEZ\)?外/.test(landingText.replace(/[（）]/g, ")")) || /排他的経済水域\)?\s*\(?ＥＥＺ?\)?外/.test(landingText) ? true : null) : null;
  const num = (s?: string) => (s ? Number(s.replace(/,/g, "")) : undefined);
  return {
    url: item.url,
    title: item.title,
    launchAt,
    distanceKm: num(dist?.[1]),
    distanceAtLeast: dist ? Boolean(dist[2]) : undefined,
    apogeeKm: num(apogee?.[1]),
    launchPlace: place ? `北朝鮮${place[1]}` : undefined,
    landing: landingText,
    outsideJapanEez: outside,
  };
}

const KP_LAUNCH = /(north korea|dprk|pyongyang|북한|조선|北朝鮮)/i;

/** 후보 둘이 이 시간보다 가깝게 붙어 있으면 어느 쪽 속보인지 가를 수 없다고 본다 */
const AMBIGUOUS_GAP_MS = 3 * 3600_000;

/**
 * 속보가 북한 발사 글이면, 발사 시각이 속보 12시간 전~2시간 후인 방위성 발표 중 가장 가까운 것.
 * 창 안에 발표가 둘 이상이고 가장 가까운 것과 그다음의 차이가 3시간 미만이면(같은 날 두 번 쏜 경우),
 * 잘못 붙이느니 붙이지 않는다 — 비행거리·낙하 해역이 다른 발사의 것으로 바뀌어 보이면 안 된다.
 */
export function jmodReportForFlash(text: string, at: number, reports: readonly JmodReport[]): JmodReport | null {
  if (!KP_LAUNCH.test(text) || !/(launch|fired|fire|test|발사|ミサイル)/i.test(text) || !Number.isFinite(at)) return null;
  const inWindow: { r: JmodReport; gap: number }[] = [];
  for (const r of reports) {
    const l = r.launchAt ? Date.parse(r.launchAt) : NaN;
    if (!Number.isFinite(l) || l < at - 12 * 3600_000 || l > at + 2 * 3600_000) continue;
    inWindow.push({ r, gap: Math.abs(l - at) });
  }
  inWindow.sort((a, b) => a.gap - b.gap);
  if (inWindow.length === 0) return null;
  if (inWindow.length > 1 && inWindow[1].gap - inWindow[0].gap < AMBIGUOUS_GAP_MS) return null;
  return inWindow[0].r;
}
