"use client";

import { useEffect, useId, useState } from "react";
import { NATIONAL_CONSTITUTIONS } from "@/data/nationalConstitutions";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { nextSchedule, orderedSchedules } from "@/lib/majorSchedule";

type Props = {
  lang: LabelLanguage;
  now?: number;
  /**
   * inline: 목록이 제자리에서 펼쳐진다(휴대폰 목록용).
   * note: 접힌 상태는 가로로 긴 쪽지 하나이고, 눌러야 창이 열린다.
   *       창은 쪽지 아래에 떠서 위쪽 크롬 높이를 바꾸지 않는다(지구본이 밀려 내려가지 않는다).
   */
  variant?: "inline" | "note";
};

type Panel = "dates" | "laws";

function nextLine(en: boolean, next: ReturnType<typeof nextSchedule>): string {
  if (!next) return en ? "No upcoming official date is on this list." : "이 목록에 다가오는 공식 일정이 없습니다.";
  return en
    ? `Next official date: ${next.titleEn}, ${next.whenEn}.`
    : `다음 공식 일정은 ${next.titleKo}, ${next.whenKo}입니다.`;
}

function ConstitutionList({ en }: { en: boolean }) {
  return (
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
  );
}

function DateList({ en, now }: { en: boolean; now: number }) {
  const rows = orderedSchedules(now);
  return (
    <>
      <p className="mt-1.5 px-1 text-micro leading-snug text-[#5c4020]">
        {en
          ? "Upcoming elections and party congresses for the main countries. A passed date leaves this list. Ukraine's presidential election stays until a new date is set."
          : "주요 나라의 예정된 선거와 당대회입니다. 날짜가 지나면 목록에서 빠집니다. 우크라이나 대통령 선거만, 새 날짜가 나오기 전까지 지난 날을 남겨 둡니다."}
      </p>
      <ul className="mt-1.5 grid gap-1.5">
        {rows.map((row) => (
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
        ))}
      </ul>
    </>
  );
}

/** 지정학 화면의 국가 중대 일정. 지도 핀은 만들지 않는다. */
export function MajorScheduleDesk({ lang, now = Date.now(), variant = "inline" }: Props) {
  const en = lang === "en";
  const next = nextSchedule(now);
  const windowId = useId();

  // inline: 일정·헌법 중 하나만 펼친다 (null = 둘 다 접힘)
  const [panel, setPanel] = useState<Panel | null>(null);
  const toggle = (nextPanel: Panel) => setPanel((value) => (value === nextPanel ? null : nextPanel));

  // note: 창이 열렸는지, 열렸다면 어느 탭인지
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Panel>("dates");

  useEffect(() => {
    if (variant !== "note" || !open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [variant, open]);

  if (variant === "note") {
    const label = en ? "Open national political calendars" : "각국 정치일정 바로보기";
    return (
      <section className="pointer-events-auto relative shrink-0" aria-label={en ? "Major national dates" : "국가 중대 일정"} data-major-schedules>
        {/* 접힌 상태: 크기가 늘 고정인 쪽지. 창이 열려도 높이가 바뀌지 않는다. */}
        <button
          type="button"
          className="inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-[3px] border border-[#6b4a22]/45 bg-[#f3e6c8]/95 px-3 text-micro font-semibold text-[#2a1c0a] shadow-md hover:bg-[#f7ecd3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#c9923a]"
          aria-expanded={open}
          aria-controls={windowId}
          onClick={() => setOpen((value) => !value)}
          data-major-schedules-note
        >
          {label}
        </button>
        {open ? (
          <div
            id={windowId}
            role="dialog"
            aria-label={en ? "National political calendars" : "각국 정치일정"}
            className="absolute left-0 top-full z-[110] mt-1 max-h-[min(70vh,40rem)] w-[min(44rem,calc(100vw-2rem))] overflow-y-auto rounded-md border border-[#6b4a22]/35 bg-[#f3e6c8]/98 p-2 text-[#2a1c0a] shadow-xl"
            data-major-schedules-window
          >
            <div className="flex items-start justify-between gap-2">
              <p className="px-1 text-micro font-semibold leading-snug">{nextLine(en, next)}</p>
              <button
                type="button"
                className="-mt-0.5 shrink-0 rounded-sm px-2 py-0.5 text-sm leading-none text-[#2a1c0a] hover:bg-[#6b4a22]/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#c9923a]"
                aria-label={en ? "Close" : "닫기"}
                onClick={() => setOpen(false)}
                data-major-schedules-close
              >
                ✕
              </button>
            </div>
            <div className="mt-1.5 flex gap-1" role="tablist">
              {(["dates", "laws"] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  className={`rounded-sm px-2 py-0.5 text-micro ${
                    tab === id ? "bg-[#6b4a22]/20 font-semibold" : "underline"
                  }`}
                  onClick={() => setTab(id)}
                >
                  {id === "dates" ? (en ? "Dates" : "일정") : en ? "Constitutions" : "헌법"}
                </button>
              ))}
            </div>
            {tab === "dates" ? <DateList en={en} now={now} /> : <ConstitutionList en={en} />}
          </div>
        ) : null}
      </section>
    );
  }

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
        <span className="font-semibold">{nextLine(en, next)}</span>
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
      {panel === "laws" ? <ConstitutionList en={en} /> : null}
      {panel === "dates" ? <DateList en={en} now={now} /> : null}
    </section>
  );
}
