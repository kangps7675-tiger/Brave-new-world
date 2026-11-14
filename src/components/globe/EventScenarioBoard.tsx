"use client";

import { useState } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { useTr } from "@/hooks/useTr";
import { buildEventScenarioBoard, type EventScenario, type ScenarioPath } from "@/lib/news/eventScenarios";
import type { NewsStreamItem } from "@/lib/news/types";

type Props = {
  lang: LabelLanguage;
  items: readonly NewsStreamItem[];
  /**
   * panel: 넓은 독립 패널(모바일 목록용).
   * accordion: 왼쪽 양피지 안의 접이식. 접힌 채로 "교차검증 보기 (N건)"만 보이고, 한 줄 목록으로 펼친다.
   *            갈래가 없으면 아무것도 그리지 않는다.
   */
  variant?: "panel" | "accordion";
};

const PATH_KO: Record<ScenarioPath, string> = {
  talks: "회담·협상",
  force: "보복·추가 무력",
  pause: "중단·휴전",
  sanction: "제재·봉쇄",
};

const PATH_EN: Record<ScenarioPath, string> = {
  talks: "Talks",
  force: "Retaliation or more force",
  pause: "Pause or ceasefire",
  sanction: "Sanctions or a blockade",
};

/** 당사자 매체가 한 말이라는 단서처럼 기사마다 다른 주의만 남긴다. 아무 기사에나 붙는 상투 문구는 쓰지 않는다. */
function line(row: EventScenario, en: boolean): string | null {
  const path = en ? PATH_EN[row.path] : PATH_KO[row.path];
  const actor = en ? row.actorEn : row.actorKo;
  if (row.stance === "initiative" && actor) {
    return en ? `${actor} said this. It is their initiative, not proof it happened.` : `${actor} 매체가 한 말이다. 그 나라의 이니셔티브이지, 실행의 확인이 아니다.`;
  }
  if (actor) {
    return en
      ? `This report says ${actor} spoke about ${path.toLowerCase()}. The sentence is not the act.`
      : `이 기사는 ${actor}의 ${path} 발언을 전한다. 말이 곧 실행은 아니다.`;
  }
  if (row.stance === "initiative") {
    return en ? "A party outlet said this. It is a statement, not confirmation." : "당사자 매체가 한 말이다. 성명이지, 확인이 아니다.";
  }
  return null;
}

/** 한 사건, 출처가 말한 갈래. 지역 네 갈래가 아니다. */
export function EventScenarioBoard({ lang, items, variant = "panel" }: Props) {
  const en = lang === "en";
  const board = buildEventScenarioBoard([...items]);
  const [open, setOpen] = useState(false);
  // 한글 모드에서는 기사 제목의 한국어 해석을 보여 준다(번역이 오기 전엔 원문 그대로라 해석 줄을 숨긴다)
  const tr = useTr(board ? [board.eventTitle, ...board.scenarios.map((r) => r.title)] : [], lang);
  const reading = (row: EventScenario) => {
    if (en) return null;
    const t = tr(row.title);
    return t !== row.title ? t : null;
  };

  if (variant === "accordion") {
    if (board == null) return null;
    const count = board.scenarios.length;
    return (
      <div className="rounded-sm border border-[#6b4a22]/30 bg-[#efe0bc]/60" data-event-scenarios>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-micro font-semibold text-[#5c4020]"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span>{en ? `Cross-check (${count})` : `교차검증 보기 (${count}건)`}</span>
          <span aria-hidden>{open ? "▲" : "▼"}</span>
        </button>
        {open ? (
          <div className="border-t border-[#6b4a22]/25 px-2 py-1.5">
            <p className="text-micro leading-snug">
              <span className="font-semibold">{en ? "The event. " : "이 사건. "}</span>
              {board.eventTitle}
              {" · "}
              {board.eventSource}
              {" · "}
              <a href={board.eventUrl} target="_blank" rel="noreferrer" className="underline">
                {en ? "Open" : "열기"}
              </a>
            </p>
            <ul className="mt-1.5 grid gap-1.5">
              {board.scenarios.map((row) => (
                <li key={row.url} className="rounded-sm border border-[#6b4a22]/25 bg-[#f7edd4]/80 px-2 py-1.5">
                  <p className="text-micro font-semibold">
                    {en ? PATH_EN[row.path] : PATH_KO[row.path]}
                    {row.stance === "initiative" ? (en ? " · their initiative" : " · 그 나라 이니셔티브") : ""}
                  </p>
                  <p className="mt-0.5 text-micro leading-snug">{row.title}</p>
                  {reading(row) ? <p className="mt-0.5 text-micro leading-snug text-[#3d2a12]">{reading(row)}</p> : null}
                  {line(row, en) ? <p className="mt-0.5 text-micro leading-snug text-[#5c4020]">{line(row, en)}</p> : null}
                  <p className="mt-0.5 text-micro">
                    {row.source}
                    {" · "}
                    <a href={row.url} target="_blank" rel="noreferrer" className="underline">
                      {en ? "Open" : "열기"}
                    </a>
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <section
      className="pointer-events-auto w-full max-w-3xl rounded-md border border-[#6b4a22]/35 bg-[#f3e6c8]/95 p-2 text-[#2a1c0a] shadow-lg"
      aria-label={en ? "Scenarios for one event" : "한 사건의 시나리오"}
      data-event-scenarios
    >
      <p className="px-1 text-micro font-semibold text-[#5c4020]">
        {en
          ? "One event. Only paths a source actually stated. No forecast is added."
          : "한 사건이다. 출처가 말한 갈래만 둔다. 전망을 보태지 않는다."}
      </p>
      {board == null ? (
        <p className="mt-1 px-1 text-micro leading-snug text-[#5c4020]">
          {en
            ? "No source yet splits this into a concrete next step."
            : "지금 기사 가운데, 한 사건을 가르는 구체적인 다음 문장이 없다."}
        </p>
      ) : (
        <>
          <p className="mt-1.5 px-1 text-micro leading-snug">
            <span className="font-semibold">{en ? "The event. " : "이 사건. "}</span>
            {board.eventTitle}
            {" · "}
            {board.eventSource}
            {" · "}
            <a href={board.eventUrl} target="_blank" rel="noreferrer" className="underline">
              {en ? "Open" : "열기"}
            </a>
          </p>
          <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
            {board.scenarios.map((row) => (
              <article key={row.url} className="rounded-sm border border-[#6b4a22]/25 bg-[#efe0bc]/80 px-2 py-1.5">
                <p className="text-micro font-semibold">
                  {en ? PATH_EN[row.path] : PATH_KO[row.path]}
                  {row.stance === "initiative" ? (en ? " · their initiative" : " · 그 나라 이니셔티브") : ""}
                </p>
                <p className="mt-0.5 text-micro leading-snug">{row.title}</p>
                {reading(row) ? <p className="mt-0.5 text-micro leading-snug text-[#3d2a12]">{reading(row)}</p> : null}
                {line(row, en) ? <p className="mt-0.5 text-micro leading-snug text-[#5c4020]">{line(row, en)}</p> : null}
                <p className="mt-0.5 text-micro">
                  {row.source}
                  {" · "}
                  <a href={row.url} target="_blank" rel="noreferrer" className="underline">
                    {en ? "Open" : "열기"}
                  </a>
                </p>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
