"use client";

import { useEffect, useId, useState } from "react";
import { LocationPinIcon } from "@/components/LocationPinIcon";
import { useLocale } from "@/contexts/LocaleContext";
import type { EventTier } from "@/data/geoTypes";
import { carrierDeckIconSvg } from "@/lib/usCarrierDeckIcon";
import { onHoverLayerId } from "@/lib/hoverLayerBridge";

type MapLegendVisible = {
  carriers?: boolean;
  gdelt?: boolean;
  war?: boolean;
  diplomatic?: boolean;
  protest?: boolean;
  fresh?: boolean;
  econLane?: boolean;
  econChoke?: boolean;
  econCritical?: boolean;
  econPipe?: boolean;
  econPort?: boolean;
};

type MapLegendProps = {
  /** 지정학 GDELT 핀 / 지경학 물류·에너지 */
  variant?: "conflict" | "economy";
  /** 기본 펼침 — false면 접힌 채 「범례」만 */
  defaultOpen?: boolean;
  deployedCarrierCount?: number;
  showAllCarriers?: boolean;
  /** 켜진 항목만 표시 (P3-6). 생략 시 전부 */
  visible?: MapLegendVisible;
  className?: string;
};

function hiClass(active: boolean) {
  return active
    ? "ring-2 ring-amber-300/70 bg-amber-400/10 rounded-lg px-1.5 py-0.5 -mx-1.5"
    : "";
}

