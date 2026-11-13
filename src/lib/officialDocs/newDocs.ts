import type { PolledDoc } from "@/lib/officialDocs/matchPolled";

/** 속보창에 올릴 만한 종류. 일반 보도자료는 양이 많아 여기서는 뺀다(문서함 몫). */
const SHOWN_KINDS = new Set(["joint-statement", "treaty", "factsheet", "readout", "statement"]);
const MAX_DOCS = 12;
const WINDOW_MS = 7 * 86_400_000;

/** 최근 7일 안에 새로 모인 주요 공식 문서(공동성명·조약·팩트시트·회담 요약·성명), 최신순 */
export function pickNewDocs(docs: readonly PolledDoc[], now: number): PolledDoc[] {
  const since = now - WINDOW_MS;
  return docs
    .filter((d) => SHOWN_KINDS.has(d.kind) && Date.parse(d.publishedAt ?? "") >= since)
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
    .slice(0, MAX_DOCS);
}

