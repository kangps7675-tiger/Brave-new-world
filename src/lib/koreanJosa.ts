/**
 * 한글 조사 선택 — 받침 유무로 이/가, 을/를, 은/는, 과/와.
 * 양피지·인사이트 템플릿에서 `이(가)` 플레이스홀더를 없애기 위함.
 */

function lastHangul(word: string): string | null {
  const chars = [...word.trim()].reverse();
  for (const ch of chars) {
    if (/[가-힣]/.test(ch)) return ch;
  }
  return null;
}

/** 마지막 한글 음절에 받침이 있으면 true. 한글이 없으면 false(가/를/는 쪽). */
export function hasBatchim(word: string): boolean {
  const ch = lastHangul(word);
  if (!ch) return false;
  return (ch.charCodeAt(0) - 0xAC00) % 28 !== 0;
}

type JosaPair = "이/가" | "을/를" | "은/는" | "과/와" | "으로/로";

/**
 * `word` + 알맞은 조사. 예: josa("대만", "이/가") → "대만이"
 */
export function josa(word: string, pair: JosaPair): string {
  const trimmed = word.trim();
  if (!trimmed) return trimmed;
  const batchim = hasBatchim(trimmed);
  if (pair === "으로/로") {
    // ㄹ 받침은 '로'
    const ch = lastHangul(trimmed);
    const jong =
      ch != null ? (ch.charCodeAt(0) - 0xAC00) % 28 : 0;
    const useEuro = batchim && jong !== 8; // 8 = ㄹ
    return `${trimmed}${useEuro ? "으로" : "로"}`;
  }
  const [withBatchim, withoutBatchim] = pair.split("/") as [string, string];
  return `${trimmed}${batchim ? withBatchim : withoutBatchim}`;
}