export function MapLegend({
  variant = "conflict",
  defaultOpen = false,
  deployedCarrierCount = 0,
  showAllCarriers = false,
  visible,
  className = "",
}: MapLegendProps) {
  const { t } = useLocale();
  const [open, setOpen] = useState(defaultOpen);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const panelId = useId();
  const isEconomy = variant === "economy";

  useEffect(() => onHoverLayerId(setHighlightId), []);

  const shell = isEconomy
    ? "border-emerald-300/15 bg-[#071018]/75 text-emerald-50/90"
    : "border-sky-300/10 bg-[#0a1830]/65 text-sky-100/85";
  const btn = isEconomy
    ? "border-emerald-300/25 bg-emerald-950/70 text-emerald-100 hover:border-emerald-200/40 hover:bg-emerald-900/80"
    : "border-sky-300/25 bg-[#0a1830]/80 text-sky-100 hover:border-sky-200/40 hover:bg-[#0c2040]/90";
  const divider = isEconomy ? "border-emerald-300/15" : "border-sky-300/15";

  const showCarrier =
    (visible?.carriers ?? true) && deployedCarrierCount > 0;
  const showGdelt = visible?.gdelt ?? true;
  const showWar = visible?.war ?? true;
  const showDiplomatic = visible?.diplomatic ?? true;
  const showProtest = visible?.protest ?? true;
  const showFresh = visible?.fresh ?? true;

  const anyConflictVisible =
    showCarrier || showGdelt || showWar || showDiplomatic || showProtest || showFresh;
  const anyEconVisible =
    (visible?.econLane ?? true) ||
    (visible?.econChoke ?? true) ||
    (visible?.econCritical ?? true) ||
    (visible?.econPipe ?? true) ||
    (visible?.econPort ?? true);

  if (isEconomy ? !anyEconVisible : !anyConflictVisible) return null;

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
            <EconomyLegendBody
              divider={divider}
              visible={visible}
              highlightId={highlightId}
            />
          ) : (
            <ConflictLegendBody
              deployedCarrierCount={deployedCarrierCount}
              showAllCarriers={showAllCarriers}
              divider={divider}
              showCarrier={showCarrier}
              showGdelt={showGdelt}
              showWar={showWar}
              showDiplomatic={showDiplomatic}
              showProtest={showProtest}
              showFresh={showFresh}
              highlightId={highlightId}
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
  showCarrier,
  showGdelt,
  showWar,
  showDiplomatic,
  showProtest,
  showFresh,
  highlightId,
}: {
  deployedCarrierCount: number;
  showAllCarriers: boolean;
  divider: string;
  showCarrier: boolean;
  showGdelt: boolean;
  showWar: boolean;
  showDiplomatic: boolean;
  showProtest: boolean;
  showFresh: boolean;
  highlightId: string | null;
}) {
  const { t } = useLocale();
  return (
    <>
      {showCarrier ? (
        <div
          data-layer-id="us-carriers"
          className={`flex items-center gap-2 border-r pr-5 ${divider} ${hiClass(highlightId === "us-carriers")}`}
        >
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
      {showGdelt ? (
        <div
          data-layer-id="conflict-zones"
          className={`flex items-center gap-2 border-r pr-5 ${divider} ${hiClass(
            highlightId === "conflict-zones" || highlightId?.startsWith("gdelt") === true,
          )}`}
        >
          <span className="rounded-full border border-orange-300/35 bg-orange-400/15 px-2 py-0.5 text-micro font-medium text-orange-100">
            {t("legendNewsAlert")}
          </span>
          <span className="text-sky-100/45">{t("legendGdeltPin")}</span>
        </div>
      ) : null}
      {showWar ? (
        <LegendDotSwatch
          layerId="gdelt-war"
          tier="war"
          label={t("legendWar")}
          detail={t("legendWarDetail")}
          glowColor="rgba(239, 68, 68, 0.45)"
          highlight={highlightId === "gdelt-war" || highlightId === "conflict-zones"}
        />
      ) : null}
      {showDiplomatic ? (
        <LegendDotSwatch
          layerId="gdelt-diplomatic"
          tier="diplomatic"
          label={t("legendDiplomatic")}
          detail={t("legendDiplomaticDetail")}
          glowColor="rgba(251, 146, 60, 0.42)"
          highlight={highlightId === "gdelt-diplomatic"}
        />
      ) : null}
      {showProtest ? (
        <LegendDotSwatch
          layerId="gdelt-protest"
          tier="protest"
          label={t("legendProtest")}
          detail={t("legendProtestDetail")}
          glowColor="rgba(148, 163, 184, 0.55)"
          highlight={highlightId === "gdelt-protest"}
        />
      ) : null}
      {showFresh ? (
        <LegendDotSwatch
          layerId="fresh"
          color="#facc15"
          label={t("legendFresh")}
          detail={t("legendFreshDetail")}
          glowColor="rgba(250, 204, 21, 0.55)"
          fresh
          highlight={false}
        />
      ) : null}
    </>
  );
}

function EconomyLegendBody({
  divider,
  visible,
  highlightId,
}: {
  divider: string;
  visible?: MapLegendVisible;
  highlightId: string | null;
}) {
  const { t } = useLocale();
  return (
    <>
      {(visible?.econLane ?? true) ? (
        <LegendColorSwatch
          layerId="shipping-lanes"
          color="#38bdf8"
          label={t("legendEconLane")}
          detail={t("legendEconLaneDetail")}
          divider={divider}
          highlight={highlightId === "shipping-lanes"}
        />
      ) : null}
      {(visible?.econChoke ?? true) ? (
        <LegendColorSwatch
          layerId="chokepoints"
          color="#f59e0b"
          label={t("legendEconChoke")}
          detail={t("legendEconChokeDetail")}
          divider={divider}
          highlight={highlightId === "chokepoints"}
        />
      ) : null}
      {(visible?.econCritical ?? true) ? (
        <LegendColorSwatch
          layerId="critical-infra"
          color="#a78bfa"
          label={t("legendEconCritical")}
          detail={t("legendEconCriticalDetail")}
          divider={divider}
          highlight={false}
        />
      ) : null}
      {(visible?.econPipe ?? true) ? (
        <LegendColorSwatch
          layerId="oil-pipelines"
          color="#34d399"
          label={t("legendEconPipe")}
          detail={t("legendEconPipeDetail")}
          divider={divider}
          highlight={
            highlightId === "oil-pipelines" || highlightId === "gas-pipelines"
          }
        />
      ) : null}
      {(visible?.econPort ?? true) ? (
        <LegendColorSwatch
          layerId="ports"
          color="#2dd4bf"
          label={t("legendEconPort")}
          detail={t("legendEconPortDetail")}
          last
          highlight={highlightId === "ports"}
        />
      ) : null}
    </>
  );
}

function LegendColorSwatch({
  color,
  label,
  detail,
  divider,
  last,
  layerId,
  highlight,
}: {
  color: string;
  label: string;
  detail: string;
  divider?: string;
  last?: boolean;
  layerId?: string;
  highlight?: boolean;
}) {
  return (
    <div
      data-layer-id={layerId}
      className={`flex items-center gap-2 ${last ? "" : `border-r pr-5 ${divider ?? "border-emerald-300/15"}`} ${hiClass(Boolean(highlight))}`}
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
  layerId,
  highlight,
}: {
  tier?: EventTier;
  color?: string;
  label: string;
  detail: string;
  glowColor: string;
  fresh?: boolean;
  layerId?: string;
  highlight?: boolean;
}) {
  return (
    <div
      data-layer-id={layerId}
      className={`flex items-center gap-2 ${hiClass(Boolean(highlight))}`}
    >
      <LocationPinIcon
        tier={tier}
        color={color}
        glowColor={glowColor}
        fresh={fresh}
        className="h-5 w-3.5 shrink-0"
      />
      <span>
        <span className="font-medium text-sky-50/95">{label}</span>
        <span className="ml-1.5 text-sky-100/45">{detail}</span>
      </span>
    </div>
  );
}
