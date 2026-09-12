"use client";

import { useEffect, useMemo, useState } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { isMostlyEnglish, isMostlyKorean, translateTextsBatch } from "@/lib/koreanTranslate";

type TextEntry = { key: string; text: string };

/** 사이드바·패널 표시용 — 제목·본문을 선택 언어로 번역 (캐시·배치) */
export function useLocalizedTextMap(
  entries: TextEntry[],
  lang: LabelLanguage,
): Map<string, string> {
  const signature = useMemo(
    () => `${lang}\n${entries.map((e) => `${e.key}\0${e.text}`).join("\n")}`,
    [entries, lang],
  );
  const [map, setMap] = useState<Map<string, string>>(() => new Map());

  useEffect(() => {
    if (entries.length === 0) {
      setMap(new Map());
      return;
    }

    let cancelled = false;

    void (async () => {
      const next = new Map<string, string>();
      const needsWork: TextEntry[] = [];
      for (const entry of entries) {
        const trimmed = entry.text.trim();
        if (!trimmed) {
          next.set(entry.key, entry.text);
          continue;
        }
        if (lang === "ko" && isMostlyKorean(trimmed)) {
          next.set(entry.key, entry.text);
          continue;
        }
        if (lang === "en" && isMostlyEnglish(trimmed)) {
          next.set(entry.key, entry.text);
          continue;
        }
        needsWork.push(entry);
      }

      // 이미 목표 언어인 항목은 즉시 반영 (영문 깜빡임 완화)
      if (!cancelled && next.size > 0) setMap(new Map(next));

      const batchSize = 20;
      for (let i = 0; i < needsWork.length; i += batchSize) {
        const slice = needsWork.slice(i, i + batchSize);
        const translated = await translateTextsBatch(
          slice.map((e) => e.text),
          lang,
        );
        slice.forEach((entry, idx) => {
          next.set(entry.key, translated[idx] ?? entry.text);
        });
        // 배치마다 점진 반영 — 전체 완료까지 영문 고정 방지
        if (!cancelled) setMap(new Map(next));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [signature, entries, lang]);

  return map;
}

export function localizedDisplayText(
  map: Map<string, string>,
  key: string,
  fallback: string,
): string {
  return map.get(key) ?? fallback;
}

/** @deprecated use useLocalizedTextMap */
export function useKoreanTextMap(entries: TextEntry[]): Map<string, string> {
  return useLocalizedTextMap(entries, "ko");
}

/** @deprecated use localizedDisplayText */
export function koreanDisplayText(
  map: Map<string, string>,
  key: string,
  fallback: string,
): string {
  return localizedDisplayText(map, key, fallback);
}
