"use client";

import { OfficialDocCard } from "@/components/globe/OfficialDocCard";
import { SipriArmsRecord } from "@/components/globe/SipriArmsRecord";
import { OFFICIAL_DOCS } from "@/data/officialDocs";
import { articlesForFlash, docsForFlash } from "@/lib/officialDocs/match";
import type { NewsStreamItem } from "@/lib/news/types";

type Props = {
  en: boolean;
  /** 속보의 제목·본문 */
  text: string;
  at: number;
  ownUrl?: string;
  newsPool: readonly NewsStreamItem[];
};

/** 속보의 근거 문서(공식 원문)와 같은 사건을 다룬 언론 기사. 둘 다 없으면 아무것도 그리지 않는다. */
export function FlashEvidence({ en, text, at, ownUrl, newsPool }: Props) {
  const docs = docsForFlash(text, OFFICIAL_DOCS);
  const articles = articlesForFlash(text, at, newsPool, ownUrl);

  return (
    <div className="space-y-2 empty:hidden" data-flash-evidence>
      <SipriArmsRecord text={text} en={en} />
      {docs.length > 0 ? (
        <section>
          <p className="px-0.5 text-micro font-semibold text-[#5c4020]">{en ? "Source documents" : "근거 문서"}</p>
          <ul className="mt-1 grid gap-1.5">
            {docs.map((doc) => (
              <OfficialDocCard key={doc.id} doc={doc} en={en} />
            ))}
          </ul>
        </section>
      ) : null}
      {articles.length > 0 ? (
        <section>
          <p className="px-0.5 text-micro font-semibold text-[#5c4020]">{en ? "Related press reports" : "관련 언론 기사"}</p>
          <ul className="mt-1 grid gap-1">
            {articles.map((row) => (
              <li key={row.url} className="rounded-sm border border-[#6b4a22]/20 bg-[#f7edd4]/70 px-2 py-1">
                <p className="text-micro leading-snug">
                  <a href={row.url} target="_blank" rel="noopener noreferrer" className="underline">
                    {row.title}
                  </a>
                </p>
                <p className="mt-0.5 text-micro text-[#5c4020]">
                  {row.source}
                  {row.label || row.tier === 3 ? (
                    <span className="ml-1 rounded-sm bg-[#6b4a22]/15 px-1">{row.label ?? (en ? "Party outlet" : "당사자 매체")}</span>
                  ) : null}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
