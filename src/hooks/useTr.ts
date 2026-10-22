"use client";

import { useCallback, useMemo } from "react";
import { useLocalizedTextMap } from "@/hooks/useLocalizedTextMap";
import type { LabelLanguage } from "@/lib/layerPrefs";

/**
 * 속보창 표시용 — 한글 모드에서는 화면에 나오는 모든 본문·제목이 한글이 되게 한다.
 * 서버가 채운 titleKo/bodyKo가 비었거나 영어 그대로인 경우(번역 실패)를 여기서 메운다.
 * 이미 한글이면 그대로, 번역이 오기 전까지는 원문을 보여 준다.
 */
export function useTr(
  texts: ReadonlyArray<string | null | undefined>,
  lang: LabelLanguage,
): (s: string) => string {
  const entries = useMemo(() => {
    if (lang !== "ko") return [];
    const uniq = [...new Set(texts.map((t) => t?.trim()).filter((t): t is string => Boolean(t)))];
    return uniq.map((text) => ({ key: text, text }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, texts.join("\u0001")]);
  const map = useLocalizedTextMap(entries, lang);
  return useCallback((s: string) => (lang === "ko" ? (map.get(s.trim()) ?? s) : s), [lang, map]);
}
