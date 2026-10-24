"use client";

import { useEffect, useState } from "react";
import { markLangChoiceDone } from "@/components/globe/formatters";
import {
  loadLayerPrefs,
  saveLayerPrefs,
  type LabelLanguage,
} from "@/lib/layerPrefs";

/** 이번 탭에서 랜딩 네비가 고른 언어. dev는 레이어 prefs를 저장하지 않아서 따로 둔다. */
const LANDING_LANG_KEY = "straitdesk-landing-lang";

export const LANDING_LANG_EVENT = "straitdesk:landing-lang";

export function readLandingLanguageChoice(): LabelLanguage | null {
  if (typeof window === "undefined") return null;
  try {
    const value = sessionStorage.getItem(LANDING_LANG_KEY);
    return value === "ko" || value === "en" ? value : null;
  } catch {
    return null;
  }
}

/** 랜딩 네비에서 언어를 고르거나, 지구본을 열 때 지금 언어를 확정한다. */
export function publishLandingLanguage(lang: LabelLanguage) {
  try {
    sessionStorage.setItem(LANDING_LANG_KEY, lang);
  } catch {
    // ignore
  }
  const prefs = loadLayerPrefs();
  if (prefs.labelLanguage !== lang) {
    saveLayerPrefs({ ...prefs, labelLanguage: lang });
  }
  markLangChoiceDone();
  if (typeof document !== "undefined") document.documentElement.lang = lang;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<LabelLanguage>(LANDING_LANG_EVENT, { detail: lang }));
  }
}

/** 랜딩 전 구간이 같은 언어를 본다. 첫 그림은 한국어로 맞추고, 저장된 선택은 마운트 뒤에 반영한다. */
export function useLandingLanguage(): LabelLanguage {
  const [lang, setLang] = useState<LabelLanguage>("ko");
  useEffect(() => {
    const read = () => {
      const next = readLandingLanguageChoice() ?? loadLayerPrefs().labelLanguage;
      setLang(next);
      document.documentElement.lang = next;
    };
    read();
    window.addEventListener(LANDING_LANG_EVENT, read);
    return () => window.removeEventListener(LANDING_LANG_EVENT, read);
  }, []);
  return lang;
}
