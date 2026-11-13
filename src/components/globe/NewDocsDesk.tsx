"use client";

import { useMemo } from "react";
import { OriginalLinks } from "@/components/globe/PolledDocsSection";
import { issuerNameEn, issuerNameKo } from "@/lib/countryName";
import { KIND_KO } from "@/lib/officialDocs/classify";
import type { DocKind } from "@/data/officialDocs";
import { pickNewDocs } from "@/lib/officialDocs/newDocs";
import type { PolledDoc } from "@/lib/officialDocs/matchPolled";
import { localizedDoc } from "@/lib/officialDocs/translate";
import { usePolledOfficialDocs } from "@/hooks/usePolledOfficialDocs";

const NEW_MS = 48 * 3_600_000;

const KIND_EN: Record<string, string> = {
  "joint-statement": "Joint statement",
  treaty: "Treaty",
  factsheet: "Fact sheet",
  readout: "Readout",
  statement: "Statement",
};

export function useNewOfficialDocs(): PolledDoc[] {
  const docs = usePolledOfficialDocs();
  return useMemo(() => pickNewDocs(docs, Date.now()), [docs]);
}

function kindLabel(kind: string, en: boolean): string {
  return en ? (KIND_EN[kind] ?? kind) : (KIND_KO[kind as DocKind] ?? kind);
}

function issuerLabel(id: string, en: boolean): string {
  return en ? issuerNameEn(id) : issuerNameKo(id);
}

/** 속보 창 왼쪽 목록의 "신규 공식 문서" 묶음. 문서가 없으면 아무것도 그리지 않는다. */
export function NewDocsNavGroup({
  docs,
  en,
  selectedId,
  onSelect,
}: {
  docs: readonly PolledDoc[];
  en: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (docs.length === 0) return null;
  const now = Date.now();
  return (
    <div className="flex shrink-0 gap-1 sm:flex-col" data-new-docs-nav>
      <p className="flex shrink-0 items-center gap-1 px-1 pt-1 text-micro font-semibold sm:sticky sm:top-0 sm:z-10 sm:bg-[#e9d9b4]">
        <span className="rounded-sm bg-[#2a1c0a] px-1 bg-emerald-500/25 text-emerald-100">{en ? "New official docs" : "신규 공식 문서"}</span>
        <span className="tabular-nums text-[#5c4020]/75">{docs.length}</span>
      </p>
      {docs.map((d) => {
        const shown = localizedDoc(d, en);
        const fresh = now - Date.parse(d.publishedAt ?? "") < NEW_MS;
        return (
          <button
            key={d.id}
            type="button"
            onClick={() => onSelect(d.id)}
            className={`w-44 shrink-0 rounded-sm border px-2 py-1 text-left text-micro leading-snug sm:w-full ${
              d.id === selectedId ? "border-[#6b4a22] bg-[#f7edd4]" : "border-[#6b4a22]/25 bg-[#efe0bc]/70 hover:bg-[#f3e6c8]"
            }`}
            aria-pressed={d.id === selectedId}
          >
            <span className="flex items-center gap-1 text-[#5c4020]/80">
              {issuerLabel(d.issuerId, en)} · {kindLabel(d.kind, en)}
              {fresh ? <span className="rounded-sm bg-rose-600 px-1 text-white">NEW</span> : null}
              <span className="ml-auto tabular-nums">{(d.publishedAt ?? "").slice(5, 10)}</span>
            </span>
            <span className="line-clamp-2 block font-medium">{shown.title}</span>
          </button>
        );
      })}
    </div>
  );
}

/** 문서 하나: 제목·요약·원문으로 가는 길. 우리가 보관한 PDF가 있으면(열람이 허용된 나라만) 그 자리에서 펼쳐 읽는다. */
export function NewDocView({ doc, en, onBack }: { doc: PolledDoc; en: boolean; onBack: () => void }) {
  const shown = localizedDoc(doc, en);
  // 해당 언어 번역이 아직 없으면 원문 요약을 그대로 보여 주고, 원문이라고 밝힌다
  const summary = shown.summary || doc.summary;
  const summaryIsOriginal = !shown.summary && Boolean(doc.summary);
  return (
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3" data-new-doc-view>
      <button
        type="button"
        onClick={onBack}
        className="rounded-sm border border-[#6b4a22]/40 bg-[#efe0bc]/95 px-2.5 py-0.5 text-micro text-[#3d2a12] hover:bg-[#e8d6a8] sm:hidden"
      >
        {en ? "← Back to flashes" : "← 속보로 돌아가기"}
      </button>
      <div>
        <p className="text-micro font-semibold text-[#5c4020]">
          {issuerLabel(doc.issuerId, en)}
          {doc.agency ? ` · ${doc.agency}` : ""} · {kindLabel(doc.kind, en)} · {doc.publishedAt ?? ""}
        </p>
        <h2 className="mt-0.5 text-base font-semibold leading-snug">{shown.title}</h2>
        {shown.original ? <p className="mt-0.5 text-micro text-[#5c4020]/70">{en ? "Original: " : "원문 제목: "}{shown.original}</p> : null}
        <p className="mt-1 text-micro leading-snug text-[#5c4020]/80">
          {en
            ? "Collected automatically from the issuer's site. Not reviewed, and not a verified fact: it is what this body said."
            : "발행 기관 사이트에서 자동으로 모았습니다. 검수 전이며 사실로 확인된 것이 아니라 그 기관이 이렇게 말했다는 기록입니다."}
        </p>
      </div>
      {summary ? (
        <section className="rounded-sm border border-[#6b4a22]/25 bg-[#f7edd4]/70 px-2 py-1.5">
          <p className="text-micro font-semibold text-[#5c4020]">
            {en ? "Summary" : "요약"}
            {summaryIsOriginal ? <span className="ml-1 font-normal text-[#5c4020]/70">{en ? "(original wording, no translation yet)" : "(원문 그대로 · 번역 준비 중)"}</span> : null}
          </p>
          <p className="mt-0.5 whitespace-pre-wrap text-micro leading-snug">{summary}</p>
        </section>
      ) : (
        <p className="rounded-sm border border-dashed border-[#6b4a22]/40 px-2 py-1 text-micro text-[#5c4020]/80">
          {en ? "The feed gave no summary for this document. Read the original." : "이 문서는 발행처 피드에 요약이 없습니다. 원문을 보세요."}
        </p>
      )}
      <OriginalLinks doc={doc} en={en} />
      {doc.fileAvailable ? (
        <iframe
          title={shown.title}
          src={`/api/official-docs/file/${doc.id}`}
          loading="lazy"
          className="h-[60vh] w-full rounded-sm border border-[#6b4a22]/30 bg-white"
          data-new-doc-pdf
        />
      ) : (
        <p className="rounded-sm border border-dashed border-[#6b4a22]/40 px-2 py-1 text-micro leading-snug text-[#5c4020]/80" data-new-doc-nocapture>
          {en
            ? "No saved copy of the original page can be shown here yet. Use the original link above."
            : "원문 화면을 여기서 보여 줄 수 있는 보관본이 아직 없습니다. 위의 원문 링크로 보세요."}
        </p>
      )}
    </div>
  );
}
