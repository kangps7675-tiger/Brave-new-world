"use client";

import { issuerNameEn, issuerNameKo } from "@/lib/countryName";
import { KIND_KO } from "@/lib/officialDocs/classify";
import type { DocKind } from "@/data/officialDocs";
import { groupBySide, splitRivalSides, type PolledDocMatch } from "@/lib/officialDocs/matchPolled";
import { localizedDoc } from "@/lib/officialDocs/translate";

export const TOPIC_KO: Record<string, string> = {
  semiconductor: "반도체", "ai-compute": "AI 연산", "defense-industry": "방산", "export-control": "수출통제", sanctions: "제재",
  "investment-screening": "투자심사", "critical-minerals": "핵심광물", "tech-supply-chain": "기술 공급망", "biotech-quantum": "바이오·양자",
};
export const TOPIC_EN: Record<string, string> = {
  semiconductor: "semiconductors", "ai-compute": "AI compute", "defense-industry": "defense", "export-control": "export controls", sanctions: "sanctions",
  "investment-screening": "investment screening", "critical-minerals": "critical minerals", "tech-supply-chain": "tech supply chain", "biotech-quantum": "biotech/quantum",
};

/**
 * 원본을 확인하는 길. 우리 서버가 보관한 원본 PDF(이용 조건을 확인한 나라만), 발행 기관의 원본 링크, 시각이 찍힌 웹 아카이브 보관본.
 * 보관본이 있으면 받은 시각과 SHA-256 앞자리를 같이 적는다 — 나중에 기관이 파일을 바꿨는지 가릴 때 쓴다.
 */
export function OriginalLinks({ doc, en }: { doc: PolledDocMatch["doc"]; en: boolean }) {
  // 눈에 띄는 링크는 하나만 — 우리 보관본(원본 파일)이 있으면 그것, 없으면 발행 기관 페이지.
  // 나머지 보관본과 보관 정보(시각·해시)는 접어 두어, 한 문서에 링크가 줄줄이 보이지 않게 한다.
  const primary = doc.fileAvailable
    ? { href: `/api/official-docs/file/${doc.id}`, label: en ? "Read the original (PDF)" : "원문 보기 (PDF)" }
    : { href: doc.url, label: en ? "Read the original" : "원문 보기" };
  // 열 수 있는 주소가 없으면 링크만 비우지 않고, 무엇이 있는지(제목·기관·날짜)는 그대로 보이게 한다
  if (!primary.href) {
    return (
      <p className="mt-0.5 text-micro text-[#5c4020]/80">
        {en ? "No link to the original is available. Title, issuer and date above are all we have." : "원문 링크가 없습니다. 위의 제목·발행 기관·날짜만 확인할 수 있습니다."}
      </p>
    );
  }
  const others: Array<{ href: string; label: string }> = [];
  if (doc.fileAvailable) others.push({ href: doc.url, label: en ? "Publisher's page" : "발행 기관 페이지" });
  if (doc.archiveUrl) others.push({ href: doc.archiveUrl, label: en ? "Web Archive snapshot" : "웹 아카이브 보관본" });
  const kb = doc.fileBytes ? `${Math.max(1, Math.round(doc.fileBytes / 1024))} KB` : "";
  const hasMore = others.length > 0 || doc.fileSha256;
  return (
    <>
      <p className="mt-0.5 text-micro text-[#5c4020]">
        <a href={primary.href} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
          {primary.label}
        </a>
      </p>
      {hasMore ? (
        <details className="mt-0.5 text-micro text-[#5c4020]/80">
          <summary className="cursor-pointer select-none">{en ? "Other copies · archive info" : "다른 보관본 · 보관 정보"}</summary>
          <p className="mt-0.5 flex flex-wrap gap-x-2">
            {others.map((l) => (
              <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className="underline">
                {l.label}
              </a>
            ))}
          </p>
          {doc.fileSha256 ? (
            <p className="mt-0.5">
              {en ? "Saved " : "보관 "}
              {doc.fileFetchedAt ? doc.fileFetchedAt.slice(0, 16).replace("T", " ") + " UTC" : ""}
              {kb ? ` · ${kb}` : ""} · SHA-256 {doc.fileSha256.slice(0, 8)}…
              {en ? " (a fingerprint to check the file was not altered)" : " (파일이 바뀌지 않았는지 확인하는 지문값)"}
            </p>
          ) : null}
        </details>
      ) : null}
      {doc.fileAvailable && doc.issuerId === "gb" ? (
        <p className="mt-0.5 text-micro text-[#5c4020]/70">
          <a href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/" target="_blank" rel="noopener noreferrer" className="underline">
            Contains public sector information licensed under the Open Government Licence v3.0.
          </a>
        </p>
      ) : null}
    </>
  );
}

