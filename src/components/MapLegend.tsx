"use client";

import { useId, useState } from "react";
import { LocationPinIcon } from "@/components/LocationPinIcon";
import { useLocale } from "@/contexts/LocaleContext";
import type { EventTier } from "@/data/geoTypes";
import { carrierDeckIconSvg } from "@/lib/usCarrierDeckIcon";

type MapLegendProps = {
  /** 지정학 GDELT 핀 / 지경학 물류·에너지 */
  variant?: "conflict" | "economy";
  /** 기본 펼침 — false면 접힌 채 「범례」만 */
  defaultOpen?: boolean;
  deployedCarrierCount?: number;
  showAllCarriers?: boolean;
  className?: string;
};

export function MapLegend({
  variant = "conflict",
  defaultOpen = false,
  deployedCarrierCount = 0,
  showAllCarriers = false,
  className = "",
}: MapLegendProps) {
  const { t } = useLocale();
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const isEconomy = variant === "economy";

  const shell = isEconomy
    ? "border-emerald-300/15 bg-[#071018]/75 text-emerald-50/90"
    : "border-sky-300/10 bg-[#0a1830]/65 text-sky-100/85";
  const btn = isEconomy
    ? "border-emerald-300/25 bg-emerald-950/70 text-emerald-100 hover:border-emerald-200/40 hover:bg-emerald-900/80"
    : "border-sky-300/25 bg-[#0a1830]/80 text-sky-100 hover:border-sky-200/40 hover:bg-[#0c2040]/90";
  const divider = isEconomy ? "border-emerald-300/15" : "border-sky-300/15";

  return (
    <div
      className={`pointer-events-auto flex max-w-[min(96vw,960px)] flex-col-reverse items-stretch gap-1.5 ${className}`}
    >
      <div className="flex justify-center">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
          className={`tap-target inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border px-3 py-1.5 text-meta font-medium shadow-lg backdrop-blur-md transition ${btn}`}
        >
          <span>{t("legendDropdown")}</span>
          <span className="text-micro opacity-70" aria-hidden>
            {open ? "▾" : "▴"}
          </span>
        </button>
      </div>

      {open ? (
        <div
          id={panelId}
          role="region"
          aria-label={t("legendDropdown")}
          className={`flex flex-wrap items-center justify-center gap-x-5 gap-y-2 rounded-2xl border px-5 py-2.5 text-meta shadow-lg backdrop-blur-md ${shell}`}
        >
          {isEconomy ? (
            <EconomyLegendBody divider={divider} />
          ) : (
            <ConflictLegendBody
              deployedCarrierCount={deployedCarrierCount}
              showAllCarriers={showAllCarriers}
              divider={divider}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}

function ConflictLegendBody({
  deployedCarrierCount,
  showAllCarriers,
  divider,
}: {
  deployedCarrierCount: number;
  showAllCarriers: boolean;
  divider: string;
}) {
  const { t } = useLocale();
  return (
    <>
      {deployedCarrierCount > 0 ? (
        <div className={`flex items-center gap-2 border-r pr-5 ${divider}`}>
          <span
            className="carrier-legend-deck-swatch shrink-0"
            dangerouslySetInnerHTML={{
              __html: carrierDeckIconSvg({ width: 42, height: 24 }),
            }}
          />
          <span className="rounded-full border border-red-400/40 bg-red-500/20 px-2 py-0.5 text-micro font-medium text-red-100">
            {t("legendOps")}
          </span>
          <span className="text-sky-100/45">
            {t("legendUsCarriers").replace("{n}", String(deployedCarrierCount))}
            {showAllCarriers ? t("legendShowAll") : t("legendAlwaysOn")}
          </span>
        </div>
      ) : null}
      <div className={`flex items-center gap-2 border-r pr-5 ${divider}`}>
        <span className="rounded-full border border-orange-300/35 bg-orange-400/15 px-2 py-0.5 text-micro font-medium text-orange-100">
          {t("legendNewsAlert")}
        </span>
        <span className="text-sky-100/45">{t("legendGdeltPin")}</span>
      </div>
      <LegendDotSwatch
        tier="war"
        label={t("legendWar")}
        detail={t("legendWarDetail")}
        glowColor="rgba(239, 68, 68, 0.45)"
      />
      <LegendDotSwatch
        tier="diplomatic"
        label={t("legendDiplomatic")}
        detail={t("legendDiplomaticDetail")}
        glowColor="rgba(251, 146, 60, 0.42)"
      />
      <LegendDotSwatch
        tier="protest"
        label={t("legendProtest")}
        detail={t("legendProtestDetail")}
        glowColor="rgba(148, 163, 184, 0.55)"
      />
      <LegendDotSwatch
        color="#facc15"
        label={t("legendFresh")}
        detail={t("legendFreshDetail")}
        glowColor="rgba(250, 204, 21, 0.55)"
        fresh
      />
    </>
  );
}

function EconomyLegendBody({ divider }: { divider: string }) {
  const { t } = useLocale();
  return (
    <>
      <LegendColorSwatch
        color="#38bdf8"
        label={t("legendEconLane")}
        detail={t("legendEconLaneDetail")}
        divider={divider}
      />
      <LegendColorSwatch
        color="#f59e0b"
        label={t("legendEconChoke")}
        detail={t("legendEconChokeDetail")}
        divider={divider}
      />
      <LegendColorSwatch
        color="#a78bfa"
        label={t("legendEconCritical")}
        detail={t("legendEconCriticalDetail")}
        divider={divider}
      />
      <LegendColorSwatch
        color="#34d399"
        label={t("legendEconPipe")}
        detail={t("legendEconPipeDetail")}
        divider={divider}
      />
      <LegendColorSwatch
        color="#2dd4bf"
        label={t("legendEconPort")}
        detail={t("legendEconPortDetail")}
        last
      />
    </>
  );
}

function LegendColorSwatch({
  color,
  label,
  detail,
  divider,
  last,
}: {
  color: string;
  label: string;
  detail: string;
  divider?: string;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 ${last ? "" : `border-r pr-5 ${divider ?? "border-emerald-300/15"}`}`}
    >
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white/15"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <span>
        <span className="font-medium text-emerald-50/95">{label}</span>
        <span className="ml-1.5 text-emerald-100/45">{detail}</span>
      </span>
    </div>
  );
}

function LegendDotSwatch({
  tier,
  color,
  label,
  detail,
  glowColor,
  fresh,
}: {
  tier?: EventTier;
  color?: string;
  label: string;
  detail: string;
  glowColor?: string;
  fresh?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-6 w-5 items-end justify-center">
        {glowColor && (
          <span
            className="absolute bottom-0 h-5 w-5 rounded-full blur-[2px]"
            style={{ backgroundColor: glowColor }}
          />
        )}
        <LocationPinIcon
          tier={tier}
          color={color}
          size={18}
          fresh={fresh}
          glowColor={glowColor}
        />
      </span>
      <span>
        <span className="font-medium text-sky-50/95">{label}</span>
        <span className="ml-1.5 text-sky-100/45">{detail}</span>
      </span>
    </div>
  );
}
