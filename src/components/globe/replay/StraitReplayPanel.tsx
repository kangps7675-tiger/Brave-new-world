"use client";

import type { LabelLanguage } from "@/lib/layerPrefs";
import { sr } from "@/lib/straitReplay/i18n";
import type { StraitReplayResponse } from "@/lib/straitReplay/types";
import { ReplayTimeline } from "@/components/globe/replay/ReplayTimeline";

type Props = {
  lang: LabelLanguage;
  data: StraitReplayResponse;
  onClose: () => void;
  onSelectEvent: (eventId: string) => void;
};

function DistBlock({
  lang,
  title,
  rows,
}: {
  lang: LabelLanguage;
  title: string;
  rows: StraitReplayResponse["distributions"];
}) {
  if (rows.length === 0) return null;
  return (
    <div className="mt-2">
      <p className="text-micro font-semibold text-teal-50/90">{title}</p>
      <ul className="mt-1 space-y-1">
        {rows.map((d) => (
          <li
            key={`${d.metric}-${d.horizon}`}
            className="rounded border border-white/10 bg-black/25 px-2 py-1 text-micro text-teal-50/85"
          >
            <span className="font-semibold">
              {d.metric} · {d.horizon}
            </span>
            {d.insufficient ? (
              <span className="ml-2 text-amber-200/90">
                {sr("insufficient", lang, { n: d.sampleSize })}
              </span>
            ) : (
              <span className="ml-2">
                min {d.min?.toFixed(1)}% · {sr("median", lang)}{" "}
                {d.median?.toFixed(1)}% · max {d.max?.toFixed(1)}%
                <span className="ml-1 text-teal-100/50">
                  ({d.points.map((p) => p.toFixed(0)).join(", ")}%)
                </span>
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StraitReplayPanel({
  lang,
  data,
  onClose,
  onSelectEvent,
}: Props) {
  const event = data.event;
  const title =
    event == null
      ? sr("empty", lang)
      : lang === "en"
        ? event.titleEn
        : event.titleKo;

  return (
    <section
      className="pointer-events-auto max-h-[min(70vh,520px)] w-[min(420px,94vw)] overflow-y-auto rounded border border-teal-400/35 bg-[#041018]/92 p-3 shadow-lg"
      aria-label={sr("panelTitle", lang)}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-micro font-semibold tracking-wide text-teal-200/80">
            {sr("panelTitle", lang)}
          </p>
          <h2 className="mt-0.5 text-sm font-semibold text-teal-50">{title}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded border border-white/15 px-1.5 py-0.5 text-micro text-teal-100/70"
        >
          {sr("close", lang)}
        </button>
      </div>

      {data.isSynthetic ? (
        <span className="mt-1 inline-block rounded border border-amber-300/50 bg-amber-500/20 px-1.5 py-0.5 text-micro font-semibold text-amber-100">
          {sr("sampleBadge", lang)}
        </span>
      ) : null}

      <p className="mt-2 text-micro text-teal-100/75">
        {sr("historyBanner", lang, { n: data.sampleSize })}
      </p>

      {data.calmNote && data.lastEventOn ? (
        <p className="mt-1 text-micro text-teal-100/60">
          {sr("calm", lang, { date: data.lastEventOn })}
        </p>
      ) : null}

      {event ? (
        <>
          <ReplayTimeline
            lang={lang}
            eventOn={event.occurredOn}
            series={data.trafficSeries}
          />
          <DistBlock
            lang={lang}
            title={sr("trafficChart", lang)}
            rows={data.distributions.filter((d) => d.metric === "traffic_total")}
          />
          <DistBlock
            lang={lang}
            title={sr("priceChart", lang)}
            rows={data.distributions.filter((d) => d.metric !== "traffic_total")}
          />
        </>
      ) : null}

      {data.similarEvents.length > 0 ? (
        <div className="mt-2">
          <p className="text-micro font-semibold text-teal-50/90">
            {sr("similar", lang)}
          </p>
          <ul className="mt-1 space-y-1">
            {data.similarEvents.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => onSelectEvent(e.id)}
                  className="w-full rounded border border-white/10 bg-white/5 px-2 py-1 text-left text-micro text-teal-50/85 hover:bg-white/10"
                >
                  {e.occurredOn} · {lang === "en" ? e.titleEn : e.titleKo}
                  {e.isSynthetic ? ` · ${sr("sampleBadge", lang)}` : ""}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-3 border-t border-white/10 pt-2">
        <p className="text-micro font-semibold text-teal-100/70">
          {sr("attribution", lang)}
        </p>
        <ul className="mt-1 space-y-0.5 text-micro text-teal-100/55">
          {data.attributions.map((a) => (
            <li key={a.id}>
              <a
                href={a.url}
                target="_blank"
                rel="noreferrer"
                className="underline decoration-teal-500/40"
              >
                {a.label}
              </a>
              {" — "}
              {a.note}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-micro leading-snug text-teal-100/50">
          {sr("disclaimer", lang)}
        </p>
        {data.dataThrough ? (
          <p className="mt-1 text-micro text-teal-100/40">
            dataThrough {data.dataThrough}
          </p>
        ) : null}
      </div>
    </section>
  );
}
