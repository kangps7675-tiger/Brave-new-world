"use client";

import { useState } from "react";
import { Metric } from "@/components/globe/Metric";
import { LoadErrorBanner } from "@/components/LoadErrorBanner";
import { NeptunLayerPanel } from "@/components/NeptunLayerPanel";
import { LayerCategoryDraftHost } from "@/components/LayerCategoryDraftHost";
import { LayerPanelLanguagePicker } from "@/components/LayerPanelLanguagePicker";
import { UiFontPicker } from "@/components/UiFontPicker";
import { SoundMuteControl } from "@/components/SoundMuteControl";
import { type LayerCategory } from "@/components/LayerCategoryPanel";
import { activeLayerCap, countActiveLayers } from "@/lib/layerExclusiveCap";
import { formatDateTime } from "@/components/globe/formatters";
import { t } from "@/lib/uiStrings";
import type { LabelLanguage, LayerPrefs } from "@/lib/layerPrefs";
import type { NeptunAlerts, NeptunLiveThreat } from "@/lib/neptun";
import type { NeptunStreamStatus } from "@/hooks/useNeptunStream";
import type { NeptunRenderMode } from "@/lib/neptunLod";
import type { ViinaLod } from "@/lib/viinaLod";

/** 레이어 패널 탭 (P1-3) — 성격이 다른 것을 한 서랍에 담지 않는다 */
export type LayerPanelTab = "layers" | "settings" | "data";

export type LayerPanelHostProps = {
  isCompactUi: boolean;
  /** tablet | desktop-wide 등 — 패널 폭·높이 조정 */
  isTabletUi?: boolean;
  isDesktopWideUi?: boolean;
  labelLanguage: LabelLanguage;
  layerPanelDirty: boolean;
  onConfirmDraft: () => void;
  onCancelDraft: () => void;
  navHeaderLabel: string;
  layerPanelTitle: string;
  onClose: () => void;
  onLangDraftChange: (lang: LabelLanguage) => void;
  ultraLite: boolean;
  onUltraLiteToggle: (on: boolean) => void;
  draftPrefs: LayerPrefs;
  onOpenModePicker: () => void;
  onResetCheckboxSettings: () => void;
  frozenPanelCategories: LayerCategory[] | null;
  layerPanelSessionKey: number;
  batchPending: boolean;
  isEconomyViewer: boolean;
  showUkraineControl: boolean;
  onPanelDraftPatch: (patch: Partial<LayerPrefs>) => void;
  showNeptun: boolean;
  neptunThreats: NeptunLiveThreat[];
  neptunAlerts: NeptunAlerts;
  neptunLive: boolean;
  neptunStatus: NeptunStreamStatus;
  neptunServerTime?: string | null;
  neptunError?: string | null;
  neptunFetchEnabled: boolean;
  neptunRenderMode: NeptunRenderMode;
  onNeptunThreatSelect: (threat: NeptunLiveThreat) => void;
  transportLoading: boolean;
  transportError: string | null;
  globeLodLabel: string;
  viinaLodMode: ViinaLod["mode"];
  globePointsCount: number;
  aisLoading: boolean;
  showAis: boolean;
  onRefreshAis: () => void;
  aisError: string | null;
  syncBusy: boolean;
  syncRunning: boolean;
  onForceSync: () => void;
  gdeltEventsCount: number;
  disputesCount: number;
  railPathsCount: number;
  aisVesselsCount: number;
  milAircraftCount: number;
  civAircraftCount: number;
  visibleFirmsFiresCount: number;
  countriesCount: number;
  labelPlacesCount: number;
  generatedAt: string;
  loadError: string | null;
};

