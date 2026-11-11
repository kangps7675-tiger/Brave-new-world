"use client";

import { useState } from "react";
import { officialDocTextPath, type OfficialDocMeta } from "@/data/officialDocs";
import { issuerNameEn, issuerNameKo } from "@/lib/countryName";
import { KIND_KO, WEIGHT_KO } from "@/lib/officialDocs/classify";

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

type Tone = "parchment" | "dark";

const TONE = {
  parchment: {
    box: "rounded-sm border border-[#6b4a22]/25 bg-[#f7edd4]/80 px-2 py-1.5",
    chip: "ml-1 rounded-sm bg-[#6b4a22]/15 px-1 font-normal",
    sub: "text-[#5c4020]",
    faint: "text-[#5c4020]/70",
    pre: "bg-[#efe0bc]/70",
  },
  dark: {
    box: "rounded-lg border border-slate-600/50 bg-slate-800/60 px-3 py-2 text-slate-200",
    chip: "ml-1 rounded bg-sky-500/15 px-1 font-normal text-sky-100",
    sub: "text-slate-400",
    faint: "text-slate-500",
    pre: "bg-slate-900/70",
  },
} as const;

export function OfficialDocCard({ doc, en, tone = "parchment" }: { doc: OfficialDocMeta; en: boolean; tone?: Tone }) {
  const c = TONE[tone];
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
    <li className={c.box}>
      <p className="text-micro font-semibold">
        {issuers}
        {" · "}
        {en ? KIND_EN[doc.kind] : KIND_KO[doc.kind]}
        <span className={c.chip}>{en ? WEIGHT_EN[doc.weight] : WEIGHT_KO[doc.weight]}</span>
      </p>
      <p className="mt-0.5 text-micro leading-snug">{doc.title}</p>
      {doc.imageUrl ? (
        <div className="mt-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={doc.imageUrl} alt="" className="max-h-40 w-full rounded-sm bg-black/80 object-contain" loading="lazy" />
          <p className={`mt-0.5 text-micro ${c.faint}`}>
            {en ? "Image from the original page; rights belong to the publisher." : "원문 페이지의 이미지입니다. 권리는 발행 기관에 있습니다."}
          </p>
        </div>
      ) : null}
      <p className={`mt-0.5 text-micro ${c.sub}`}>
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
              <pre className={`max-h-60 overflow-y-auto whitespace-pre-wrap break-words rounded-sm p-1.5 font-sans text-micro leading-snug ${c.pre}`}>{text}</pre>
              <p className={`mt-0.5 text-micro ${c.faint}`}>
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
