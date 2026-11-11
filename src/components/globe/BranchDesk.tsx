"use client";

import { useState } from "react";
import type { BranchCheck } from "@/data/branchPoints";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { NewsStreamItem } from "@/lib/news/types";
import { initiativeById } from "@/data/countryInitiatives";
import {
  aftermathFor,
  branchesInPhase,
  daysUntil,
  goalOnCard,
  linksForItems,
  nextBranch,
  type BranchPhase,
  type BranchPoint,
} from "@/lib/branchPoint";

type Props = {
  lang: LabelLanguage;
  items: NewsStreamItem[];
  now?: number;
  /** embedded: 정치일정 창 안의 탭으로 들어갈 때. 바깥 테두리·배경 없이 내용만 그린다. */
  embedded?: boolean;
};

const PHASE_KO: Record<BranchPhase, string> = { preview: "예고", day: "당일", aftermath: "사후" };
const PHASE_EN: Record<BranchPhase, string> = { preview: "Preview", day: "Election day", aftermath: "Aftermath" };

const CHECK_KO: Record<BranchCheck["kind"], string> = {
  seats: "의석",
  constitution: "헌법",
  leadership: "당과 직책",
  law: "법",
};
const CHECK_EN: Record<BranchCheck["kind"], string> = {
  seats: "Seats",
  constitution: "Constitution",
  leadership: "Party and offices",
  law: "Law",
};

function whenLine(row: BranchPoint, en: boolean, now: number): string {
  const days = daysUntil(row, now);
  const when = en ? row.whenEn : row.whenKo;
  if (days == null) return when;
  return en ? `${when}. ${days} days left.` : `${when}. ${days}일 남았습니다.`;
}

function CheckList({ checks, en, later }: { checks: readonly BranchCheck[]; en: boolean; later: boolean }) {
  return (
    <ul className="mt-1 grid gap-1">
      {checks.map((check) => (
        <li key={check.id} className="rounded-sm border border-[#6b4a22]/20 bg-[#f7edd4]/80 px-2 py-1">
          <p className="text-micro font-semibold">
            {en ? CHECK_EN[check.kind] : CHECK_KO[check.kind]}
            {" · "}
            {later
              ? en
                ? "Check after the date"
                : "이 날 이후 확인"
              : check.status === "cited"
                ? en
                  ? "A source said this"
                  : "출처가 말한 것"
                : en
                  ? "Not written here yet"
                  : "아직 이 칸에 없음"}
          </p>
          <p className="mt-0.5 text-micro leading-snug">{en ? check.claimEn || check.promptEn : check.claimKo || check.promptKo}</p>
          <p className="mt-0.5 text-micro">
            {en ? check.sourceNameEn : check.sourceNameKo}
            {" · "}
            <a href={check.sourceUrl} target="_blank" rel="noreferrer" className="underline">
              {en ? "Open" : "열기"}
            </a>
          </p>
        </li>
      ))}
    </ul>
  );
}

