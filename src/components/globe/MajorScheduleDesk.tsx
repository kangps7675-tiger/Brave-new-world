"use client";

import { useState } from "react";
import { NATIONAL_CONSTITUTIONS } from "@/data/nationalConstitutions";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { nextSchedule, orderedSchedules } from "@/lib/majorSchedule";

type Props = {
  lang: LabelLanguage;
  now?: number;
};

/** 지정학 화면의 국가 중대 일정. 지도 핀은 만들지 않는다. */
export function MajorScheduleDesk({ lang, now = Date.now() }: Props) {
  const en = lang === "en";
  const [panel, setPanel] = useState<"dates" | "laws" | null>(null);
  const next = nextSchedule(now);
  const rows = orderedSchedules(now);
  const toggle = (nextPanel: "dates" | "laws") => {
    setPanel((value) => (value === nextPanel ? null : nextPanel));
  };

  return (
    <section
      className="pointer-events-auto w-full max-w-3xl rounded-md border border-[#6b4a22]/35 bg-[#f3e6c8]/95 p-2 text-[#2a1c0a] shadow-lg"
      aria-label={en ? "Major national dates" : "국가 중대 일정"}
      data-major-schedules
    >
      <button
        type="button"
        className="w-full px-1 text-left text-micro leading-snug"
        aria-expanded={panel === "dates"}
        onClick={() => toggle("dates")}
      >
        <span className="font-semibold">
          {next
            ? en
              ? `Next official date: ${next.titleEn}, ${next.whenEn}.`
              : `다음 공식 일정은 ${next.titleKo}, ${next.whenKo}입니다.`
            : en
              ? "No upcoming official date is on this list."
              : "이 목록에 다가오는 공식 일정이 없습니다."}
        </span>
        <span className="ml-2 underline">{panel === "dates" ? (en ? "Close" : "닫기") : en ? "List" : "목록"}</span>
      </button>
      <button
        type="button"
        className="mt-1 px-1 text-left text-micro underline"
        aria-expanded={panel === "laws"}
        onClick={() => toggle("laws")}
      >
        {panel === "laws" ? (en ? "Close constitutions" : "헌법 닫기") : en ? "Constitutions" : "헌법"}
      </button>
      {panel === "laws" ? (
        <>
          <p className="mt-1.5 px-1 text-micro leading-snug text-[#5c4020]">
            {en
              ? "Constitutions of the main countries. The text opens on an official site. Where there is no single constitution, only the basic document named in that country's law is opened."
              : "주요 나라의 헌법입니다. 원문은 공식 사이트에서 엽니다. 한 권의 헌법전이 없는 나라는 그 법에 적힌 기본 문서만 엽니다."}
          </p>
          <ul className="mt-1.5 grid gap-1.5">
            {[...NATIONAL_CONSTITUTIONS]
              .sort((a, b) => (en ? a.countryEn : a.countryKo).localeCompare(en ? b.countryEn : b.countryKo, en ? "en" : "ko"))
              .map((row) => (
              <li key={row.id} className="rounded-sm border border-[#6b4a22]/25 bg-[#efe0bc]/80 px-2 py-1.5">
                <p className="text-micro font-semibold">
                  {en ? row.countryEn : row.countryKo}
                  {" · "}
                  {en ? row.titleEn : row.titleKo}
                </p>
                {row.noteKo || row.noteEn ? (
                  <p className="mt-0.5 text-micro leading-snug">{en ? row.noteEn : row.noteKo}</p>
                ) : null}
                <p className="mt-0.5 text-micro">
                  {en ? row.sourceNameEn : row.sourceNameKo}
                  {row.links.map((link) => (
                    <span key={link.url}>
                      {" · "}
                      <a href={link.url} target="_blank" rel="noreferrer" className="underline">
                        {en ? link.labelEn : link.labelKo}
                      </a>
                    </span>
                  ))}
                </p>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {panel === "dates" ? (
        <>
          <p className="mt-1.5 px-1 text-micro leading-snug text-[#5c4020]">
            {en
              ? "Upcoming elections and party congresses for the main countries. A passed date leaves this list. Ukraine's presidential election stays until a new date is set."
              : "주요 나라의 예정된 선거와 당대회입니다. 날짜가 지나면 목록에서 빠집니다. 우크라이나 대통령 선거만, 새 날짜가 나오기 전까지 지난 날을 남겨 둡니다."}
          </p>
          <ul className="mt-1.5 grid gap-1.5">
            {rows.map((row) => {
              return (
                <li key={row.id} className="rounded-sm border border-[#6b4a22]/25 bg-[#efe0bc]/80 px-2 py-1.5">
                  <p className="text-micro font-semibold">
                    {en ? row.countryEn : row.countryKo}
                    {" · "}
                    {en ? row.titleEn : row.titleKo}
                  </p>
                  <p className="mt-0.5 text-micro leading-snug">{en ? row.whenEn : row.whenKo}</p>
                  <p className="mt-0.5 text-micro">
                    {en ? row.sourceNameEn : row.sourceNameKo}
                    {" · "}
                    <a href={row.sourceUrl} target="_blank" rel="noreferrer" className="underline">
                      {en ? "Open" : "열기"}
                    </a>
                  </p>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </section>
  );
}
