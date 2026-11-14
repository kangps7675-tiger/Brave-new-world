"use client";

import { useMemo } from "react";
import { DocItem, TOPIC_EN, TOPIC_KO } from "@/components/globe/PolledDocsSection";
import { usePolledOfficialDocs } from "@/hooks/usePolledOfficialDocs";
import { actorLabel, buildDiplomacyThreads, type DiplomacyThread } from "@/lib/officialDocs/threads";
import { issuerNameEn, issuerNameKo } from "@/lib/countryName";

/** 공식 문서를 당사자·주제·시간으로 자동 묶은 외교·협상 가닥 목록(15분 캐시된 문서를 쓴다) */
export function useDiplomacyThreads(): DiplomacyThread[] {
  const docs = usePolledOfficialDocs();
  return useMemo(() => buildDiplomacyThreads(docs).slice(0, 8), [docs]);
}

export function threadTitle(thread: DiplomacyThread, en: boolean): string {
  return thread.actors.map((a) => actorLabel(a, en)).join(en ? " · " : " · ");
}

const TAG_NAME: Record<string, { ko: string; en: string }> = {
  hormuz: { ko: "호르무즈", en: "Hormuz" },
  "red-sea": { ko: "홍해", en: "Red Sea" },
  bab: { ko: "바브엘만데브", en: "Bab el-Mandeb" },
  zaporizhzhia: { ko: "자포리자", en: "Zaporizhzhia" },
  kharkiv: { ko: "하르키우", en: "Kharkiv" },
  donbas: { ko: "돈바스", en: "Donbas" },
  bakhmut: { ko: "바흐무트", en: "Bakhmut" },
  kherson: { ko: "헤르손", en: "Kherson" },
  rafah: { ko: "라파", en: "Rafah" },
  gaza: { ko: "가자", en: "Gaza" },
  "taiwan-strait": { ko: "대만해협", en: "Taiwan Strait" },
  kinmen: { ko: "진먼", en: "Kinmen" },
  dmz: { ko: "비무장지대", en: "DMZ" },
};

function tagLabel(id: string, en: boolean): string {
  const t = TAG_NAME[id];
  return t ? (en ? t.en : t.ko) : id;
}

function topicLabel(id: string, en: boolean): string {
  return (en ? TOPIC_EN[id] : TOPIC_KO[id]) ?? id;
}

/** 속보 창 왼쪽 목록의 "외교·협상" 묶음. 가닥이 없으면 아무것도 그리지 않는다. */
export function DiplomacyNavGroup({
  threads,
  en,
  selectedId,
  onSelect,
}: {
  threads: readonly DiplomacyThread[];
  en: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (threads.length === 0) return null;
  return (
    <div className="flex shrink-0 gap-1 sm:flex-col" data-diplomacy-nav>
      <p className="flex shrink-0 items-center gap-1 px-1 pt-1 text-micro font-semibold sm:sticky sm:top-0 sm:z-10 sm:bg-[#e9d9b4]">
        <span className="rounded-sm bg-[#2a1c0a] px-1 bg-indigo-500/25 text-indigo-100">{en ? "Diplomacy" : "외교·협상"}</span>
        <span className="tabular-nums text-[#5c4020]/75">{threads.length}</span>
      </p>
      {threads.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onSelect(t.id)}
          className={`shrink-0 rounded-sm border px-2 py-1 text-left text-micro leading-snug sm:w-full ${
            t.id === selectedId ? "border-[#6b4a22] bg-[#f7edd4]" : "border-[#6b4a22]/25 bg-[#efe0bc]/70 hover:bg-[#f3e6c8]"
          }`}
          aria-pressed={t.id === selectedId}
        >
          <span className="block font-semibold">{threadTitle(t, en)}</span>
          <span className="block text-[#5c4020]/80">
            {t.topics.length > 0 ? `${t.topics.map((x) => topicLabel(x, en)).join(", ")} · ` : ""}
            {en ? `${t.docs.length} statements · ` : `성명·발표 ${t.docs.length}건 · `}
            {t.lastAt.slice(5)}
          </span>
        </button>
      ))}
    </div>
  );
}

