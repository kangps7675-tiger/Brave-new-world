"use client";

import { issuerNameEn, issuerNameKo } from "@/lib/countryName";
import { KIND_KO } from "@/lib/officialDocs/classify";
import type { DocKind } from "@/data/officialDocs";
import type { PolledDocMatch } from "@/lib/officialDocs/matchPolled";

const TOPIC_KO: Record<string, string> = {
  semiconductor: "반도체", "ai-compute": "AI 연산", "defense-industry": "방산", "export-control": "수출통제", sanctions: "제재",
  "investment-screening": "투자심사", "critical-minerals": "핵심광물", "tech-supply-chain": "기술 공급망", "biotech-quantum": "바이오·양자",
};
const TOPIC_EN: Record<string, string> = {
  semiconductor: "semiconductors", "ai-compute": "AI compute", "defense-industry": "defense", "export-control": "export controls", sanctions: "sanctions",
  "investment-screening": "investment screening", "critical-minerals": "critical minerals", "tech-supply-chain": "tech supply chain", "biotech-quantum": "biotech/quantum",
};

/**
 * 속보와 맞아 보여 자동으로 붙은 공식 문서. 사람이 읽고 승인한 "근거 문서"와 구분해, 검수 전이라는 것과 왜 붙었는지를 같이 적는다.
 * 판정(확인·유력)에는 쓰지 않는다 — 검수 전 자료로 판정을 바꾸지 않기 위해서다.
 */
export function PolledDocsSection({ matches, en }: { matches: readonly PolledDocMatch[]; en: boolean }) {
  if (matches.length === 0) return null;
  return (
    <section data-polled-docs>
      <p className="px-0.5 text-micro font-semibold text-[#5c4020]">
        {en ? "New official documents" : "새로 나온 공식 문서"}
        <span className="ml-1 font-normal text-[#5c4020]/70">{en ? "auto-collected, not reviewed" : "자동 수집 · 검수 전"}</span>
        <span className="block font-normal text-[#5c4020]/70">
          {en
            ? "What each body says, not verified fact. Linked to this report by shared clues only."
            : "각 기관이 낸 주장·입장이며 사실로 확인된 것이 아닙니다. 이 속보와는 겹치는 단서만으로 이어 놓았습니다."}
        </span>
      </p>
      <ul className="mt-1 grid gap-1">
        {matches.map(({ doc, reasons }) => {
          const issuer = en ? issuerNameEn(doc.issuerId) : issuerNameKo(doc.issuerId);
          const kind = en ? doc.kind.replace("-", " ") : (KIND_KO[doc.kind as DocKind] ?? doc.kind);
          const why = [
            ...reasons.places,
            ...reasons.topics.map((t) => (en ? TOPIC_EN[t] : TOPIC_KO[t]) ?? t),
            ...reasons.terms,
          ].join(", ");
          return (
            <li key={doc.id} className="rounded-sm border border-[#6b4a22]/20 bg-[#f7edd4]/70 px-2 py-1">
              <p className="text-micro leading-snug">
                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="underline">
                  {doc.title}
                </a>
              </p>
              <p className="mt-0.5 text-micro text-[#5c4020]">
                {doc.agency ? `${issuer} · ${doc.agency}` : issuer} · {kind} · {doc.publishedAt ?? ""}
                {/국영/.test(doc.feed) ? <span className="ml-1">{en ? "· state media report" : "· 국영 매체 보도"}</span> : null}
                {why ? <span className="ml-1 text-[#5c4020]/70">{en ? `matched: ${why}` : `맞은 단서: ${why}`}</span> : null}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
