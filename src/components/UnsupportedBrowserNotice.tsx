"use client";

import { useEffect, useState } from "react";
import type { WebglSupport } from "@/lib/webglSupport";

/**
 * WebGL2 미지원 안내 (P0-1).
 *
 * `maplibre-gl` v5는 WebGL2를 요구한다. 없으면 지도는 렌더되지 않는다.
 * 예전에는 이 경우 **검은 화면**만 남았다 — 사용자는 앱이 고장난 줄 안다.
 *
 * 설계 원칙: **완전한 빈손으로 돌려보내지 않는다.**
 * 지도는 못 그려도 왜 안 되는지, 무엇을 하면 되는지, 지금 세계에서 무슨 일이
 * 벌어지는지(텍스트 브리핑)는 줄 수 있다.
 *
 * 이 컴포넌트는 LocaleContext 바깥(부트 최상단)에서 렌더되므로 언어를 자체 판별한다.
 */

type Props = {
  support: WebglSupport;
};

type Brief = { title: string; source: string; at: string };

function detectLang(): "ko" | "en" {
  if (typeof navigator === "undefined") return "ko";
  return /^ko/i.test(navigator.language || "") ? "ko" : "en";
}

const COPY = {
  ko: {
    badge: "렌더 불가",
    title: "이 브라우저에서는 지구본을 표시할 수 없습니다",
    whyNone:
      "브라우저에서 WebGL이 꺼져 있거나 차단되어 있습니다. 3D 지도는 WebGL 없이는 동작하지 않습니다.",
    whyLegacy:
      "이 브라우저는 WebGL 1까지만 지원합니다. 지도 엔진(MapLibre GL v5)은 WebGL 2가 필요합니다.",
    howTitle: "해결 방법",
    how: [
      "Chrome · Edge · Firefox 최신 버전, 또는 Safari 15 이상으로 접속",
      "브라우저 설정에서 「하드웨어 가속」 켜기",
      "chrome://flags 에서 WebGL 관련 항목을 끈 적이 있다면 되돌리기",
      "회사·학교 기기라면 GPU 정책으로 차단되었을 수 있습니다",
    ],
    retry: "다시 확인",
    briefTitle: "지금 세계 — 텍스트 브리핑",
    briefEmpty: "브리핑을 불러오지 못했습니다.",
    briefLoading: "브리핑 불러오는 중…",
  },
  en: {
    badge: "CANNOT RENDER",
    title: "This browser can't display the globe",
    whyNone:
      "WebGL is disabled or blocked in this browser. The 3D map cannot run without it.",
    whyLegacy:
      "This browser supports WebGL 1 only. The map engine (MapLibre GL v5) requires WebGL 2.",
    howTitle: "How to fix",
    how: [
      "Use a recent Chrome, Edge, or Firefox — or Safari 15+",
      "Enable “hardware acceleration” in browser settings",
      "Revert any WebGL-related chrome://flags overrides",
      "On a managed device, GPU access may be blocked by policy",
    ],
    retry: "Check again",
    briefTitle: "World right now — text briefing",
    briefEmpty: "Couldn't load the briefing.",
    briefLoading: "Loading briefing…",
  },
} as const;

export function UnsupportedBrowserNotice({ support }: Props) {
  const [lang, setLang] = useState<"ko" | "en">("ko");
  const [briefs, setBriefs] = useState<Brief[] | null>(null);
  const [briefFailed, setBriefFailed] = useState(false);

  useEffect(() => setLang(detectLang()), []);

  /**
   * 지도는 못 그려도 데이터는 준다. 실패해도 조용히 넘어간다 —
   * 이미 나쁜 상황에 에러를 하나 더 얹지 않는다.
   */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const briefLang = detectLang();
        const res = await fetch(`/api/news-stream?lang=${briefLang}`, { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        // NewsStreamPayload — hero + verified. 구조 변경에 대비해 전부 optional 취급.
        const json = (await res.json()) as {
          hero?: { title?: string; source?: string; pubDate?: string } | null;
          verified?: Array<{ title?: string; source?: string; pubDate?: string }>;
        };
        if (cancelled) return;
        const rows = [...(json.hero ? [json.hero] : []), ...(json.verified ?? [])];
        setBriefs(
          rows
            .slice(0, 6)
            .map((it) => ({
              title: it.title ?? "",
              source: it.source ?? "",
              at: it.pubDate ?? "",
            }))
            .filter((b) => b.title),
        );
      } catch {
        if (!cancelled) setBriefFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const c = COPY[lang];
  const why = support === "webgl1" ? c.whyLegacy : c.whyNone;

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-[#04070f] text-slate-100">
      {/* 별 배경 — WebGL 없이 CSS만으로 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,.55) 50%, transparent 50%)," +
            "radial-gradient(1px 1px at 70% 20%, rgba(255,255,255,.4) 50%, transparent 50%)," +
            "radial-gradient(1px 1px at 45% 70%, rgba(255,255,255,.5) 50%, transparent 50%)," +
            "radial-gradient(1px 1px at 85% 60%, rgba(255,255,255,.35) 50%, transparent 50%)," +
            "radial-gradient(circle at 50% 45%, rgba(30,64,110,.35), transparent 60%)",
          backgroundSize: "260px 260px, 320px 320px, 400px 400px, 300px 300px, 100% 100%",
        }}
      />

      <div className="relative mx-auto flex min-h-full w-[min(92vw,44rem)] flex-col justify-center gap-6 py-12">
        <div className="rounded-2xl border border-amber-400/35 bg-[#0b1020]/90 p-6 shadow-[0_24px_64px_rgba(0,0,0,.6)] backdrop-blur-md">
          <span className="inline-block rounded-full border border-amber-400/45 bg-amber-500/15 px-3 py-1 text-[11px] font-semibold tracking-widest text-amber-200">
            {c.badge}
          </span>

          <h1 className="mt-4 text-xl font-bold leading-snug text-slate-50 sm:text-2xl">
            {c.title}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">{why}</p>

          <h2 className="mt-6 text-sm font-semibold text-sky-200">{c.howTitle}</h2>
          <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-slate-300">
            {c.how.map((line) => (
              <li key={line} className="flex gap-2">
                <span aria-hidden className="mt-[.45em] h-1 w-1 shrink-0 rounded-full bg-sky-400/70" />
                <span>{line}</span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="tap-target mt-6 min-h-[44px] rounded-full border border-sky-300/50 bg-sky-500/20 px-5 py-2 text-sm font-semibold text-sky-50 transition hover:border-sky-200/70 hover:bg-sky-500/30"
          >
            {c.retry}
          </button>
        </div>

        {/* 지도 대신 텍스트로라도 */}
        <div className="rounded-2xl border border-slate-500/25 bg-[#080d1a]/85 p-6 backdrop-blur-md">
          <h2 className="text-sm font-semibold tracking-wide text-slate-200">
            {c.briefTitle}
          </h2>
          {briefs == null && !briefFailed ? (
            <p className="mt-3 text-sm text-slate-500">{c.briefLoading}</p>
          ) : null}
          {briefFailed || briefs?.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">{c.briefEmpty}</p>
          ) : null}
          {briefs?.length ? (
            <ul className="mt-3 space-y-3">
              {briefs.map((b, i) => (
                <li key={`${b.title}-${i}`} className="border-l-2 border-sky-500/40 pl-3">
                  <p className="text-sm leading-snug text-slate-100">{b.title}</p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {[b.source, b.at].filter(Boolean).join(" · ")}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}
