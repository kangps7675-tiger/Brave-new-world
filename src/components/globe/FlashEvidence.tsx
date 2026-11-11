"use client";

import { useState } from "react";
import { OFFICIAL_DOCS, officialDocTextPath, type OfficialDocMeta } from "@/data/officialDocs";
import { issuerNameEn, issuerNameKo } from "@/lib/countryName";
import { KIND_KO, WEIGHT_KO } from "@/lib/officialDocs/classify";
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

const WEIGHT_EN = { agreed: "Agreed text", unilateral: "One side's release", remarks: "Personal remarks" } as const;
const KIND_EN = {
  factsheet: "Fact sheet",
  "joint-statement": "Joint statement",
  readout: "Readout",
  statement: "Statement",
  "press-release": "Press release",
  remarks: "Remarks",
  treaty: "Treaty",
} as const;

function DocCard({ doc, en }: { doc: OfficialDocMeta; en: boolean }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const issuers = doc.issuerIds.map((id) => (en ? issuerNameEn(id) : issuerNameKo(id))).join(" · ");

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && text == null && !failed) {
      void fetch(officialDocTextPath(doc.id))
        .then((res) => (res.ok ? res.text() : Promise.reject(new Error(String(res.status)))))
        .then(setText)
        .catch(() => setFailed(true));
    }
  };

  return (
    <li className="rounded-sm border border-[#6b4a22]/25 bg-[#f7edd4]/80 px-2 py-1.5">
      <p className="text-micro font-semibold">
        {issuers}
        {" · "}
        {en ? KIND_EN[doc.kind] : KIND_KO[doc.kind]}
        <span className="ml-1 rounded-sm bg-[#6b4a22]/15 px-1 font-normal">{en ? WEIGHT_EN[doc.weight] : WEIGHT_KO[doc.weight]}</span>
      </p>
      <p className="mt-0.5 text-micro leading-snug">{doc.title}</p>
      {doc.imageUrl ? (
        <div className="mt-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={doc.imageUrl} alt="" className="max-h-40 w-full rounded-sm bg-black/80 object-contain" loading="lazy" />
          <p className="mt-0.5 text-micro text-[#5c4020]/70">
            {en ? "Image from the original page; rights belong to the publisher." : "원문 페이지의 이미지입니다. 권리는 발행 기관에 있습니다."}
          </p>
        </div>
      ) : null}
      <p className="mt-0.5 text-micro text-[#5c4020]">
        {doc.publishedAt}
        {" · "}
        <a href={doc.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
          {en ? "Original" : "원본 링크"}
        </a>
        {" · "}
        <button type="button" className="underline" aria-expanded={open} onClick={toggle}>
          {open ? (en ? "Hide text" : "원문 접기") : en ? "Read full text" : "원문 전체 보기"}
        </button>
      </p>
      {open ? (
        <div className="mt-1">
          {failed ? (
            <p className="text-micro">{en ? "The saved text could not be loaded. Use the original link." : "저장된 원문을 못 불러왔습니다. 원본 링크로 보세요."}</p>
          ) : text == null ? (
            <p className="text-micro">{en ? "Loading…" : "불러오는 중…"}</p>
          ) : (
            <>
              <pre className="max-h-60 overflow-y-auto whitespace-pre-wrap break-words rounded-sm bg-[#efe0bc]/70 p-1.5 font-sans text-micro leading-snug">{text}</pre>
              <p className="mt-0.5 text-micro text-[#5c4020]/70">
                {en
                  ? `Saved on ${doc.fetchedAt}. The original may have changed since. Terms: ${doc.terms}`
                  : `${doc.fetchedAt}에 저장한 원문입니다. 이후 원본이 바뀌었을 수 있습니다. 이용 조건: ${doc.terms}`}
              </p>
            </>
          )}
        </div>
      ) : null}
    </li>
  );
}

/** 속보의 근거 문서(공식 원문)와 같은 사건을 다룬 언론 기사. 둘 다 없으면 아무것도 그리지 않는다. */
export function FlashEvidence({ en, text, at, ownUrl, newsPool }: Props) {
  const docs = docsForFlash(text, OFFICIAL_DOCS);
  const articles = articlesForFlash(text, at, newsPool, ownUrl);
  if (docs.length === 0 && articles.length === 0) return null;

  return (
    <div className="space-y-2" data-flash-evidence>
      {docs.length > 0 ? (
        <section>
          <p className="px-0.5 text-micro font-semibold text-[#5c4020]">{en ? "Source documents" : "근거 문서"}</p>
          <ul className="mt-1 grid gap-1.5">
            {docs.map((doc) => (
              <DocCard key={doc.id} doc={doc} en={en} />
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
