"use client";

import { createPortal } from "react-dom";
import { ParchmentLetter } from "@/components/ParchmentLetter";
import { useLocalizedTextMap } from "@/hooks/useLocalizedTextMap";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { splitLiveuaTitleBody } from "@/lib/liveuamap/peelTitleUrls";
import { provenanceLines } from "@/lib/provenance";
import { stackSourceName, type StackItem } from "@/lib/incidentStack/build";
import { Z, zc } from "@/lib/uiStack";

type Props = {
  lang: LabelLanguage;
  items: StackItem[];
  index: number;
  onIndexChange: (next: number) => void;
  onDismiss: () => void;
  /** 일반 지도에서 그 위치로 */
  onGoToLocation: (item: StackItem) => void;
  /** 위성(세슘)으로 보기 */
  onViewSatellite: (item: StackItem) => void;
};

const SOURCE_LABEL: Record<StackItem["source"], { ko: string; en: string }> = {
  ukmto: { ko: "UKMTO(영국 해군 해상무역작전센터)", en: "UKMTO (UK Royal Navy)" },
  liveua: { ko: "Liveuamap", en: "Liveuamap" },
  nga: { ko: "미 NGA 항행안전 방송", en: "US NGA maritime safety broadcast" },
  case: { ko: "내 케이스", en: "My case" },
};

/** 선박 사건 스택의 한 건을 큰 양피지로 — 일반 속보 양피지와 같은 모양, 이전·다음으로 넘긴다. */
export function StackItemParchment({
  lang,
  items,
  index,
  onIndexChange,
  onDismiss,
  onGoToLocation,
  onViewSatellite,
}: Props) {
  const item = items[index];
  const en = lang === "en";
  // UKMTO 본문은 영어 원문 — 한글 모드에서는 번역해서 보여 준다
  const translated = useLocalizedTextMap(
    (item?.source === "ukmto" || item?.source === "nga") && item.detail
      ? [{ key: item.id, text: item.detail }]
      : [],
    en ? "en" : "ko",
  );
  if (!item) return null;

  const ev = item.liveua;
  let title = item.title;
  let body = "";
  if (ev) {
    const rawTitle = en ? ev.title : ev.titleKo?.trim() || ev.title;
    const rawBody = en ? ev.body : ev.bodyKo?.trim() || ev.body;
    const peeled = splitLiveuaTitleBody(rawTitle, rawBody, ev.sourceUrl);
    title = peeled.title;
    body = peeled.body;
  } else {
    body = (translated.get(item.id) ?? item.detail ?? "").trim();
  }

  const when = new Date(item.at).toISOString().slice(0, 16).replace("T", " ");
  const meta = [item.place, `${when} UTC`].filter(Boolean).join(" · ");
  const coord = `${item.lat.toFixed(4)}, ${item.lng.toFixed(4)}`;
  const sourceLine = en
    ? `Source: ${SOURCE_LABEL[item.source].en} · ${coord}`
    : `출처: ${SOURCE_LABEL[item.source].ko} · ${coord}`;
  const note =
    item.source === "ukmto"
      ? en
        ? "UKMTO withholds vessel names."
        : "UKMTO는 선박명을 공개하지 않습니다."
      : null;

  const timeLines = item.times
    ? provenanceLines(item.times, stackSourceName(item), en ? "en" : "ko")
    : [];
  const multi = items.length > 1;
  const btn =
    "rounded-sm border border-[#6b4a22]/40 bg-[#efe0bc]/95 px-2.5 py-0.5 text-micro text-[#3d2a12] hover:bg-[#e8d6a8] disabled:opacity-40";

  const bodyExtra = (
    <div className="space-y-3 border-t border-[#6b4a22]/25 pt-3">
      {multi ? (
        <section
          aria-label={en ? "Incident deck" : "사건 넘기기"}
          className="flex flex-wrap items-center justify-between gap-2"
        >
          <p className="text-micro font-semibold text-[#5c4020]/90">
            {en ? `Incident ${index + 1} of ${items.length}` : `사건 ${index + 1} / ${items.length}`}
          </p>
          <div className="flex gap-1.5">
            <button type="button" className={btn} disabled={index <= 0} onClick={() => onIndexChange(index - 1)}>
              {en ? "Previous" : "이전"}
            </button>
            <button
              type="button"
              className={btn}
              disabled={index >= items.length - 1}
              onClick={() => onIndexChange(index + 1)}
            >
              {en ? "Next" : "다음"}
            </button>
          </div>
        </section>
      ) : null}
      {timeLines.length > 0 ? (
        <section aria-label={en ? "Timeline" : "시각"}>
          <p className="text-micro font-semibold uppercase tracking-wide text-[#5c4020]/90">
            {en ? "Timeline" : "시각"}
          </p>
          <dl className="mt-1 space-y-0.5 text-micro text-[#3d2a12]">
            {timeLines.map((l) => (
              <div key={l.label} className="flex flex-wrap gap-x-2">
                <dt className="font-semibold text-[#5c4020]/90">{l.label}</dt>
                <dd className="tabular-nums">{l.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
      <section className="flex flex-wrap items-center gap-2">
        <button type="button" className={btn} onClick={() => onViewSatellite(item)}>
          {en ? "View in satellite" : "위성으로 보기"}
        </button>
        {note ? <p className="text-micro text-[#5c4020]/75">{note}</p> : null}
      </section>
    </div>
  );

  const chrome =
    typeof document !== "undefined"
      ? createPortal(
          <div className="pointer-events-none fixed inset-0" style={{ zIndex: Z.alert + 1 }}>
            <button
              type="button"
              className="pointer-events-auto absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-sm border border-[#6b4a22]/45 bg-[#f3e6c8]/95 text-lg leading-none text-[#3d2a12] shadow sm:right-6 sm:top-6"
              aria-label={en ? "Close" : "닫기"}
              onClick={onDismiss}
            >
              ×
            </button>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <ParchmentLetter
        key={item.id}
        lang={lang}
        title={title}
        paragraphs={[meta, body].filter((p): p is string => Boolean(p))}
        signOff={sourceLine}
        ctaLabel={en ? "Close" : "닫기"}
        onContinue={onDismiss}
        playUnfoldSound
        playBreakingDispatch
        typewriter={false}
        newsFlashFont
        blackInk
        titleId="stack-item-title"
        zIndexClass={zc("alert")}
        leadImageUrl={ev?.imageUrl}
        leadVideoUrl={ev?.videoUrl}
        secondaryCtaLabel={en ? "Go to location" : "위치로 가기"}
        onSecondaryCta={() => onGoToLocation(item)}
        bodyExtra={bodyExtra}
      />
      {chrome}
    </>
  );
}
