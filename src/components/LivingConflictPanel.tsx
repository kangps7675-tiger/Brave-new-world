"use client";

import { useCallback, useEffect, useState } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";
import {
  TAIWAN_STRAIT_CONFLICT_ID,
  type LivingFixedStage,
  type LivingSixW,
  type LivingTimelineEntry,
} from "@/data/livingConflicts/taiwanStrait";
import {
  isFollowingLivingConflict,
  toggleFollowLivingConflict,
} from "@/lib/livingConflictPrefs";
import { trackEvent } from "@/lib/trackClient";

type LivingConflictPayload = {
  conflict: {
    id: string;
    titleKo: string;
    titleEn: string;
    center: { lat: number; lng: number };
    altitude: number;
  };
  sixW: LivingSixW;
  stages: LivingFixedStage[];
  livingEntries: LivingTimelineEntry[];
  updatedAt: string;
  attribution: string;
};

type LivingConflictPanelProps = {
  lang: LabelLanguage;
  open: boolean;
  onClose: () => void;
  onFlyToMap: (lat: number, lng: number, altitude: number) => void;
};

function SixWBlock({ sixW, ko }: { sixW: LivingSixW; ko: boolean }) {
  const rows: { k: string; v: string }[] = [
    { k: ko ? "누가" : "Who", v: ko ? sixW.whoKo : sixW.whoEn },
    { k: ko ? "무엇" : "What", v: ko ? sixW.whatKo : sixW.whatEn },
    { k: ko ? "언제" : "When", v: ko ? sixW.whenKo : sixW.whenEn },
    { k: ko ? "어디서" : "Where", v: ko ? sixW.whereKo : sixW.whereEn },
    { k: ko ? "왜" : "Why", v: ko ? sixW.whyKo : sixW.whyEn },
    { k: ko ? "어떻게" : "How", v: ko ? sixW.howKo : sixW.howEn },
  ];
  return (
    <dl className="space-y-2 px-3 py-2">
      {rows.map((row) => (
        <div key={row.k}>
          <dt className="text-[9px] font-semibold uppercase tracking-[0.16em] text-amber-200/55">
            {row.k}
          </dt>
          <dd className="mt-0.5 text-[11px] leading-4 text-slate-200/85">{row.v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function LivingConflictPanel({
  lang,
  open,
  onClose,
  onFlyToMap,
}: LivingConflictPanelProps) {
  const ko = lang !== "en";
  const [data, setData] = useState<LivingConflictPayload | null>(null);
  const [following, setFollowing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFollowing(isFollowingLivingConflict(TAIWAN_STRAIT_CONFLICT_ID));
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/living-conflict/${TAIWAN_STRAIT_CONFLICT_ID}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          if (!cancelled) setLoadError(true);
          return;
        }
        const json = (await res.json()) as LivingConflictPayload & { ok?: boolean };
        if (!cancelled) {
          setData(json);
          setLoadError(false);
        }
      } catch {
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleFollow = useCallback(() => {
    const next = toggleFollowLivingConflict(TAIWAN_STRAIT_CONFLICT_ID);
    const on = next.followedConflictIds.includes(TAIWAN_STRAIT_CONFLICT_ID);
    setFollowing(on);
    trackEvent(
      on ? "living_conflict_follow" : "living_conflict_unfollow",
      { conflictId: TAIWAN_STRAIT_CONFLICT_ID },
      { lang },
    );
  }, [lang]);

  const handleFly = useCallback(() => {
    const c = data?.conflict;
    if (!c) return;
    onFlyToMap(c.center.lat, c.center.lng, c.altitude);
    trackEvent(
      "living_conflict_fly",
      { conflictId: TAIWAN_STRAIT_CONFLICT_ID },
      { lang },
    );
  }, [data, lang, onFlyToMap]);

  if (!open) return null;

  const title = data
    ? ko
      ? data.conflict.titleKo
      : data.conflict.titleEn
    : ko
      ? "대만해협 · 진행형"
      : "Taiwan Strait · Living";

  return (
    <aside
      id="living-conflict-panel"
      className="pointer-events-auto absolute bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] right-3 z-[48] flex max-h-[min(58vh,480px)] w-[min(94vw,360px)] flex-col overflow-hidden rounded-2xl border border-amber-300/25 bg-[#100e0a]/94 shadow-2xl backdrop-blur-xl"
      role="complementary"
      aria-label={title}
    >
      <div className="flex items-start justify-between gap-2 border-b border-amber-200/10 px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.2em] text-amber-200/55">
            {ko ? "진행형 분쟁 · 팔로우" : "Living conflict · follow"}
          </p>
          <h2 className="mt-0.5 truncate text-sm font-medium text-amber-50">{title}</h2>
          <p className="mt-1 text-[10px] leading-4 text-amber-100/50">
            {ko
              ? "11대 분쟁사와 같은 6하원칙. 「어제 이후」는 매일 붙습니다."
              : "Same 6W format as archived theaters. 「Since yesterday」 grows daily."}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="tap-target shrink-0 rounded-lg border border-amber-300/25 px-2 py-1 text-[10px] text-amber-100/70 transition hover:border-amber-200/40 hover:text-amber-50"
        >
          {ko ? "닫기" : "Close"}
        </button>
      </div>

      <div className="flex gap-1.5 border-b border-amber-200/10 px-3 py-2">
        <button
          type="button"
          onClick={handleFollow}
          className={`tap-target min-h-[44px] flex-1 rounded-lg border px-2 text-[11px] font-medium transition ${
            following
              ? "border-amber-300/50 bg-amber-500/25 text-amber-50"
              : "border-amber-300/25 bg-amber-500/10 text-amber-50 hover:border-amber-200/40"
          }`}
        >
          {following ? (ko ? "팔로우 중" : "Following") : ko ? "팔로우" : "Follow"}
        </button>
        <button
          type="button"
          onClick={handleFly}
          disabled={!data}
          className="tap-target min-h-[44px] shrink-0 rounded-lg border border-sky-300/25 bg-sky-500/10 px-2 text-[11px] font-medium text-sky-50 transition hover:border-sky-200/40 disabled:opacity-50"
        >
          {ko ? "지도에서 보기" : "View on map"}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loadError && !data ? (
          <p className="px-3 py-4 text-[12px] text-rose-200/80">
            {ko ? "불러오지 못했습니다. 시드로 재시도하세요." : "Failed to load. Try again."}
          </p>
        ) : null}

        {data ? (
          <>
            <div className="border-b border-amber-200/10">
              <p className="px-3 pt-2 text-[9px] uppercase tracking-[0.18em] text-amber-200/45">
                {ko ? "6하원칙" : "Six W"}
              </p>
              <SixWBlock sixW={data.sixW} ko={ko} />
            </div>

            <div className="border-b border-amber-200/10 px-2 py-2">
              <p className="px-1 pb-1.5 text-[9px] uppercase tracking-[0.18em] text-amber-200/45">
                {ko ? "고정 타임라인" : "Fixed stages"}
              </p>
              <ol className="space-y-1.5">
                {data.stages.map((stage) => (
                  <li
                    key={stage.id}
                    className="rounded-xl border border-amber-200/10 bg-amber-500/5 px-2.5 py-2"
                  >
                    <span className="text-[10px] font-semibold text-amber-200/70">
                      {stage.order}. {stage.yearLabel}
                    </span>
                    <p className="mt-0.5 text-[12px] font-medium text-amber-50">
                      {ko ? stage.titleKo : stage.titleEn}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[10px] leading-4 text-amber-100/55">
                      {ko ? stage.bodyKo : stage.bodyEn}
                    </p>
                  </li>
                ))}
              </ol>
            </div>

            <div className="px-2 py-2">
              <p className="px-1 pb-1.5 text-[9px] uppercase tracking-[0.18em] text-sky-200/55">
                {ko ? "어제 이후" : "Since yesterday"}
              </p>
              {data.livingEntries.length === 0 ? (
                <p className="px-1 text-[11px] text-slate-400">
                  {ko ? "아직 추가된 줄이 없습니다." : "No living entries yet."}
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {data.livingEntries.map((entry) => (
                    <li
                      key={entry.id}
                      className="rounded-xl border border-sky-300/15 bg-sky-500/5 px-2.5 py-2"
                    >
                      <span className="text-[10px] tabular-nums text-sky-200/60">
                        {entry.entryDate}
                      </span>
                      <p className="mt-0.5 text-[12px] leading-snug text-sky-50">
                        {ko ? entry.headlineKo : entry.headlineEn}
                      </p>
                      {entry.sourceUrls[0] ? (
                        <a
                          href={entry.sourceUrls[0]}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-block text-[10px] text-sky-300/70 underline decoration-sky-400/30 underline-offset-2"
                        >
                          {ko ? "출처" : "Source"}
                        </a>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : (
          <p className="px-3 py-4 text-[12px] text-slate-400">{ko ? "불러오는 중…" : "Loading…"}</p>
        )}
      </div>

      <div className="border-t border-amber-200/10 px-3 py-2">
        <p className="text-[9px] leading-4 text-slate-500">
          {data?.attribution ??
            (ko
              ? "GDELT · 자동 요약 · 오보 가능"
              : "GDELT · auto summary · may be wrong")}
        </p>
      </div>
    </aside>
  );
}

/** 하단 인텔 근처 — 대만해협 팔로우 칩 */
export function LivingTaiwanFollowChip({
  lang,
  onOpen,
  economy,
}: {
  lang: LabelLanguage;
  onOpen: () => void;
  economy?: boolean;
}) {
  const ko = lang !== "en";
  const [following, setFollowing] = useState(false);
  const [latest, setLatest] = useState<string | null>(null);

  useEffect(() => {
    setFollowing(isFollowingLivingConflict(TAIWAN_STRAIT_CONFLICT_ID));
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/living-conflict/${TAIWAN_STRAIT_CONFLICT_ID}`, {
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as {
          livingEntries?: LivingTimelineEntry[];
        };
        const first = json.livingEntries?.[0];
        if (first && !cancelled) {
          setLatest(ko ? first.headlineKo : first.headlineEn);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ko]);

  if (economy) return null;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="pointer-events-auto flex w-full items-start gap-2 overflow-hidden rounded-2xl border border-amber-400/30 bg-[#120e08]/90 px-3 py-2 text-left shadow-lg backdrop-blur-md transition hover:border-amber-300/50"
    >
      <span className="mt-0.5 shrink-0 rounded-md border border-amber-400/35 bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-amber-200/90">
        {following ? (ko ? "팔로우 중" : "Following") : ko ? "팔로우" : "Follow"}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-medium text-amber-50">
          {ko ? "대만해협 팔로우" : "Follow Taiwan Strait"}
        </span>
        {latest ? (
          <span className="mt-0.5 line-clamp-2 block text-[10px] leading-4 text-amber-100/55">
            {latest}
          </span>
        ) : (
          <span className="mt-0.5 block text-[10px] text-amber-100/45">
            {ko ? "어제 이후 · 매일 갱신" : "Since yesterday · daily"}
          </span>
        )}
      </span>
    </button>
  );
}
