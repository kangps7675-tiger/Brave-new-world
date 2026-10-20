"use client";

import { useDialog } from "@/hooks/useDialog";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { HotTheaterFocus } from "@/lib/hotTheaterLayers";

type Props = {
  focus: HotTheaterFocus;
  lang: LabelLanguage;
  onAccept: () => void;
  onDismiss: () => void;
};

/**
 * 전역 지구본 입장 직후 — 핫 지역으로 갈지 묻는 선택창.
 * 수락 시에만 fly + 핫 레이어 패치.
 */
export function HotTheaterOfferBanner({ focus, lang, onAccept, onDismiss }: Props) {
  const en = lang === "en";
  const place = en ? focus.labelEn : focus.labelKo;
  /**
   * ⚠️ `aria-modal="true"`를 뗐다 (P1-7).
   *
   * 이건 화면 상단의 **제안 배너**이지 사용자를 막는 모달이 아니다. 뒤의 지도·nav는
   * 그대로 조작할 수 있다. 그런데 aria-modal은 보조기술에게 "바깥은 비활성"이라고
   * 알리는 속성이라, 스크린리더 사용자는 **실제로는 살아 있는 지도에 접근하지
   * 못하게 된다.** 잘못된 표기가 없느니만 못한 경우다.
   *
   * 대신 Escape로 닫히게 하고 포커스는 가두지 않는다.
   */
  const dialogRef = useDialog<HTMLDivElement>({
    open: true,
    onClose: onDismiss,
    trapFocus: false,
  });

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="pointer-events-auto fixed left-1/2 top-[max(0.75rem,env(safe-area-inset-top))] z-[800] w-[min(94vw,32rem)] -translate-x-1/2 outline-none"
      role="dialog"
      aria-labelledby="hot-theater-offer-title"
      aria-describedby="hot-theater-offer-body"
    >
      <div className="relative overflow-hidden rounded-md border border-rose-400/45 bg-[#180a10]/95 shadow-[0_18px_56px_rgba(80,0,30,0.45)] backdrop-blur-md">
        <div className="relative border-b border-rose-400/25 bg-rose-950/45 px-4 py-3">
          <p className="text-meta font-medium uppercase tracking-[0.16em] text-rose-200/75">
            {en ? "Today’s hot zone" : "오늘의 핫 지역"}
          </p>
          <p
            id="hot-theater-offer-title"
            className="mt-1 text-[15px] font-semibold leading-snug text-white"
          >
            {place}
          </p>
        </div>
        <div className="relative space-y-3 px-4 py-3">
          <p
            id="hot-theater-offer-body"
            className="text-caption leading-relaxed text-rose-50/85"
          >
            {en
              ? "The globe starts worldwide. Fly to wherever ranks hottest right now?"
              : "지금은 전 세계를 보고 있습니다. 이 순간 가장 핫한 지역으로 이동할까요?"}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onAccept}
              className="rounded-md border border-rose-300/50 bg-rose-500/25 px-3.5 py-1.5 text-caption font-semibold text-rose-50 hover:bg-rose-500/40"
            >
              {en ? "Yes · Go there" : "예 · 이동하기"}
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-md border border-white/10 bg-transparent px-3 py-1.5 text-caption text-white/70 hover:bg-white/5 hover:text-white"
            >
              {en ? "Stay global" : "전역 보기 유지"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
