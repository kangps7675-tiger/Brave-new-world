"use client";

import { useEffect, useState } from "react";
import { loadLayerPrefs, type LabelLanguage } from "@/lib/layerPrefs";
import { publishLandingLanguage, readLandingLanguageChoice } from "@/lib/landingLanguage";

/**
 * 랜딩 상단 네비의 언어 선택. 예전 전체 화면 언어 창 대신 여기만 고른다.
 */
export function LandingLanguageNav() {
  const [lang, setLang] = useState<LabelLanguage>("ko");

  useEffect(() => {
    setLang(readLandingLanguageChoice() ?? loadLayerPrefs().labelLanguage);
  }, []);

  return (
    <div
      role="group"
      aria-label={lang === "en" ? "Language" : "언어"}
      className="flex items-center rounded-md border border-white/15 p-0.5 text-[13px] font-semibold"
    >
      {(
        [
          ["ko", "한국어"],
          ["en", "EN"],
        ] as const
      ).map(([id, label]) => (
        <button
          key={id}
          type="button"
          aria-pressed={lang === id}
          onClick={() => {
            setLang(id);
            publishLandingLanguage(id);
          }}
          className={
            lang === id
              ? "rounded bg-[#f5c451] px-2.5 py-1 text-[#05080d]"
              : "rounded px-2.5 py-1 text-[#c9d5dd] hover:text-white"
          }
        >
          {label}
        </button>
      ))}
    </div>
  );
}
