"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { trackEvent } from "@/lib/trackClient";
import {
  buildWhereIsItChoices,
  pickWhereIsItSpot,
  whereIsItSourceLabel,
  WHERE_IS_IT_ALTITUDE,
  WHERE_IS_IT_REGIONS,
  WHERE_IS_IT_ROUNDS,
  type WhereIsItPoolItem,
  type WhereIsItRegion,
  type WhereIsItSpot,
} from "@/lib/whereIsItGame";

type Props = {
  lang: LabelLanguage;
  pool: WhereIsItPoolItem[];
  onFlyTo: (lat: number, lng: number, altitude: number) => void;
  onClose: () => void;
};

/**
 * 지오게서 스타일 "여기 어디게".
 * 실제 이벤트 좌표로 날아가 지형만 보여 주고, 전장/해협 4지선다.
 */
export function WhereIsItGameOverlay({ lang, pool, onFlyTo, onClose }: Props) {
  const ko = lang !== "en";
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [spot, setSpot] = useState<WhereIsItSpot | null>(null);
  const [choices, setChoices] = useState<WhereIsItRegion[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const usedKeysRef = useRef<Set<string>>(new Set());
  const [phase, setPhase] = useState<"play" | "reveal" | "done">("play");
  const startedRef = useRef(false);

  const deal = useCallback(() => {
    const next = pickWhereIsItSpot(pool, usedKeysRef.current);
    if (!next) {
      setPhase("done");
      return;
    }
    const key = next.eventId ?? `${next.source}:${next.lat.toFixed(3)},${next.lng.toFixed(3)}`;
    usedKeysRef.current.add(key);
    setSpot(next);
    setChoices(buildWhereIsItChoices(next.regionId, 4));
    setPicked(null);
    setPhase("play");
    const jitterLat = (Math.random() - 0.5) * 0.35;
    const jitterLng = (Math.random() - 0.5) * 0.35;
    onFlyTo(next.lat + jitterLat, next.lng + jitterLng, WHERE_IS_IT_ALTITUDE);
    trackEvent(
      "where_is_it_deal",
      { source: next.source, regionId: next.regionId },
      { lang: ko ? "ko" : "en" },
    );
  }, [ko, onFlyTo, pool]);

  useEffect(() => {
    if (startedRef.current) return;
    if (pool.length < 1) return;
    startedRef.current = true;
    deal();
  }, [deal, pool.length]);

  const correctRegion = useMemo(
    () => (spot ? WHERE_IS_IT_REGIONS.find((r) => r.id === spot.regionId) : null),
    [spot],
  );

  function handlePick(id: string) {
    if (phase !== "play" || !spot || picked) return;
    setPicked(id);
    const hit = id === spot.regionId;
    if (hit) setScore((s) => s + 1);
    setPhase("reveal");
    onFlyTo(spot.lat, spot.lng, WHERE_IS_IT_ALTITUDE);
    trackEvent(
      "where_is_it_guess",
      { correct: hit, regionId: spot.regionId, picked: id, source: spot.source },
      { lang: ko ? "ko" : "en" },
    );
  }

  function handleNext() {
    const nextRound = round + 1;
    if (nextRound >= WHERE_IS_IT_ROUNDS) {
      setPhase("done");
      trackEvent(
        "where_is_it_done",
        { score, rounds: WHERE_IS_IT_ROUNDS },
        { lang: ko ? "ko" : "en" },
      );
      return;
    }
    setRound(nextRound);
    deal();
  }

  const finalScore = score;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[10025] flex justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4"
      role="dialog"
      aria-modal="false"
      aria-label={ko ? "여기 어디게" : "Where is this?"}
    >
      <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-amber-400/30 bg-[#0a1220]/94 shadow-2xl backdrop-blur-xl">
        <div className="flex items-start justify-between gap-2 border-b border-white/10 px-4 py-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-300/90">
              {ko ? "여기 어디게" : "Where is this?"}
            </p>
            <p className="mt-0.5 text-[12px] text-slate-400">
              {phase === "done"
                ? ko
                  ? `결과 ${finalScore}/${WHERE_IS_IT_ROUNDS}`
                  : `Score ${finalScore}/${WHERE_IS_IT_ROUNDS}`
                : ko
                  ? `${round + 1}/${WHERE_IS_IT_ROUNDS} · 지구본을 돌려 지형을 보세요`
                  : `${round + 1}/${WHERE_IS_IT_ROUNDS} · Spin the globe, read the terrain`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-[13px] text-slate-400 hover:bg-white/5 hover:text-slate-100"
            aria-label={ko ? "닫기" : "Close"}
          >
            ✕
          </button>
        </div>

        {phase === "done" ? (
          <div className="space-y-3 px-4 py-4">
            <p className="text-lg font-semibold text-amber-50">
              {ko
                ? finalScore >= 3
                  ? "밀덕 인증 · 전장 감각 확실"
                  : finalScore >= 2
                    ? "준수한 지정학 눈"
                    : "아직 지구본이 낯설다"
                : finalScore >= 3
                  ? "Theater sense certified"
                  : finalScore >= 2
                    ? "Solid eye for geography"
                    : "Globe still feels new"}
            </p>
            <p className="text-[13px] text-slate-400">
              {ko
                ? `실제 FIRMS·GDELT·AIS 좌표 ${WHERE_IS_IT_ROUNDS}곳 · ${finalScore}곳 맞춤`
                : `${finalScore}/${WHERE_IS_IT_ROUNDS} real FIRMS·GDELT·AIS spots`}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setRound(0);
                  setScore(0);
                  usedKeysRef.current = new Set();
                  startedRef.current = true;
                  setPhase("play");
                  deal();
                }}
                className="flex-1 rounded-xl border border-amber-400/40 bg-amber-500/15 px-3 py-2.5 text-[13px] font-semibold text-amber-100"
              >
                {ko ? "한 판 더" : "Play again"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/15 px-3 py-2.5 text-[13px] text-slate-300"
              >
                {ko ? "닫기" : "Close"}
              </button>
            </div>
          </div>
        ) : (
          <div className="px-4 py-3">
            {spot ? (
              <p className="mb-2 text-[11px] text-slate-500">
                {whereIsItSourceLabel(spot.source, ko)}
                {phase === "reveal" && correctRegion
                  ? ` · ${ko ? correctRegion.labelKo : correctRegion.labelEn}`
                  : ""}
              </p>
            ) : (
              <p className="mb-2 text-[12px] text-slate-500">
                {ko ? "좌표 풀이 비어 있습니다. 잠시 후 다시." : "No spots yet — try again soon."}
              </p>
            )}

            <div className="grid grid-cols-2 gap-2">
              {choices.map((c) => {
                const isPick = picked === c.id;
                const isCorrect = Boolean(spot && c.id === spot.regionId);
                let cls =
                  "rounded-xl border px-2.5 py-2.5 text-left text-[12px] font-medium transition ";
                if (phase === "reveal") {
                  if (isCorrect) cls += "border-emerald-400/50 bg-emerald-500/20 text-emerald-100";
                  else if (isPick) cls += "border-rose-400/40 bg-rose-500/15 text-rose-200";
                  else cls += "border-white/10 bg-white/5 text-slate-500";
                } else {
                  cls +=
                    "border-sky-300/25 bg-slate-950/60 text-slate-100 hover:border-amber-300/40 hover:bg-amber-500/10";
                }
                return (
                  <button
                    key={c.id}
                    type="button"
                    disabled={phase !== "play"}
                    onClick={() => handlePick(c.id)}
                    className={cls}
                  >
                    {ko ? c.labelKo : c.labelEn}
                  </button>
                );
              })}
            </div>

            {phase === "reveal" ? (
              <button
                type="button"
                onClick={handleNext}
                className="mt-3 w-full rounded-xl border border-amber-400/40 bg-amber-500/15 px-3 py-2.5 text-[13px] font-semibold text-amber-100"
              >
                {round + 1 >= WHERE_IS_IT_ROUNDS
                  ? ko
                    ? "결과 보기"
                    : "See results"
                  : ko
                    ? "다음 좌표"
                    : "Next spot"}
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
