"use client";

import { memo, useCallback, useEffect, useState } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";
import {
  readUiFontPrefs,
  setUiFontPrefs,
  UI_FONT_PRESETS,
  type UiFontPrefs,
  type UiFontPresetId,
} from "@/lib/fontPrefs";

type UiFontPickerProps = {
  lang: LabelLanguage;
};

export const UiFontPicker = memo(function UiFontPicker({ lang }: UiFontPickerProps) {
  const ko = lang !== "en";
  const [prefs, setPrefs] = useState<UiFontPrefs>({
    presetId: "wanted",
    customFamily: "",
  });
  const [draftCustom, setDraftCustom] = useState("");

  useEffect(() => {
    const stored = readUiFontPrefs();
    setPrefs(stored);
    setDraftCustom(stored.customFamily);
  }, []);

  const apply = useCallback((next: UiFontPrefs) => {
    const saved = setUiFontPrefs(next);
    setPrefs(saved);
    if (next.presetId === "custom") setDraftCustom(saved.customFamily);
  }, []);

  function pick(id: UiFontPresetId) {
    if (id === "custom") {
      apply({
        presetId: "custom",
        customFamily: draftCustom || prefs.customFamily || "Pixeloid Sans",
      });
      return;
    }
    apply({ presetId: id, customFamily: prefs.customFamily });
  }

  function commitCustom() {
    const name = draftCustom.trim();
    if (!name) return;
    apply({ presetId: "custom", customFamily: name });
  }

  const readable = UI_FONT_PRESETS.filter((p) => p.group === "readable");
  const character = UI_FONT_PRESETS.filter((p) => p.group === "character");
  const system = UI_FONT_PRESETS.filter((p) => p.group === "system");

  return (
    <div className="rounded-xl border border-slate-800 bg-black/25 p-3">
      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
        {ko ? "UI 글꼴" : "UI font"}
      </p>
      <p className="mt-1 text-[11px] text-slate-600">
        {ko
          ? "본문·패널만 바뀝니다. 양피지·숫자 모노는 유지. 한글 없는 폰트는 시스템 폴백."
          : "UI only — parchment & mono stay. Non-Hangul fonts fall back for Korean."}
      </p>

      <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {ko ? "가독성" : "Readable"}
      </p>
      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
        {readable.map((p) => (
          <PresetBtn
            key={p.id}
            active={prefs.presetId === p.id}
            label={ko ? p.labelKo : p.labelEn}
            onClick={() => pick(p.id)}
            styleFont={p.googleFamily ?? undefined}
          />
        ))}
      </div>

      <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {ko ? "개성" : "Character"}
      </p>
      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
        {character.map((p) => (
          <PresetBtn
            key={p.id}
            active={prefs.presetId === p.id}
            label={ko ? p.labelKo : p.labelEn}
            onClick={() => pick(p.id)}
            styleFont={p.googleFamily ?? undefined}
          />
        ))}
        {system.map((p) => (
          <PresetBtn
            key={p.id}
            active={prefs.presetId === p.id}
            label={ko ? p.labelKo : p.labelEn}
            onClick={() => pick(p.id)}
          />
        ))}
      </div>

      <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {ko ? "커스텀 · Google Fonts 이름" : "Custom · Google Fonts name"}
      </p>
      <div className="mt-1.5 flex gap-1.5">
        <input
          type="text"
          value={draftCustom}
          onChange={(e) => setDraftCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitCustom();
          }}
          placeholder={ko ? "예: Pixeloid Sans" : "e.g. Pixeloid Sans"}
          className="min-w-0 flex-1 rounded-lg border border-slate-700/80 bg-black/30 px-2.5 py-2 text-[12px] text-slate-100 placeholder:text-slate-600"
          aria-label={ko ? "Google Fonts 패밀리 이름" : "Google Fonts family name"}
        />
        <button
          type="button"
          onClick={commitCustom}
          className={`shrink-0 rounded-lg border px-3 py-2 text-[11px] font-medium transition ${
            prefs.presetId === "custom"
              ? "border-sky-300/60 bg-sky-300/15 text-sky-50"
              : "border-slate-700/80 bg-black/20 text-slate-300 hover:border-slate-500"
          }`}
        >
          {ko ? "적용" : "Apply"}
        </button>
      </div>
      <p className="mt-1.5 text-[10px] leading-4 text-slate-600">
        {ko
          ? "fonts.google.com 표시 이름을 그대로. 없으면 폴백·로드 실패할 수 있음."
          : "Paste the exact family name from fonts.google.com. Missing fonts fall back."}
      </p>
    </div>
  );
});

function PresetBtn({
  active,
  label,
  onClick,
  styleFont,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  styleFont?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={styleFont ? { fontFamily: `"${styleFont}", sans-serif` } : undefined}
      className={`rounded-lg border px-2 py-2 text-left text-[11px] transition ${
        active
          ? "border-sky-300/60 bg-sky-300/15 text-sky-50"
          : "border-slate-700/80 bg-black/20 text-slate-400 hover:border-slate-600 hover:text-slate-200"
      }`}
    >
      {label}
    </button>
  );
}