export function DocItem({ match, en }: { match: PolledDocMatch; en: boolean }) {
  const { doc, reasons } = match;
  const issuer = en ? issuerNameEn(doc.issuerId) : issuerNameKo(doc.issuerId);
  const kind = en ? doc.kind.replace("-", " ") : (KIND_KO[doc.kind as DocKind] ?? doc.kind);
  const why = [
    ...reasons.places,
    ...reasons.topics.map((t) => (en ? TOPIC_EN[t] : TOPIC_KO[t]) ?? t),
    ...reasons.terms,
    ...(reasons.rival ? [en ? "other party named in the report" : "속보에 나온 상대 당사국"] : []),
  ].join(", ");
  const shown = localizedDoc(doc, en);
  return (
    <li className="rounded-sm border border-[#6b4a22]/20 bg-[#f7edd4]/70 px-2 py-1">
      <p className="text-micro leading-snug">
        {doc.url ? (
          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="underline">
            {shown.title}
          </a>
        ) : (
          shown.title
        )}
        {shown.translated ? <span className="ml-1 text-[#5c4020]/70">{en ? "(auto-translated)" : "(자동 번역)"}</span> : null}
      </p>
      {shown.summary ? <p className="mt-0.5 line-clamp-2 text-micro leading-snug text-[#5c4020]">{shown.summary}</p> : null}
      {shown.original ? <p className="mt-0.5 text-micro text-[#5c4020]/70">{en ? "Original: " : "원문 제목: "}{shown.original}</p> : null}
      <OriginalLinks doc={doc} en={en} />
      <p className="mt-0.5 text-micro text-[#5c4020]">
        {doc.agency ? `${issuer} · ${doc.agency}` : issuer} · {kind} · {doc.publishedAt ?? ""}
        {/국영/.test(doc.feed) ? <span className="ml-1">{en ? "· state media report" : "· 국영 매체 보도"}</span> : null}
        {why ? <span className="ml-1 text-[#5c4020]/70">{en ? `matched: ${why}` : `맞은 단서: ${why}`}</span> : null}
      </p>
    </li>
  );
}

/**
 * 속보와 맞아 보여 자동으로 붙은 공식 문서. 사람이 읽고 승인한 "근거 문서"와 구분해, 검수 전이라는 것과 왜 붙었는지를 같이 적는다.
 * 판정(확인·유력)에는 쓰지 않는다 — 검수 전 자료로 판정을 바꾸지 않기 위해서다.
 *
 * 문서를 낸 나라가 둘 이상이면 나라별로 묶어 "당사국별 공식 입장"으로 나란히 보여 준다. 어느 쪽 말이 맞는지는 가리지 않는다 —
 * 각자 이렇게 말했다는 것만 있는 그대로 놓는다.
 */
export function PolledDocsSection({ matches, en }: { matches: readonly PolledDocMatch[]; en: boolean }) {
  if (matches.length === 0) return null;
  const groups = groupBySide(matches);
  const { pair, rest } = splitRivalSides(groups);
  const sides = groups.length >= 2;
  const sideName = (id: string) => (en ? `${issuerNameEn(id)} side` : `${issuerNameKo(id)} 측`);
  const column = (g: (typeof groups)[number], showName: boolean) => (
    <div key={g.issuerId} data-side={g.issuerId}>
      {showName ? <p className="px-0.5 text-micro font-semibold text-[#5c4020]">{sideName(g.issuerId)}</p> : null}
      <ul className="mt-0.5 grid gap-1">
        {g.matches.map((m) => (
          <DocItem key={m.doc.id} match={m} en={en} />
        ))}
      </ul>
    </div>
  );
  return (
    <section data-polled-docs data-sides={groups.length} data-rival={pair ? `${pair[0].issuerId}-${pair[1].issuerId}` : undefined}>
      <p className="px-0.5 text-micro font-semibold text-[#5c4020]">
        {pair
          ? en ? "Each side's official statements" : "양측의 공식 입장"
          : sides ? (en ? "What each side's officials said" : "당사국별 공식 입장") : en ? "New official documents" : "새로 나온 공식 문서"}
        <span className="ml-1 font-normal text-[#5c4020]/70">{en ? "auto-collected, not reviewed" : "자동 수집 · 검수 전"}</span>
        <span className="block font-normal text-[#5c4020]/70">
          {pair
            ? en
              ? "Each side's own words, side by side. Which side is right is not judged here, and neither is verified fact. Linked to this report by shared clues only."
              : "양측이 각자 낸 말을 나란히 놓았을 뿐, 어느 쪽이 맞는지는 가리지 않으며 사실로 확인된 것도 아닙니다. 이 속보와는 겹치는 단서만으로 이어 놓았습니다."
            : en
              ? "What each body says, not verified fact. Linked to this report by shared clues only."
              : "각 기관이 낸 주장·입장이며 사실로 확인된 것이 아닙니다. 이 속보와는 겹치는 단서만으로 이어 놓았습니다."}
        </span>
      </p>
      {pair ? (
        <div className="mt-1 grid grid-cols-1 gap-1.5 sm:grid-cols-2" data-rival-columns>
          {pair.map((g) => column(g, true))}
        </div>
      ) : null}
      {(pair ? rest : groups).length > 0 ? (
        <div className={pair || sides ? "mt-1.5 grid gap-1.5" : "mt-1"}>{(pair ? rest : groups).map((g) => column(g, sides))}</div>
      ) : null}
    </section>
  );
}
