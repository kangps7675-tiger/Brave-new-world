"use client";

import { LocationPinIcon } from "@/components/LocationPinIcon";
import { useLocale } from "@/contexts/LocaleContext";
import type { EventTier } from "@/data/geoTypes";
import { carrierDeckIconSvg } from "@/lib/usCarrierDeckIcon";

type MapLegendProps = {
  deployedCarrierCount?: number;
  showAllCarriers?: boolean;
  className?: string;
};

export function MapLegend({
  deployedCarrierCount = 0,
  showAllCarriers = false,
  className = "",
}: MapLegendProps) {
  const { t } = useLocale();
  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-x-5 gap-y-2 rounded-2xl border border-sky-300/10 bg-[#0a1830]/65 px-5 py-2.5 text-[11px] text-sky-100/85 shadow-lg backdrop-blur-md ${className}`}
    >
      {deployedCarrierCount > 0 ? (
        <div className="flex items-center gap-2 border-r border-sky-300/15 pr-5">
          <span
            className="carrier-legend-deck-swatch shrink-0"
            dangerouslySetInnerHTML={{
              __html: carrierDeckIconSvg("deployed", { width: 30, height: 13 }),
            }}
          />
          <span className="rounded-full border border-red-400/40 bg-red-500/20 px-2 py-0.5 text-[10px] font-medium text-red-100">
            {t("legendOps")}
          </span>
          <span className="text-sky-100/45">
            {t("legendUsCarriers").replace("{n}", String(deployedCarrierCount))}
            {showAllCarriers ? t("legendShowAll") : t("legendAlwaysOn")}
          </span>
        </div>
      ) : null}
      <div className="flex items-center gap-2 border-r border-sky-300/15 pr-5">
        <span className="rounded-full border border-orange-300/35 bg-orange-400/15 px-2 py-0.5 text-[10px] font-medium text-orange-100">
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
