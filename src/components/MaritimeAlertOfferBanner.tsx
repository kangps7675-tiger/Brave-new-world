"use client";

import { useDialog } from "@/hooks/useDialog";
import type { LabelLanguage } from "@/lib/layerPrefs";
import type { NavareaSecurityKind } from "@/lib/navareaSecurity";

export type MaritimeAlertOffer = {
  key: string;
  source: "navarea" | "ukmto";
  title: string;
  subtitle: string;
  body: string;
  lat: number;
  lng: number;
  /** navarea 분류 (브리프 톤) */
  navareaKind?: NavareaSecurityKind;
};

type Props = {
  offer: MaritimeAlertOffer;
  lang: LabelLanguage;
  onAccept: () => void;
  onDismiss: () => void;
};

const COPY = {
  ko: {
    ask: "해당 해역으로 이동해 전보 브리프를 열까요?",
    yes: "예 · 보러가기",
    no: "아니오",
  },
  en: {
    ask: "Fly to these waters and open a telegraph brief?",
    yes: "Yes · Go",
    no: "No",
  },
} as const;

/**
 * 안보 직결 해상 경보(NAVAREA 훈련·미사일 / UKMTO 피습) —
 * 공습과 달리 먼저 동의 창 → 예면 fly + 양피지·전보음.
 */
export function MaritimeAlertOfferBanner({ offer, lang, onAccept, onDismiss }: Props) {
  const copy = lang === "en" ? COPY.en : COPY.ko;
  const violet = offer.source === "navarea";
  /**
   * aria-modal 제거 (P1-7) — 상단 제안 배너이지 사용자를 막는 모달이 아니다.
   * 뒤의 지도·nav는 살아 있는데 aria-modal은 "바깥은 비활성"이라고 알린다.
   * Escape로 닫히게 하고 포커스는 가두지 않는다.
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
      aria-labelledby="maritime-alert-offer-title"
      aria-describedby="maritime-alert-offer-body"
    >
      <div
        className={
          violet
            ? "relative overflow-hidden rounded-md border border-violet-400/55 bg-[#14081c]/95 shadow-[0_18px_56px_rgba(60,0,80,0.5)] backdrop-blur-md"
            : "relative overflow-hidden rounded-md border border-zinc-400/45 bg-[#0c0c0e]/95 shadow-[0_18px_56px_rgba(0,0,0,0.55)] backdrop-blur-md"
        }
      >
        <div
          className={
            violet
              ? "relative border-b border-violet-400/30 bg-violet-950/50 px-4 py-3"
              : "relative border-b border-zinc-500/30 bg-zinc-900/70 px-4 py-3"
          }
        >
          <p
            className={
              violet
                ? "text-meta font-medium uppercase tracking-[0.16em] text-violet-200/75"
                : "text-meta font-medium uppercase tracking-[0.16em] text-zinc-300/75"
            }
          >
            {offer.subtitle}
          </p>
          <p
            id="maritime-alert-offer-title"
            className="mt-1 text-[15px] font-semibold leading-snug text-white"
          >
            {offer.title}
          </p>
        </div>
        <div className="relative space-y-3 px-4 py-3">
          <p
            id="maritime-alert-offer-body"
            className={
              violet
                ? "text-caption leading-relaxed text-violet-50/85"
                : "text-caption leading-relaxed text-zinc-100/85"
            }
          >
            {offer.body}
          </p>
          <p
            className={
              violet
                ? "text-caption font-medium text-violet-100"
                : "text-caption font-medium text-zinc-100"
            }
          >
            {copy.ask}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onAccept}
              className={
                violet
                  ? "rounded-md border border-violet-300/50 bg-violet-500/25 px-3.5 py-1.5 text-caption font-semibold text-violet-50 hover:bg-violet-500/40"
                  : "rounded-md border border-zinc-300/40 bg-zinc-100/15 px-3.5 py-1.5 text-caption font-semibold text-zinc-50 hover:bg-zinc-100/25"
              }
            >
              {copy.yes}
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-md border border-white/10 bg-transparent px-3 py-1.5 text-caption text-white/70 hover:bg-white/5 hover:text-white"
            >
              {copy.no}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
