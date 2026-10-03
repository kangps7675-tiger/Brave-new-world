"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type {
  SitrepRssRef,
  TheaterSitrepDoc,
  TheaterSitrepRow,
} from "@/lib/theaterReport/types";
import { Z } from "@/lib/uiStack";

type Phase = "writing" | "printed";

type Props = {
  lang: LabelLanguage;
  doc: TheaterSitrepDoc;
  onClose: () => void;
};

function formatWhen(iso: string, en: boolean): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  return new Intl.DateTimeFormat(en ? "en-GB" : "ko-KR", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    hour12: false,
  }).format(t);
}

function kindLabel(kind: TheaterSitrepRow["kind"], en: boolean): string {
  if (en) return kind;
  if (kind === "drone") return "드론";
  if (kind === "missile") return "미사일";
  if (kind === "ground") return "지상";
  return "기타";
}

function casualtyCell(row: TheaterSitrepRow, en: boolean): string {
  const parts: string[] = [];
  if (row.killed != null) parts.push(en ? `${row.killed} killed` : `사망 ${row.killed}`);
  if (row.wounded != null) parts.push(en ? `${row.wounded} wounded` : `부상 ${row.wounded}`);
  return parts.length ? parts.join(" · ") : en ? "unconfirmed" : "미확인";
}

function modeLabel(mode: TheaterSitrepDoc["mode"], en: boolean): string {
  if (mode === "liveua+rss") {
    return en ? "Mode · LiveUA + Tier 1 RSS refs" : "모드 · LiveUA + Tier 1 참고";
  }
  if (mode === "rss-brief") {
    return en ? "Mode · Tier 1 RSS brief (no LiveUA rows)" : "모드 · Tier 1 RSS-brief (LiveUA 없음)";
  }
  return en ? "Mode · empty window" : "모드 · 자료 없음";
}

