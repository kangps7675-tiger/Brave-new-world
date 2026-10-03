/**
 * 올리기 직전 반증(반대·정정) 탐색.
 *
 * - corpus === undefined/null → 미실행 → queried: false
 * - corpus 배열(빈 배열 포함) → 실행함 → queried: true, hitCount = 반대 표현 건수
 * 네트워크 호출이 아니라, 이미 손에 있는 공개 피드·관측 텍스트를 스캔한다.
 */

export type DisconfirmLog = {
  queried: boolean;
  hitCount: number;
  /** 맞은 후보 id (드릴·디버그용, 선택) */
  hitIds?: string[];
};

export type DisconfirmCandidate = {
  id: string;
  text: string;
  occurredAt?: string | null;
};

export type DisconfirmPassInput = {
  claimText: string;
  /**
   * 반증 후보 코퍼스.
   * - omit / null / undefined → 탐색 안 함 (queried: false)
   * - [] 또는 항목 있음 → 탐색함
   */
  corpus?: DisconfirmCandidate[] | null;
  /** 주장 본문·동일 출처는 제외 */
  excludeIds?: Iterable<string>;
  windowHours?: number;
  nowMs?: number;
};

/** 정정·부인·오보·허위경보 등 — KO/EN 공개 보도 표현 */
export const DISCONFIRM_PATTERN =
  /\b(retract(?:ed|s|ion)?|walk(?:ed)?\s*back|denies|denied|denial|false\s*alarm|hoax|unfounded|baseless|misreport(?:ed|ing)?|clarif(?:y|ies|ied|ication)|not\s+(?:attacked|struck|hit)|no\s+(?:strike|attack|casualties)|peace\s*talks?\s*only)\b|정정|오보|부인|철회|허위|사실\s*무근|오인\s*사격|공격\s*없|피격\s*없|경보\s*해제|오발|허위\s*경보/i;

function withinWindow(
  iso: string | null | undefined,
  windowHours: number,
  nowMs: number,
): boolean {
  if (!iso) return true;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return true;
  return nowMs - t <= windowHours * 3600_000;
}

/**
 * 주장 텍스트에 대해 코퍼스에서 반증·정정 표현을 센다.
 * corpus가 없으면 하드코딩 "탐색함"을 쓰지 않고 queried: false.
 */
export function runDisconfirmPass(input: DisconfirmPassInput): DisconfirmLog {
  if (input.corpus == null) {
    return { queried: false, hitCount: 0 };
  }

  const exclude = new Set(input.excludeIds ?? []);
  const windowHours = input.windowHours ?? 72;
  const nowMs = input.nowMs ?? Date.now();
  const claim = input.claimText.trim().toLowerCase();
  const hitIds: string[] = [];

  for (const row of input.corpus) {
    if (!row?.id || exclude.has(row.id)) continue;
    if (!withinWindow(row.occurredAt, windowHours, nowMs)) continue;
    const text = (row.text || "").trim();
    if (!text) continue;
    // 주장 문장 자체 재매칭 방지
    if (claim && text.toLowerCase() === claim) continue;
    if (!DISCONFIRM_PATTERN.test(text)) continue;
    hitIds.push(row.id);
  }

  return {
    queried: true,
    hitCount: hitIds.length,
    hitIds: hitIds.length ? hitIds.slice(0, 12) : undefined,
  };
}

/** 어댑터 공통 — 명시 로그가 있으면 그대로, 없으면 corpus로 실행 */
export function resolveDisconfirmLog(input: {
  claimText: string;
  disconfirmLog?: DisconfirmLog | null;
  disconfirmCorpus?: DisconfirmCandidate[] | null;
  excludeIds?: Iterable<string>;
  windowHours?: number;
  nowMs?: number;
}): DisconfirmLog {
  if (input.disconfirmLog) return input.disconfirmLog;
  return runDisconfirmPass({
    claimText: input.claimText,
    corpus: input.disconfirmCorpus,
    excludeIds: input.excludeIds,
    windowHours: input.windowHours,
    nowMs: input.nowMs,
  });
}

export type LooseNewsLike = {
  id?: string;
  title?: string | null;
  titleKo?: string | null;
  summary?: string | null;
  body?: string | null;
  pubDate?: string | null;
  occurredAt?: string | null;
  publishedAt?: string | null;
};

/** RSS / LiveUA 등 느슨한 피드를 반증 후보로 */
export function candidatesFromNewsLike(
  items: readonly LooseNewsLike[] | null | undefined,
): DisconfirmCandidate[] {
  if (!items?.length) return [];
  const out: DisconfirmCandidate[] = [];
  for (const item of items) {
    const id = String(item.id ?? "").trim();
    if (!id) continue;
    const text = [item.title, item.titleKo, item.summary, item.body]
      .map((s) => (typeof s === "string" ? s.trim() : ""))
      .filter(Boolean)
      .join(" · ");
    if (!text) continue;
    out.push({
      id,
      text,
      occurredAt: item.occurredAt ?? item.pubDate ?? item.publishedAt ?? null,
    });
  }
  return out;
}
