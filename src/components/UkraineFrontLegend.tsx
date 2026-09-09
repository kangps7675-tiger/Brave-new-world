"use client";

import { useLocale } from "@/contexts/LocaleContext";

type UkraineFrontLegendProps = {
  visible: boolean;
  controlDate: string | null;
  lodLabel?: string | null;
  compact?: boolean;
  dockLow?: boolean;
};

function HatchSwatch({
  label,
  detail,
  color,
  dashed = false,
  angle = 45,
}: {
  label: string;
  detail: string;
  color: string;
  dashed?: boolean;
  angle?: number;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="relative h-3.5 w-6 shrink-0 overflow-hidden rounded-sm border bg-transparent"
        style={{
          borderColor: color,
          borderStyle: dashed ? "dashed" : "solid",
          borderWidth: 1,
        }}
      >
        <span
          className="absolute inset-[-40%] opacity-70"
          style={{
            backgroundImage: `repeating-linear-gradient(${angle}deg, ${color} 0 1px, transparent 1px 4px)`,
          }}
        />
      </span>
      <span className="min-w-0">
        <span className="font-medium text-sky-50/95">{label}</span>
        <span className="ml-1.5 text-sky-100/45">{detail}</span>
      </span>
    </div>
  );
}

function RingSwatch({
  label,
  detail,
  color,
}: {
  label: string;
  detail: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="h-3.5 w-3.5 shrink-0 rounded-full border-2 bg-transparent"
        style={{ borderColor: color }}
      />
      <span className="min-w-0">
        <span className="font-medium text-sky-50/95">{label}</span>
        <span className="ml-1.5 text-sky-100/45">{detail}</span>
      </span>
    </div>
  );
}

export function UkraineFrontLegendContent({
  controlDate,
  lodLabel,
  compact = false,
}: Omit<UkraineFrontLegendProps, "visible" | "dockLow">) {
  const { t } = useLocale();
  const dateLabel =
    controlDate && /^\d{8}$/.test(controlDate)
      ? `${controlDate.slice(0, 4)}-${controlDate.slice(4, 6)}-${controlDate.slice(6, 8)}`
      : controlDate;

  return (
    <div className={compact ? "space-y-2" : "space-y-2.5"}>
      {!compact && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-300/15 pb-2">
          <p className="text-micro uppercase tracking-[0.22em] text-sky-200/75">
            {t("legendUaTitle")}
          </p>
          <p className="text-micro text-sky-100/50">
            VIINA{dateLabel ? ` · ${dateLabel}` : ""}
            {lodLabel ? ` · ${lodLabel}` : ""}
          </p>
        </div>
      )}
      <div className="space-y-1.5">
        <HatchSwatch
          label={t("legendUaRuOcc")}
          detail={t("legendUaThinHatch")}
          color="rgba(220,38,38,0.85)"
          angle={45}
        />
        <HatchSwatch
          label={t("legendUaUaOcc")}
          detail={t("legendUaThinHatch")}
          color="rgba(56,189,248,0.85)"
          angle={135}
        />
        <HatchSwatch
          label={t("legendUaRuClaim")}
          detail={t("legendUaOrangeDash")}
          color="rgba(251,146,60,0.9)"
          dashed
          angle={45}
        />
        <HatchSwatch
          label={t("legendUaUaClaim")}
          detail={t("legendUaSkyDash")}
          color="rgba(125,211,252,0.9)"
          dashed
          angle={0}
        />
        <div className="flex items-center gap-2.5">
          <span
            className="relative h-0.5 w-6 shrink-0 opacity-90"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, rgba(220,38,38,0.95) 0 3px, transparent 3px 6px)",
            }}
          />
          <span className="min-w-0">
            <span className="font-medium text-sky-50/95">{t("legendUaRuAdvance")}</span>
            <span className="ml-1.5 text-sky-100/45">{t("legendUaDashArrow")}</span>
          </span>
        </div>
        <RingSwatch
          label={t("legendUaCombatRing")}
          detail={t("legendUaCombatRingDetail")}
          color="rgba(100,116,139,0.85)"
        />
      </div>
    </div>
  );
}

export function UkraineFrontLegend({
  visible,
  controlDate,
  lodLabel,
  dockLow = false,
}: UkraineFrontLegendProps) {
  // opacity:0 만으로 숨기면 backdrop-blur 잔상이 남을 수 있음 — 비표시 시 언마운트
  if (!visible) return null;

  return (
    <div
      className={`pointer-events-none fixed left-1/2 z-20 w-[min(92vw,440px)] -translate-x-1/2 transition-all duration-300 ease-out translate-y-0 opacity-100 ${
        dockLow
          ? "bottom-4"
          : "bottom-[calc(var(--bottom-intel-stack-clearance)+env(safe-area-inset-bottom,0px))]"
      }`}
    >
      <div className="rounded-xl border border-sky-300/20 bg-[#07111f]/88 px-3.5 py-3 text-xs shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md">
        <UkraineFrontLegendContent controlDate={controlDate} lodLabel={lodLabel} />
      </div>
    </div>
  );
}