/** 예고·당일·사후와 국가 카드의 다음 분기점. 지난 선거의 의석·헌법은 출처가 있을 때만 적는다. */
export function BranchDesk({ lang, items, now = Date.now(), embedded = false }: Props) {
  const en = lang === "en";
  const [panel, setPanel] = useState<"card" | "after" | null>(null);
  const [countryId, setCountryId] = useState<string | null>(null);
  const preview = branchesInPhase("preview", now);
  const day = branchesInPhase("day", now);
  const after = branchesInPhase("aftermath", now);
  const lead = preview[0] ?? day[0] ?? null;
  const leadCountry = lead ? lead.countryId : after[0]?.countryId ?? null;
  const selectedId = countryId ?? leadCountry;
  const card = selectedId ? initiativeById(selectedId) : null;
  const upcoming = selectedId ? nextBranch(selectedId, now) : null;
  const past = selectedId ? aftermathFor(selectedId, now) : [];
  const links = linksForItems(items, now);
  const toggle = (nextPanel: "card" | "after") => setPanel((value) => (value === nextPanel ? null : nextPanel));

  return (
    <section
      className={
        embedded
          ? "pt-1.5 text-[#2a1c0a]"
          : "pointer-events-auto w-full max-w-3xl rounded-md border border-[#6b4a22]/35 bg-[#f3e6c8]/95 p-2 text-[#2a1c0a] shadow-lg"
      }
      aria-label={en ? "Branch points" : "분기점"}
      data-branch-desk
    >
      <p className="px-1 text-micro font-semibold">
        {en ? "Branch points. " : "분기점. "}
        <span className="font-normal">
          {en
            ? `${PHASE_EN.preview} ${preview.length} · ${PHASE_EN.day} ${day.length} · ${PHASE_EN.aftermath} ${after.length}`
            : `예고 ${preview.length} · 당일 ${day.length} · 사후 ${after.length}`}
        </span>
      </p>
      {lead ? (
        <p className="mt-1 px-1 text-micro leading-snug">
          <span className="font-semibold">{en ? "Next branch point. " : "다음 분기점. "}</span>
          {en ? lead.titleEn : lead.titleKo}
          {" · "}
          {whenLine(lead, en, now)}
        </p>
      ) : (
        <p className="mt-1 px-1 text-micro leading-snug">{en ? "No upcoming branch point is on this list." : "이 목록에 다가오는 분기점이 없습니다."}</p>
      )}
      {after[0] ? (
        <p className="mt-1 px-1 text-micro leading-snug">
          <span className="font-semibold">{en ? "Aftermath. " : "사후. "}</span>
          {en ? after[0].titleEn : after[0].titleKo}
          {" · "}
          {en
            ? after[0].checks.find((check) => check.status === "cited")?.claimEn || after[0].checks[0]?.promptEn
            : after[0].checks.find((check) => check.status === "cited")?.claimKo || after[0].checks[0]?.promptKo}
        </p>
      ) : null}
      {links.length > 0 ? (
        <ul className="mt-1 grid gap-1 px-1">
          {links.map((link) => {
            const linkedCard = initiativeById(link.countryId);
            const goal = linkedCard ? goalOnCard(linkedCard, link.goalId) : null;
            return (
              <li key={`${link.countryId}:${link.branchId}`} className="text-micro leading-snug">
                <button type="button" className="underline" onClick={() => { setCountryId(link.countryId); setPanel("card"); }}>
                  {en ? linkedCard?.countryEn : linkedCard?.countryKo}
                </button>
                {en ? " · " : " · "}
                {goal
                  ? en
                    ? "This report overlaps a goal written in that country’s document."
                    : "이 기사는 그 나라 문서에 적힌 목표와 겹칩니다."
                  : en
                    ? `Tied to the ${PHASE_EN[link.phase].toLowerCase()} node.`
                    : `${PHASE_KO[link.phase]} 노드에 연결됩니다.`}
              </li>
            );
          })}
        </ul>
      ) : null}
      <div className="mt-1 flex gap-2 px-1">
        <button type="button" className="text-micro underline" aria-expanded={panel === "card"} onClick={() => toggle("card")}>
          {panel === "card" ? (en ? "Close country card" : "국가 카드 닫기") : en ? "Country card" : "국가 카드"}
        </button>
        <button type="button" className="text-micro underline" aria-expanded={panel === "after"} onClick={() => toggle("after")}>
          {panel === "after" ? (en ? "Close aftermath" : "사후 닫기") : en ? "Aftermath checks" : "사후 검증"}
        </button>
      </div>
      {panel === "after" ? (
        <div className="mt-1.5 grid gap-1.5">
          {after.length === 0 ? (
            <p className="px-1 text-micro">{en ? "No past branch point is waiting on a check." : "확인할 지난 분기점이 없습니다."}</p>
          ) : (
            after.map((row) => (
              <article key={row.id} className="rounded-sm border border-[#6b4a22]/25 bg-[#efe0bc]/80 px-2 py-1.5">
                <p className="text-micro font-semibold">
                  {en ? "Aftermath. " : "사후. "}
                  {en ? row.titleEn : row.titleKo}
                </p>
                <p className="mt-0.5 text-micro leading-snug">{en ? row.whenEn : row.whenKo}</p>
                <CheckList checks={row.checks} en={en} later={false} />
              </article>
            ))
          )}
        </div>
      ) : null}
      {panel === "card" && card ? (
        <article className="mt-1.5 rounded-sm border border-[#6b4a22]/25 bg-[#efe0bc]/80 px-2 py-1.5">
          <div className="flex flex-wrap gap-1">
            {preview.concat(day, after).reduce<string[]>((ids, row) => (ids.includes(row.countryId) ? ids : [...ids, row.countryId]), []).map((id) => {
              const row = initiativeById(id);
              if (!row) return null;
              return (
                <button
                  key={id}
                  type="button"
                  className={`rounded-sm px-1.5 py-0.5 text-micro underline ${id === card.id ? "bg-[#6b4a22]/15" : ""}`}
                  onClick={() => setCountryId(id)}
                >
                  {en ? row.countryEn : row.countryKo}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-micro font-semibold">
            {en ? card.countryEn : card.countryKo}
            {" · "}
            {card.basis === "document" ? (en ? "Official document" : "공식 문서") : en ? "Statements and decisions" : "발언과 결정"}
          </p>
          <p className="mt-0.5 text-micro leading-snug">{en ? card.scopeEn : card.scopeKo}</p>
          {card.goals.map((goal) => (
            <div key={goal.id} className="mt-1.5">
              <p className="text-micro font-semibold">{en ? "What the document says. " : "문서가 말한 것. "}</p>
              <p className="text-micro leading-snug">{en ? goal.saidEn : goal.saidKo}</p>
              <p className="mt-0.5 text-micro">
                {en ? goal.docEn : goal.docKo}
                {" · "}
                {goal.year}
                {" · "}
                {en ? goal.locatorEn : goal.locatorKo}
                {" · "}
                <a href={goal.url} target="_blank" rel="noreferrer" className="underline">
                  {en ? "Open" : "열기"}
                </a>
              </p>
              {goal.readKo || goal.readEn ? (
                <>
                  <p className="mt-1 text-micro font-semibold">{en ? "What we read from it. " : "우리가 읽은 것. "}</p>
                  <p className="text-micro leading-snug">{en ? goal.readEn : goal.readKo}</p>
                </>
              ) : null}
            </div>
          ))}
          {card.goals.length === 0 ? (
            <p className="mt-1 text-micro leading-snug">
              {en ? card.noteEn : card.noteKo}
              {card.docUrl ? (
                <>
                  {" "}
                  <a href={card.docUrl} target="_blank" rel="noreferrer" className="underline">
                    {en ? card.docNameEn : card.docNameKo}
                  </a>
                </>
              ) : null}
            </p>
          ) : null}
          <p className="mt-1.5 text-micro font-semibold">{en ? "Next branch point. " : "다음 분기점. "}</p>
          {upcoming ? (
            <>
              <p className="text-micro leading-snug">
                {en ? upcoming.titleEn : upcoming.titleKo}
                {" · "}
                {whenLine(upcoming, en, now)}
              </p>
              <CheckList checks={upcoming.checks} en={en} later />
            </>
          ) : (
            <p className="text-micro leading-snug">{en ? "No upcoming branch point is on this card." : "이 카드에 다가오는 분기점이 없습니다."}</p>
          )}
          {past.map((row) => (
            <div key={row.id} className="mt-1.5">
              <p className="text-micro font-semibold">
                {en ? "Aftermath. " : "사후. "}
                {en ? row.titleEn : row.titleKo}
              </p>
              <p className="text-micro leading-snug">
                {card.goals.length > 0
                  ? en
                    ? "This date points at the document above. The election result does not replace that sentence."
                    : "이 날짜는 위 문서를 가리킵니다. 선거 결과가 그 문장을 갈아 끼우지는 않습니다."
                  : en
                    ? row.whenEn
                    : row.whenKo}
              </p>
              <CheckList checks={row.checks} en={en} later={false} />
            </div>
          ))}
          <p className="mt-1.5 text-micro leading-snug text-[#5c4020]">
            {en ? "The document is what that country put out." : "이 문서는 그 나라가 밖에 내놓은 말입니다."}
          </p>
        </article>
      ) : null}
    </section>
  );
}
