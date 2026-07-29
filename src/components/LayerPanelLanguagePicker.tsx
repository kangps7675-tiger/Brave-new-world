"use client";

import { memo, useState } from "react";
import { t } from "@/lib/uiStrings";
import type { LabelLanguage } from "@/lib/layerPrefs";

type LayerPanelLanguagePickerProps = {
  initialLang: LabelLanguage;
  onChange: (lang: LabelLanguage) => void;
};

export const LayerPanelLanguagePicker = memo(function LayerPanelLanguagePicker({
  initialLang,
  onChange,
}: LayerPanelLanguagePickerProps) {
  const [lang, setLang] = useState(initialLang);

  function pick(next: LabelLanguage) {
    setLang(next);
    onChange(next);
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-black/25 p-3">
      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
        {t("displayLanguage", lang)}
      </p>
      <p className="mt-1 text-meta text-slate-600">{t("displayLanguageHint", lang)}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => pick("en")}
          className={`rounded-lg border px-2 py-2 text-xs transition ${
            lang === "en"
              ? "border-sky-300/60 bg-sky-300/15 text-sky-50"
              : "border-slate-700/80 bg-black/20 text-slate-400 hover:border-slate-600 hover:text-slate-200"
          }`}
        >
          {t("english", lang)}
        </button>
        <button
          type="button"
          onClick={() => pick("ko")}
          className={`rounded-lg border px-2 py-2 text-xs transition ${
            lang === "ko"
              ? "border-sky-300/60 bg-sky-300/15 text-sky-50"
              : "border-slate-700/80 bg-black/20 text-slate-400 hover:border-slate-600 hover:text-slate-200"
          }`}
        >
          {t("korean", lang)}
        </button>
      </div>
    </div>
  );
});
