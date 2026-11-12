"use client";

import type { AnalysisMatch } from "@/lib/analysis/match";

/**
 * 같은 사건·기종을 다룬 싱크탱크 분석. 공식 문서·언론 기사와 구분해, 전문가 해석이라는 것과 누가 썼는지를 적는다.
 * 판정(확인·유력)에는 쓰지 않는다.
 */
export function AnalysisSection({ matches, en }: { matches: readonly AnalysisMatch[]; en: boolean }) {
  if (matches.length === 0) return null;
  return (
    <section data-analysis>
      <p className="px-0.5 text-micro font-semibold text-[#5c4020]">
        {en ? "Think-tank analysis" : "싱크탱크 분석"}
        <span className="ml-1 font-normal text-[#5c4020]/70">{en ? "expert interpretation, not an official document" : "전문가 해석 · 공식 문서 아님"}</span>
      </p>
      <ul className="mt-1 grid gap-1">
        {matches.map(({ item, reasons }) => {
          const why = [...reasons.models, ...reasons.places, ...reasons.terms].join(", ");
          return (
            <li key={item.url} className="rounded-sm border border-[#6b4a22]/20 bg-[#f7edd4]/70 px-2 py-1">
              <p className="text-micro leading-snug">
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="underline">
                  {item.title}
                </a>
              </p>
              <p className="mt-0.5 text-micro text-[#5c4020]">
                {item.source.name}
                {item.author ? ` · ${item.author}` : ""} · {item.publishedAt?.slice(0, 10) ?? ""}
                {why ? <span className="ml-1 text-[#5c4020]/70">{en ? `matched: ${why}` : `맞은 단서: ${why}`}</span> : null}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
