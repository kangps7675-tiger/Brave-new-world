"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { t, type UiStringKey } from "@/lib/uiStrings";

type LocaleContextValue = {
  lang: LabelLanguage;
  t: (key: UiStringKey) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  lang,
  children,
}: {
  lang: LabelLanguage;
  children: ReactNode;
}) {
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <LocaleContext.Provider
      value={{
        lang,
        t: (key) => t(key, lang),
      }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    return {
      lang: "ko",
      t: (key) => t(key, "ko"),
    };
  }
  return ctx;
}
