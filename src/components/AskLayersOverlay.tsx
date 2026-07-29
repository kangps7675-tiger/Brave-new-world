"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { LayerPrefs } from "@/lib/layerPrefs";
import { useDialog } from "@/hooks/useDialog";

export type AskLayersApiResult = {
  intent: string | null;
  labelKo: string;
  labelEn: string;
  reply: string;
  patch: Record<string, boolean>;
  fly: { lat: number; lng: number; altitude: number } | null;
  chips: Array<{ key: string; label: string }>;
  source: "rules" | "llm" | "fallback";
};

export type AskLayersApplyPayload = {
  patch: Partial<LayerPrefs>;
  fly: { lat: number; lng: number; altitude: number } | null;
  intent: string | null;
};

type AskLayersOverlayProps = {
  open: boolean;
  lang: LabelLanguage;
  viewerMode?: "conflict" | "economy";
  onClose: () => void;
  onApply: (payload: AskLayersApplyPayload) => void;
};

const EXAMPLES_KO = ["홍해", "이란", "우크라", "오늘 핫한 곳"] as const;
const EXAMPLES_EN = ["Red Sea", "Iran", "Ukraine", "Today hot"] as const;
const EXAMPLES_ECON_KO = ["호르무즈", "수에즈", "항로", "오늘 핫한 곳"] as const;
const EXAMPLES_ECON_EN = ["Hormuz", "Suez", "Shipping", "Today hot"] as const;

export function AskLayersOverlay({
  open,
  lang,
  viewerMode = "conflict",
  onClose,
  onApply,
}: AskLayersOverlayProps) {
  /** 이미 Escape·초기 포커스가 있었지만 트랩이 없었다. 입력창에 포커스를 준다 (P1-7) */
  const dialogRef = useDialog<HTMLDivElement>({ open: true, onClose, initialFocus: "input" });
  const titleId = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AskLayersApiResult | null>(null);
  const en = lang === "en";

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setError(null);
    setResult(null);
    setLoading(false);
    const t = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape") {
        ev.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const submit = useCallback(
    async (raw: string) => {
      const q = raw.trim();
      if (!q || loading) return;
      setLoading(true);
      setError(null);
      setResult(null);
      try {
        const res = await fetch("/api/ask-layers", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            query: q,
            lang: en ? "en" : "ko",
            mode: viewerMode,
          }),
        });
        const data = (await res.json()) as AskLayersApiResult & { error?: string };
        if (!res.ok && !data.reply) {
          setError(
            en
              ? data.error || "Request failed"
              : data.error || "요청에 실패했습니다",
          );
          return;
        }
        setResult(data);
        const patch: Partial<LayerPrefs> = {};
        for (const [k, v] of Object.entries(data.patch ?? {})) {
          if (typeof v === "boolean") {
            (patch as Record<string, boolean>)[k] = v;
          }
        }
        if (Object.keys(patch).length > 0 || data.fly) {
          onApply({
            patch,
            fly: data.fly,
            intent: data.intent,
          });
        }
      } catch {
        setError(en ? "Network error" : "네트워크 오류");
      } finally {
        setLoading(false);
      }
    },
    [en, loading, onApply, viewerMode],
  );

  if (!open) return null;

  const examples = viewerMode === "economy"
    ? en
      ? EXAMPLES_ECON_EN
      : EXAMPLES_ECON_KO
    : en
      ? EXAMPLES_EN
      : EXAMPLES_KO;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        aria-label={en ? "Close" : "닫기"}
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-md"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-[1] w-full max-w-lg rounded-2xl border border-white/15 bg-slate-900/75 p-4 shadow-2xl backdrop-blur-xl sm:p-5"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="text-sm font-semibold text-sky-50 sm:text-base">
              {en ? "Ask → turn on layers" : "묻기 → 레이어 켜기"}
            </h2>
            <p className="mt-1 text-meta leading-relaxed text-sky-100/55 sm:text-xs">
              {viewerMode === "economy"
                ? en
                  ? "Name a chokepoint or trade risk (Hormuz, Suez…). Commercial shipping layers only — no military air/ships."
                  : "초크·물류를 짧게 말하면 항로·에너지·민간 AIS만 맞춥니다. 군용 항공기·함정은 켜지 않습니다."
                : en
                  ? "Name a theater or risk (Red Sea, Iran…). We’ll match the map layers."
                  : "전장·위험을 짧게 말하면 관련 지도 레이어를 맞춥니다. 세밀 조정은 ≡ 패널."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-xs text-sky-100/50 transition hover:bg-white/10 hover:text-sky-50"
          >
            Esc
          </button>
        </div>

        <div className="mb-3 flex flex-wrap gap-1.5">
          {examples.map((ex) => (
            <button
              key={ex}
              type="button"
              disabled={loading}
              onClick={() => {
                setQuery(ex);
                void submit(ex);
              }}
              className="rounded-full border border-sky-300/25 bg-sky-400/10 px-2.5 py-1 text-meta text-sky-100/85 transition hover:border-sky-300/45 hover:bg-sky-400/20 disabled:opacity-40"
            >
              {ex}
            </button>
          ))}
        </div>

        <textarea
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={3}
          disabled={loading}
          placeholder={
            en ? "e.g. What’s hot in the Red Sea?" : "예: 홍해 후티 상황 보여줘"
          }
          className="w-full resize-none rounded-xl border border-white/12 bg-black/35 px-3 py-2.5 text-sm text-sky-50 outline-none placeholder:text-sky-100/30 focus:border-sky-400/40"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit(query);
            }
          }}
        />

        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-xs text-sky-100/60 hover:bg-white/5"
          >
            {en ? "Close" : "닫기"}
          </button>
          <button
            type="button"
            disabled={loading || !query.trim()}
            onClick={() => void submit(query)}
            className="rounded-lg border border-sky-300/35 bg-sky-500/25 px-3.5 py-1.5 text-xs font-medium text-sky-50 transition hover:bg-sky-500/40 disabled:opacity-40"
          >
            {loading
              ? en
                ? "Matching…"
                : "맞추는 중…"
              : en
                ? "Apply layers"
                : "레이어 맞추기"}
          </button>
        </div>

        {error ? (
          <p className="mt-3 text-xs text-rose-300/90" role="alert">
            {error}
          </p>
        ) : null}

        {result ? (
          <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-3">
            <p className="text-sm leading-relaxed text-sky-50/95">{result.reply}</p>
            {result.chips.length > 0 ? (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {result.chips.map((chip) => (
                  <span
                    key={chip.key}
                    className="rounded-md border border-emerald-300/25 bg-emerald-400/10 px-2 py-0.5 text-micro text-emerald-100/90"
                  >
                    {chip.label}
                  </span>
                ))}
              </div>
            ) : null}
            <p className="mt-2 text-micro text-sky-100/40">
              {result.source === "rules"
                ? en
                  ? "Matched by keywords"
                  : "키워드로 맞춤"
                : result.source === "llm"
                  ? en
                    ? "Matched with light AI"
                    : "짧은 AI로 맞춤"
                  : en
                    ? "Best-effort guess"
                    : "추정으로 맞춤"}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