/** 좌측 레이어 패널 — GlobeDashboard에서 추출 (분리 5단계) */
export function LayerPanelHost({
  isCompactUi,
  isTabletUi = false,
  isDesktopWideUi = false,
  labelLanguage,
  layerPanelDirty,
  onConfirmDraft,
  onCancelDraft,
  navHeaderLabel,
  layerPanelTitle,
  onClose,
  onLangDraftChange,
  ultraLite,
  onUltraLiteToggle,
  draftPrefs,
  onOpenModePicker,
  onResetCheckboxSettings,
  frozenPanelCategories,
  layerPanelSessionKey,
  batchPending,
  isEconomyViewer,
  showUkraineControl,
  onPanelDraftPatch,
  showNeptun,
  neptunThreats,
  neptunAlerts,
  neptunLive,
  neptunStatus,
  neptunServerTime,
  neptunError,
  neptunFetchEnabled,
  neptunRenderMode,
  onNeptunThreatSelect,
  transportLoading,
  transportError,
  globeLodLabel,
  viinaLodMode,
  globePointsCount,
  aisLoading,
  showAis,
  onRefreshAis,
  aisError,
  syncBusy,
  syncRunning,
  onForceSync,
  gdeltEventsCount,
  disputesCount,
  railPathsCount,
  aisVesselsCount,
  milAircraftCount,
  civAircraftCount,
  visibleFirmsFiresCount,
  countriesCount,
  labelPlacesCount,
  generatedAt,
  loadError,
}: LayerPanelHostProps) {
  /** 기본은 「레이어」 — 이 패널을 여는 이유의 대부분이다 (P1-3) */
  const [tab, setTab] = useState<LayerPanelTab>("layers");
  const panelSizeClass = isTabletUi
    ? "top-[4.75rem] max-h-[calc(100dvh-5.75rem)] w-[min(42vw,400px)]"
    : isDesktopWideUi
      ? "top-14 max-h-[calc(100vh-5rem)] w-[min(calc(100vw-2rem),420px)]"
      : isCompactUi
        ? "top-[4.75rem] max-h-[calc(100dvh-5.75rem)] w-[min(calc(100vw-1.5rem),340px)]"
        : "top-14 max-h-[calc(100vh-5rem)] w-[min(calc(100vw-1.5rem),360px)]";

  return (
    <aside
      className={`intel-panel intel-scroll-y pointer-events-auto absolute left-3 z-[600] flex flex-col gap-4 rounded-2xl p-4 shadow-2xl ${panelSizeClass}`}
    >
      {layerPanelDirty ? (
        <div
          role="dialog"
          aria-label={t("layerApplyConfirm", labelLanguage)}
          className="sticky top-0 z-20 -mx-1 mb-1 rounded-xl border border-sky-300/40 bg-[#0a1830]/96 px-3 py-2.5 shadow-lg backdrop-blur-md"
        >
          <p className="text-body font-semibold text-sky-50">
            {t("layerApplyConfirm", labelLanguage)}
          </p>
          <p className="mt-0.5 text-meta text-sky-100/65">
            {t("layerApplyConfirmHint", labelLanguage)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onConfirmDraft}
              className="rounded-lg border border-sky-300/50 bg-sky-500/25 px-3 py-1.5 text-caption font-semibold text-sky-50 hover:bg-sky-500/40"
            >
              {t("layerApplyConfirmYes", labelLanguage)}
            </button>
            <button
              type="button"
              onClick={onCancelDraft}
              className="rounded-lg border border-white/15 bg-transparent px-3 py-1.5 text-caption text-slate-200 hover:border-white/30 hover:text-white"
            >
              {t("cancel", labelLanguage)}
            </button>
          </div>
        </div>
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-sky-200/70">
            {navHeaderLabel}
          </p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-sky-50">
            {layerPanelTitle}
          </h1>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-sky-200/15 px-2 py-1 text-xs text-sky-100/50 hover:text-sky-50"
        >
          ✕
        </button>
      </div>

      {/*
        3탭 분해 (P1-3).
        이 패널은 언어 · 폰트 · 성능 · 뷰 설정 · 레이어 100+ · 데이터 상태 ·
        동기화 버튼을 **한 서랍**에 담고 있었다. 레이어를 하나 켜려고 열었는데
        스크롤을 한참 내려야 했고, 정작 레이어 검색은 없었다.
        성격이 다른 것을 나눈다 — 「레이어」는 자주, 「설정」·「데이터」는 가끔 쓴다.
      */}
      <div role="tablist" aria-label={t("layers", labelLanguage)} className="flex gap-1">
        {(["layers", "settings", "data"] as const).map((tabId) => {
          const active = tab === tabId;
          const label =
            tabId === "layers"
              ? t("layerTabLayers", labelLanguage)
              : tabId === "settings"
                ? t("layerTabSettings", labelLanguage)
                : t("layerTabData", labelLanguage);
          return (
            <button
              key={tabId}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(tabId)}
              className={`min-h-[var(--tap-target-min)] flex-1 rounded-lg border px-3 text-caption font-medium transition ${
                active
                  ? "border-sky-300/50 bg-sky-500/20 text-sky-50"
                  : "border-slate-700/70 bg-black/20 text-slate-400 hover:border-slate-600 hover:text-slate-200"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {tab === "settings" ? (
      <>
      <LayerPanelLanguagePicker initialLang={labelLanguage} onChange={onLangDraftChange} />

      <UiFontPicker lang={labelLanguage} />

      <div className="rounded-xl border border-slate-800 bg-black/25 p-3">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{t("layerPerformance", labelLanguage)}</p>
        <p className="mt-1 text-meta text-slate-600">
          {t("layerUltraLiteHint", labelLanguage).replace("{cap}", String(activeLayerCap(true)))}
        </p>
        <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-700/80 bg-black/20 px-3 py-2.5">
          <span className="text-xs text-slate-200">{t("layerUltraLiteToggle", labelLanguage)}</span>
          <input
            type="checkbox"
            className="h-4 w-4 accent-amber-300"
            checked={ultraLite}
            onChange={(event) => onUltraLiteToggle(event.target.checked)}
          />
        </label>
        <p className="mt-2 text-meta text-slate-500">
          {t("layerCapStatus", labelLanguage)
            .replace("{full}", String(activeLayerCap(false)))
            .replace("{active}", String(countActiveLayers(draftPrefs)))
            .replace("{cap}", String(activeLayerCap(ultraLite)))}
        </p>
      </div>

      <div className="rounded-xl border border-slate-800 bg-black/25 p-3">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
          {t("viewSettings", labelLanguage)}
        </p>
        <p className="mt-1 text-meta text-slate-600">
          {t("viewSettingsHint", labelLanguage)}
        </p>
        <button
          type="button"
          onClick={onOpenModePicker}
          className="mt-3 w-full rounded-lg border border-orange-300/30 bg-orange-300/10 px-3 py-2 text-xs text-orange-100 transition hover:border-orange-200"
        >
          {t("changeViewMode", labelLanguage)}
        </button>
        <button
          type="button"
          onClick={onResetCheckboxSettings}
          className="mt-2 w-full rounded-lg border border-slate-600/50 bg-slate-900/40 px-3 py-2 text-xs text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
        >
          {t("resetCheckboxSettings", labelLanguage)}
        </button>
        <SoundMuteControl lang={labelLanguage} variant="panel" />
      </div>
      </>
      ) : null}

      {tab === "layers" ? (
      <div className="rounded-xl border border-slate-800 bg-black/25 p-3">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
          {t("layers", labelLanguage)}
        </p>
        <p className="mt-1 text-meta text-slate-600">{t("layerDraftHint", labelLanguage)}</p>
        <div className="mt-3 text-sm">
          {frozenPanelCategories ? (
            <LayerCategoryDraftHost
              key={layerPanelSessionKey}
              categories={frozenPanelCategories}
              ultraLite={ultraLite}
              batchStatus={
                layerPanelDirty
                  ? t("layerApplyConfirmHint", labelLanguage)
                  : batchPending
                    ? t("layerBatchApplying", labelLanguage)
                    : null
              }
              autoExpandCategoryId={isEconomyViewer ? "energy" : "conflict"}
              autoExpandWhen={showUkraineControl}
              expandActiveCategories
              onPatch={onPanelDraftPatch}
            />
          ) : (
            <p className="rounded-lg border border-slate-800/90 bg-slate-950/30 px-3 py-4 text-xs text-slate-500">
              {t("layerListLoading", labelLanguage)}
            </p>
          )}
        </div>
        {showNeptun ? (
          <div className="mt-3">
            <NeptunLayerPanel
              threats={neptunThreats}
              alerts={neptunAlerts}
              live={neptunLive}
              liveStatus={neptunStatus}
              serverTime={neptunServerTime}
              error={neptunError}
              lang={labelLanguage}
              viewportHint={
                !neptunFetchEnabled
                  ? "우크라이나 극동부로 이동하거나 전선 레이어를 켜면 데이터를 불러옵니다."
                  : neptunRenderMode === "hidden"
                    ? "우크라이나 극동부로 이동하면 궤적이 표시됩니다."
                    : neptunRenderMode === "flat"
                      ? "개요 모드: 가벼운 평면 궤적. 더 가까이 줌인하면 상세 궤적이 나타납니다."
                      : neptunRenderMode === "low"
                        ? "저고도 궤적. 더 가까이 줌인하면 예측 항로가 표시됩니다."
                        : null
              }
              onSelectThreat={onNeptunThreatSelect}
            />
          </div>
        ) : null}
      </div>
      ) : null}

      {tab === "data" ? (
      <div className="rounded-xl border border-slate-800 bg-black/25 p-3">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
          {t("layerTabData", labelLanguage)}
        </p>
        <p className="mt-3 text-micro leading-4 text-slate-600">
          GEM · TeleGeography · OurAirports · NGA WPI · Natural Earth
        </p>
        {transportLoading && (
          <p className="mt-2 text-xs leading-5 text-slate-400">{t("layerRailLoading", labelLanguage)}</p>
        )}
        <p className="mt-2 text-xs leading-5 text-slate-500">
          {t("layerCurrentScale", labelLanguage)}: {globeLodLabel}
          {showUkraineControl && viinaLodMode === "overview"
            ? ` · ${t("layerOccupationOverview", labelLanguage)}`
            : showUkraineControl && viinaLodMode === "hidden"
              ? ` · ${t("layerOccupationZoomIn", labelLanguage)}`
              : ""}{" "}
          · {t("layerEventCount", labelLanguage).replace("{n}", globePointsCount.toLocaleString())}
        </p>
        {transportError && <p className="mt-2 text-xs leading-5 text-red-200">{transportError}</p>}
        <button
          type="button"
          onClick={onRefreshAis}
          disabled={aisLoading || !showAis}
          className="mt-3 w-full rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-xs text-cyan-100 transition hover:border-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {aisLoading ? t("layerAisRefreshing", labelLanguage) : t("layerAisRefresh", labelLanguage)}
        </button>
        {aisError && <p className="mt-2 text-xs leading-5 text-red-200">{aisError}</p>}
        <button
          type="button"
          onClick={onForceSync}
          disabled={syncBusy || syncRunning}
          className="mt-3 w-full rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs text-amber-100 transition hover:border-amber-200 disabled:cursor-wait disabled:opacity-60"
        >
          {syncBusy || syncRunning ? t("layerSnapshotSyncing", labelLanguage) : t("layerSnapshotSync", labelLanguage)}
        </button>
        <p className="mt-2 text-meta leading-5 text-slate-500">
          {t("layerSnapshotNote", labelLanguage)}
        </p>
        {/* 「GDELT 실시간은 꺼 두었습니다」 등 내부 운영 사정 문구 제거 (P0-5).
            사용자에게 필요한 건 "이 데이터가 언제 것인가"이지 우리 설정이 아니다. */}
      </div>
      ) : null}

      {tab === "data" ? (
      <div className="rounded-xl border border-slate-800 bg-black/25 p-3">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{t("layerDataStatus", labelLanguage)}</p>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <Metric label="GDELT" value={gdeltEventsCount.toLocaleString()} />
          <Metric label={t("layerMetricDisputes", labelLanguage)} value={disputesCount.toLocaleString()} />
          <Metric label={t("layerMetricRail", labelLanguage)} value={railPathsCount.toLocaleString()} />
          <Metric label="MarineTraffic AIS" value={aisVesselsCount.toLocaleString()} />
          <Metric label="ADS-B mil" value={milAircraftCount.toLocaleString()} />
          <Metric label="ADS-B civ" value={civAircraftCount.toLocaleString()} />
          <Metric label="NASA FIRMS" value={visibleFirmsFiresCount.toLocaleString()} />
          <Metric label={t("layerMetricCountries", labelLanguage)} value={countriesCount.toLocaleString()} />
          <Metric label={t("layerMetricCityLabels", labelLanguage)} value={labelPlacesCount.toLocaleString()} />
        </dl>
        <p className="mt-3 text-meta leading-5 text-slate-500">
          {t("layerGeneratedAt", labelLanguage)}: {formatDateTime(generatedAt)}
        </p>
        {/* 제거됨 (P0-5): QA 체크리스트("점멸 체크 A/B")와 구현 사정("데모 탐지")은
            개발자 메모다. 사용자 화면이 아니라 docs/에 있어야 한다.
            전쟁구역 산출 방식은 「출처·방법론」 패널에서 정식으로 설명한다. */}
      </div>
      ) : null}

      {/* 로드 실패는 어느 탭에서든 보여야 한다 */}
      {loadError ? <LoadErrorBanner message={loadError} className="mt-3" /> : null}
    </aside>
  );
}