function RssRefList({
  refs,
  en,
  heading,
}: {
  refs: SitrepRssRef[];
  en: boolean;
  heading: string;
}) {
  if (refs.length === 0) {
    return (
      <p className="mt-3 font-serif text-[12px] text-[#5c4a32]">
        {en ? "No Tier 1 references in this window." : "이 창에 Tier 1 참고가 없습니다."}
      </p>
    );
  }
  return (
    <>
      <h2 className="font-serif text-[13px] font-semibold text-[#1f160c]">{heading}</h2>
      <ul className="mt-3 space-y-2 font-serif text-[11px] leading-relaxed text-[#2c2114]">
        {refs.map((ref) => (
          <li key={`${ref.link}-${ref.id}`}>
            <a
              href={ref.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-[#8a6a3a]/45 underline-offset-2"
            >
              {ref.sourceName}
              {ref.occurredAt ? ` · ${formatWhen(ref.occurredAt, en)}` : ""} — {ref.title}
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}

/** 인쇄 쪽: 표지 + (표|RSS-brief) + 사진 + Tier1 + LiveUA 출처 */
function buildPrintedPages(doc: TheaterSitrepDoc, en: boolean): ReactNode[] {
  const pages: ReactNode[] = [];
  const title = en ? doc.titleEn : doc.titleKo;
  const coverage = en ? doc.coverageNoteEn : doc.coverageNoteKo;

  pages.push(
    <div key="cover" className="flex h-full flex-col justify-between">
      <div>
        <p className="text-[10px] uppercase tracking-[0.18em] text-[#5c4a32]/80">
          {en ? "Theater sitrep · Cesium observatory" : "전황 보고서 · 관측대"}
        </p>
        <h1 className="mt-3 font-serif text-[1.35rem] font-semibold leading-snug text-[#1f160c]">
          {title}
        </h1>
        <p className="mt-2 font-serif text-[12px] leading-relaxed text-[#3d2e1c]/90">
          {en
            ? `${doc.windowHours}-hour window · Generated ${formatWhen(doc.generatedAt, true)} UTC`
            : `${doc.windowHours}시간 창 · 작성 ${formatWhen(doc.generatedAt, false)} UTC`}
        </p>
        <p className="mt-2 font-serif text-[11px] font-semibold text-[#5c4020]">
          {modeLabel(doc.mode, en)}
        </p>
        <p className="mt-4 border-l-2 border-[#8a6a3a]/50 pl-3 font-serif text-[12.5px] leading-relaxed text-[#2c2114]">
          {coverage}
        </p>
        <p className="mt-6 font-serif text-[12px] italic text-[#5c4a32]/85">
          {en
            ? "Casualties/damage only from LiveUA source text. Tier 1 RSS is reference links only."
            : "사상·피해는 LiveUA 원문에 있을 때만. Tier 1 RSS는 참고 링크만입니다."}
        </p>
      </div>
      <p className="font-serif text-[10px] text-[#6b5638]/70">{doc.attribution}</p>
    </div>,
  );

  if (doc.mode === "liveua+rss" && doc.rows.length > 0) {
    const chunkSize = 6;
    for (let i = 0; i < doc.rows.length; i += chunkSize) {
      const chunk = doc.rows.slice(i, i + chunkSize);
      pages.push(
        <div key={`table-${i}`} className="flex h-full flex-col">
          <h2 className="font-serif text-[13px] font-semibold text-[#1f160c]">
            {en ? "Attacks & reported harm" : "공격 · 보도된 피해"}
            {doc.rows.length > chunkSize
              ? ` (${Math.floor(i / chunkSize) + 1})`
              : ""}
          </h2>
          <table className="mt-3 w-full border-collapse font-serif text-[10.5px] leading-snug text-[#1f160c]">
            <thead>
              <tr className="border-b border-[#1f160c]/35 text-left">
                <th className="py-1.5 pr-1 font-semibold">{en ? "When" : "시각"}</th>
                <th className="py-1.5 pr-1 font-semibold">{en ? "Where" : "장소"}</th>
                <th className="py-1.5 pr-1 font-semibold">{en ? "Type" : "유형"}</th>
                <th className="py-1.5 pr-1 font-semibold">{en ? "Casualties" : "사상"}</th>
                <th className="py-1.5 font-semibold">{en ? "Damage" : "물적"}</th>
              </tr>
            </thead>
            <tbody>
              {chunk.map((row) => (
                <tr key={row.id} className="border-b border-[#1f160c]/12 align-top">
                  <td className="py-1.5 pr-1 tabular-nums whitespace-nowrap">
                    {formatWhen(row.occurredAt, en)}
                  </td>
                  <td className="py-1.5 pr-1">
                    <a
                      href={row.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline decoration-[#8a6a3a]/50 underline-offset-2 hover:decoration-[#1f160c]"
                    >
                      {row.place}
                    </a>
                    {row.rssRefs && row.rssRefs.length > 0 ? (
                      <p className="mt-0.5 text-[9px] text-[#6b5638]">
                        {en ? "T1: " : "T1: "}
                        {row.rssRefs.map((ref, idx) => (
                          <span key={ref.id}>
                            {idx > 0 ? " · " : null}
                            <a
                              href={ref.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline decoration-[#8a6a3a]/40"
                            >
                              {ref.sourceName}
                            </a>
                          </span>
                        ))}
                      </p>
                    ) : null}
                  </td>
                  <td className="py-1.5 pr-1 whitespace-nowrap">
                    {kindLabel(row.kind, en)}
                  </td>
                  <td className="py-1.5 pr-1">{casualtyCell(row, en)}</td>
                  <td className="py-1.5">
                    {row.materialDamage ?? (en ? "unconfirmed" : "미확인")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
    }
  } else if (doc.mode === "rss-brief") {
    pages.push(
      <div key="rss-brief" className="flex h-full flex-col">
        <RssRefList
          refs={doc.rssTheaterRefs}
          en={en}
          heading={
            en
              ? "Tier 1 reporting (LiveUA window empty)"
              : "Tier 1 보도 (LiveUA 창 비어 있음)"
          }
        />
        <p className="mt-4 font-serif text-[11px] italic text-[#5c4a32]">
          {en
            ? "No attack table — RSS is not used to invent coordinates or casualty counts."
            : "공격 표 없음 — RSS로 좌표·사상 숫자를 만들지 않습니다."}
        </p>
      </div>,
    );
  } else if (doc.mode === "empty") {
    pages.push(
      <div key="empty" className="flex h-full flex-col justify-center">
        <p className="font-serif text-[13px] text-[#2c2114]">
          {en
            ? "No LiveUA attack rows and no Tier 1 RSS in this window."
            : "이 시간 창에 LiveUA 공격 행과 Tier 1 RSS가 없습니다."}
        </p>
      </div>,
    );
  }

  if (doc.photos.length > 0) {
    pages.push(
      <div key="photos" className="flex h-full flex-col">
        <h2 className="font-serif text-[13px] font-semibold text-[#1f160c]">
          {en ? "Images from Liveuamap items" : "Liveuamap 항목 사진"}
        </h2>
        <div className="mt-3 grid flex-1 grid-cols-2 gap-2 content-start overflow-hidden">
          {doc.photos.slice(0, 6).map((photo) => (
            <a
              key={photo.id}
              href={photo.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block overflow-hidden border border-[#1f160c]/20 bg-[#ebe2d0]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.imageUrl}
                alt={photo.caption}
                className="h-24 w-full object-cover"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
              <p className="px-1.5 py-1 font-serif text-[9.5px] leading-snug text-[#3d2e1c]">
                {photo.caption}
              </p>
            </a>
          ))}
        </div>
      </div>,
    );
  }

  if (doc.mode === "liveua+rss" && doc.rssTheaterRefs.length > 0) {
    pages.push(
      <div key="rss-theater" className="flex h-full flex-col">
        <RssRefList
          refs={doc.rssTheaterRefs}
          en={en}
          heading={
            en
              ? "Tier 1 references (not pinned to a row)"
              : "Tier 1 참고 (핀 미연결)"
          }
        />
      </div>,
    );
  }

  if (doc.rows.length > 0) {
    pages.push(
      <div key="sources" className="flex h-full flex-col">
        <h2 className="font-serif text-[13px] font-semibold text-[#1f160c]">
          {en ? "Liveuamap source note" : "Liveuamap 출처 주기"}
        </h2>
        <ul className="mt-3 space-y-2 font-serif text-[11px] leading-relaxed text-[#2c2114]">
          {doc.rows.slice(0, 10).map((row) => (
            <li key={row.id}>
              <a
                href={row.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-[#8a6a3a]/45 underline-offset-2"
              >
                {formatWhen(row.occurredAt, en)} · {row.place}
              </a>
              {row.viaSource ? (
                <span className="text-[#6b5638]"> · {row.viaSource}</span>
              ) : null}
            </li>
          ))}
        </ul>
        <p className="mt-auto pt-4 font-serif text-[10px] text-[#6b5638]/80">
          {doc.attribution}
        </p>
      </div>,
    );
  }

  return pages;
}

function PaperPage({
  children,
  pageNo,
  total,
}: {
  children: ReactNode;
  pageNo: number;
  total: number;
}) {
  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[2px] border border-[#c4b49a] bg-[#f7f1e4] px-4 py-3 shadow-[inset_0_0_40px_rgba(80,50,20,0.06)]">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 13px, #5c4a32 13px, #5c4a32 14px)",
        }}
      />
      <div className="relative min-h-0 flex-1 overflow-hidden">{children}</div>
      <p className="relative mt-2 text-center font-serif text-[10px] text-[#6b5638]/70">
        — {pageNo} / {total} —
      </p>
    </div>
  );
}

export function TheaterSitrepBook({ lang, doc, onClose }: Props) {
  const en = lang === "en";
  const [phase, setPhase] = useState<Phase>("writing");
  const [spread, setSpread] = useState(0);
  const [mounted, setMounted] = useState(false);

  const pages = useMemo(() => buildPrintedPages(doc, en), [doc, en]);
  const spreadCount = Math.max(1, Math.ceil(pages.length / 2));

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (phase !== "writing") return;
    const timer = window.setTimeout(() => setPhase("printed"), 4200);
    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (phase !== "printed") return;
      if (e.key === "ArrowRight") setSpread((s) => Math.min(spreadCount - 1, s + 1));
      if (e.key === "ArrowLeft") setSpread((s) => Math.max(0, s - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, phase, spreadCount]);

  if (!mounted) return null;

  const leftIdx = spread * 2;
  const rightIdx = leftIdx + 1;
  const title = en ? doc.titleEn : doc.titleKo;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-[#070b10]/78 p-3 backdrop-blur-[2px] sm:p-6"
      style={{ zIndex: Z.immersive }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      data-theater-sitrep-book
    >
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,500;0,600;1,500&family=Noto+Serif+KR:wght@400;600&display=swap"
      />

      <div className="pointer-events-auto flex w-full max-w-5xl flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-micro text-teal-100/85">
            {en
              ? "Reading sitrep · other flashes paused"
              : "전황 보고서 읽는 중 · 다른 타전 일시 정지"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {phase === "writing" ? (
              <button
                type="button"
                className="rounded-sm border border-amber-200/40 bg-[#f3e6c8]/95 px-2.5 py-1 text-micro font-medium text-[#3d2a12]"
                onClick={() => setPhase("printed")}
              >
                {en ? "Skip to print" : "인쇄본으로 스킵"}
              </button>
            ) : null}
            {phase === "printed" ? (
              <>
                <button
                  type="button"
                  className="rounded-sm border border-teal-400/35 bg-[#041018]/90 px-2.5 py-1 text-micro text-teal-50 disabled:opacity-40"
                  disabled={spread <= 0}
                  onClick={() => setSpread((s) => Math.max(0, s - 1))}
                >
                  {en ? "Prev" : "이전"}
                </button>
                <button
                  type="button"
                  className="rounded-sm border border-teal-400/35 bg-[#041018]/90 px-2.5 py-1 text-micro text-teal-50 disabled:opacity-40"
                  disabled={spread >= spreadCount - 1}
                  onClick={() => setSpread((s) => Math.min(spreadCount - 1, s + 1))}
                >
                  {en ? "Next" : "다음"}
                </button>
              </>
            ) : null}
            <button
              type="button"
              className="rounded-sm border border-white/25 bg-black/50 px-2.5 py-1 text-micro text-white"
              onClick={onClose}
            >
              {en ? "Close" : "닫기"}
            </button>
          </div>
        </div>

        <div
          className="relative mx-auto w-full max-w-5xl"
          style={{
            fontFamily: '"Noto Serif KR", "EB Garamond", Georgia, "Times New Roman", serif',
          }}
        >
          {/* 책장 느낌 배경 */}
          <div className="rounded-sm border border-[#3a2814]/80 bg-gradient-to-b from-[#4a3420] to-[#2a1c10] p-2 shadow-2xl sm:p-3">
            {phase === "writing" ? (
              <div className="grid min-h-[min(68vh,34rem)] grid-cols-1 gap-2 md:grid-cols-2">
                <PaperPage pageNo={1} total={2}>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[#5c4a32]/75">
                    {en ? "Drafting…" : "작성 중…"}
                  </p>
                  <h1 className="mt-2 text-[1.2rem] font-semibold text-[#1f160c]">{title}</h1>
                  <div className="theater-sitrep-handwrite mt-5 space-y-2 text-[13px] leading-relaxed text-[#2c2114]">
                    <p>{en ? doc.coverageNoteEn : doc.coverageNoteKo}</p>
                    <p className="italic text-[#5c4a32]">
                      {doc.mode === "rss-brief"
                        ? en
                          ? "LiveUA empty — gathering Tier 1 RSS reference links only…"
                          : "LiveUA 없음 — Tier 1 RSS 참고 링크만 모으는 중…"
                        : en
                          ? "Listing LiveUA attacks, then Tier 1 RSS references…"
                          : "LiveUA 공격 행을 정리한 뒤 Tier 1 RSS 참고를 붙이는 중…"}
                    </p>
                    {doc.mode === "rss-brief"
                      ? doc.rssTheaterRefs.slice(0, 3).map((ref) => (
                          <p key={ref.id} className="text-[12px]">
                            · {ref.sourceName} — {ref.title}
                          </p>
                        ))
                      : doc.rows.slice(0, 3).map((row) => (
                          <p key={row.id} className="text-[12px]">
                            · {formatWhen(row.occurredAt, en)} — {row.place}
                          </p>
                        ))}
                  </div>
                </PaperPage>
                <PaperPage pageNo={2} total={2}>
                  <p className="text-[12px] leading-relaxed text-[#3d2e1c]/90">
                    {en
                      ? "Skip to see the typeset table and Liveuamap images."
                      : "스킵하면 활자 표와 Liveuamap 사진이 있는 인쇄본으로 넘어갑니다."}
                  </p>
                  <p className="mt-6 text-[11px] text-[#6b5638]/80">{doc.attribution}</p>
                </PaperPage>
              </div>
            ) : (
              <div className="grid min-h-[min(68vh,34rem)] grid-cols-1 gap-2 md:grid-cols-2">
                <PaperPage pageNo={leftIdx + 1} total={pages.length}>
                  {pages[leftIdx]}
                </PaperPage>
                <PaperPage pageNo={Math.min(rightIdx + 1, pages.length)} total={pages.length}>
                  {pages[rightIdx] ?? (
                    <p className="font-serif text-[12px] italic text-[#6b5638]/70">
                      {en ? "End of sitrep." : "보고서 끝."}
                    </p>
                  )}
                </PaperPage>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        [data-theater-sitrep-book] .theater-sitrep-handwrite p {
          overflow: hidden;
          max-height: 0;
          opacity: 0;
          animation: sitrepWrite 0.85s ease forwards;
        }
        [data-theater-sitrep-book] .theater-sitrep-handwrite p:nth-child(1) { animation-delay: 0.15s; }
        [data-theater-sitrep-book] .theater-sitrep-handwrite p:nth-child(2) { animation-delay: 0.85s; }
        [data-theater-sitrep-book] .theater-sitrep-handwrite p:nth-child(3) { animation-delay: 1.55s; }
        [data-theater-sitrep-book] .theater-sitrep-handwrite p:nth-child(4) { animation-delay: 2.15s; }
        [data-theater-sitrep-book] .theater-sitrep-handwrite p:nth-child(5) { animation-delay: 2.7s; }
        @keyframes sitrepWrite {
          to { max-height: 6rem; opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-theater-sitrep-book] .theater-sitrep-handwrite p {
            animation: none;
            max-height: none;
            opacity: 1;
          }
        }
      `}</style>
    </div>,
    document.body,
  );
}