/** 가닥 하나: 누가 언제 무슨 말을 했는지 시간순으로. 어느 쪽이 맞는지는 가리지 않는다. */
export function DiplomacyThreadView({ thread, en, onBack }: { thread: DiplomacyThread; en: boolean; onBack: () => void }) {
  const silent = thread.silent.map((a) => actorLabel(a, en));
  return (
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3" data-diplomacy-thread>
      <button
        type="button"
        onClick={onBack}
        className="rounded-sm border border-[#6b4a22]/40 bg-[#efe0bc]/95 px-2.5 py-0.5 text-micro text-[#3d2a12] hover:bg-[#e8d6a8] sm:hidden"
      >
        {en ? "← Back to flashes" : "← 속보로 돌아가기"}
      </button>
      <div>
        <h2 className="text-base font-semibold leading-snug">{threadTitle(thread, en)}</h2>
        <p className="mt-0.5 text-micro text-[#5c4020]">
          {thread.firstAt} ~ {thread.lastAt}
          {thread.topics.length > 0 ? ` · ${thread.topics.map((x) => topicLabel(x, en)).join(", ")}` : ""}
          {thread.tags.length > 0 ? ` · ${thread.tags.map((x) => tagLabel(x, en)).join(", ")}` : ""}
        </p>
        <p className="mt-1 text-micro leading-snug text-[#5c4020]/80">
          {en
            ? "Grouped automatically from official statements by who is named, topic and dates. Not reviewed. Which side is right is not judged here."
            : "공식 성명·발표를 이름이 나온 당사자, 주제, 날짜로 자동으로 묶었습니다. 검수 전이며, 어느 쪽이 맞는지는 가리지 않습니다."}
        </p>
      </div>
      <div className="rounded-sm border border-[#6b4a22]/25 bg-[#f7edd4]/70 px-2 py-1.5" data-diplomacy-roles>
        <p className="text-micro font-semibold text-[#5c4020]">{en ? "Countries in this thread" : "이 가닥에 나온 나라"}</p>
        <ul className="mt-0.5 grid gap-0.5">
          {thread.actors.map((a) => {
            const r = thread.roles[a];
            const bits = [
              r?.spoke ? (en ? `issued ${r.spoke}` : `직접 발표 ${r.spoke}건`) : null,
              r?.named ? (en ? `named in others' statements ${r.named}` : `다른 나라 발표에 언급 ${r.named}건`) : null,
              r?.mediation ? (en ? `near mediation wording ${r.mediation}` : `중재·주선 표현 가까이 ${r.mediation}건`) : null,
            ].filter(Boolean);
            return (
              <li key={a} className="text-micro leading-snug">
                <span className="font-semibold">{actorLabel(a, en)}</span>
                {bits.length > 0 ? <span className="text-[#5c4020]"> · {bits.join(" · ")}</span> : null}
              </li>
            );
          })}
        </ul>
        {thread.mediators.filter((m) => !thread.actors.includes(m.key)).length > 0 ? (
          <p className="mt-1 text-micro leading-snug text-[#3d2a12]">
            {en ? "Named next to mediation wording: " : "중재·주선 표현 가까이에 이름이 나온 나라: "}
            {thread.mediators
              .filter((m) => !thread.actors.includes(m.key))
              .map((m) => `${actorLabel(m.key, en)}(${m.count}${en ? "" : "건"})`)
              .join(", ")}
          </p>
        ) : null}
        <p className="mt-1 text-micro leading-snug text-[#5c4020]/80">
          {en
            ? "Whether a country is a direct party or a third party (mediator, host, commentator) is not decided automatically. Issuing a statement does not make a country a party, and being named does not make it a third party."
            : "직접 당사자인지 제3자(중재·개최·논평)인지는 자동으로 가르지 않습니다. 발표를 냈다고 당사자인 것도, 이름이 나왔다고 제3자인 것도 아닙니다."}
        </p>
      </div>
      {silent.length > 0 ? (
        <p className="rounded-sm border border-dashed border-[#6b4a22]/40 px-2 py-1 text-micro leading-snug text-[#3d2a12]" data-diplomacy-silent>
          {en
            ? `No statement collected yet from: ${silent.join(", ")}. That may mean they said nothing, or that we could not collect it.`
            : `${silent.join(", ")}: 이 가닥에서 수집된 공식 발표가 아직 없습니다. 말이 없었다는 뜻일 수도, 우리가 수집하지 못한 것일 수도 있습니다.`}
        </p>
      ) : null}
      <ol className="grid gap-2" data-diplomacy-timeline>
        {thread.docs.map((doc) => (
          <li key={doc.id}>
            <p className="px-0.5 text-micro font-semibold text-[#5c4020]">
              {doc.publishedAt} · {en ? issuerNameEn(doc.issuerId) : issuerNameKo(doc.issuerId)}
            </p>
            <ul className="mt-0.5 grid gap-1">
              <DocItem match={{ doc, score: 0, reasons: { places: [], topics: [], terms: [], actor: false } }} en={en} />
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}
