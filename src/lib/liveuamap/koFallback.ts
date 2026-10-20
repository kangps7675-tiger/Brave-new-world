import { isMostlyEnglish } from "@/lib/koreanTranslate";
import type { LiveuamapEvent } from "@/lib/liveuamap/types";

/**
 * liveuamap 이벤트의 한글 보강.
 *
 * 서버가 수집할 때 titleKo·bodyKo를 번역해 넣지만(fetchLiveuamap.translateEventsKo),
 * 번역 엔드포인트가 실패하면 번역기는 원문을 그대로 돌려줘서 titleKo가 영어인 채로 남거나 비어 있다.
 * 그 이벤트를 화면(속보함·양피지·사건 스택)에서 한글로 보이게 클라이언트에서 한 번 더 번역한다.
 */

/** 한글 제목이 비었거나 영어 그대로(=번역 실패)인지 */
export function titleNeedsKo(ev: Pick<LiveuamapEvent, "title" | "titleKo">): boolean {
  if (!ev.title?.trim()) return false;
  const ko = ev.titleKo?.trim();
  return !ko || isMostlyEnglish(ko);
}

export function bodyNeedsKo(ev: Pick<LiveuamapEvent, "body" | "bodyKo">): boolean {
  if (!ev.body?.trim()) return false;
  const ko = ev.bodyKo?.trim();
  return !ko || isMostlyEnglish(ko);
}

export type KoPatch = { titleKo?: string; bodyKo?: string };

/** 번역 결과를 이벤트에 덮어 쓴다. 이미 한글이 있거나 번역이 원문과 같으면 건드리지 않는다. */
export function applyKoPatches(
  events: LiveuamapEvent[],
  patches: ReadonlyMap<string, KoPatch>,
): LiveuamapEvent[] {
  if (patches.size === 0) return events;
  let changed = false;
  const out = events.map((ev) => {
    const p = patches.get(ev.id);
    if (!p) return ev;
    const titleKo = p.titleKo && titleNeedsKo(ev) && !isMostlyEnglish(p.titleKo) ? p.titleKo : ev.titleKo;
    const bodyKo = p.bodyKo && bodyNeedsKo(ev) && !isMostlyEnglish(p.bodyKo) ? p.bodyKo : ev.bodyKo;
    if (titleKo === ev.titleKo && bodyKo === ev.bodyKo) return ev;
    changed = true;
    return { ...ev, titleKo, bodyKo };
  });
  return changed ? out : events;
}
