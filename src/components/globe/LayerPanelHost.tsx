"use client";

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
  const panelSizeClass = isTabletUi
    ? "top-[4.75rem] max-h-[calc(100dvh-5.75rem)] w-[min(42vw,400px)]"
    : isDesktopWideUi
      ? "top-14 max-h-[calc(100vh-5rem)] w-[min(calc(100vw-2rem),420px)]"
      : isCompactUi
        ? "top-[4.75rem] max-h-[calc(100dvh-5.75rem)] w-[min(calc(100vw-1.5rem),340px)]"
        : "top-14 max-h-[calc(100vh-5rem)] w-[min(calc(100vw-1.5rem),360px)]";

  return (
    <aside
      className={`intel-panel intel-scroll-y pointer-events-auto absolute left-3 z-[120] flex flex-col gap-4 rounded-2xl p-4 shadow-2xl ${panelSizeClass}`}
    >
      {layerPanelDirty ? (
        <div
          role="dialog"
          aria-label={t("layerApplyConfirm", labelLanguage)}
          className="sticky top-0 z-20 -mx-1 mb-1 rounded-xl border border-sky-300/40 bg-[#0a1830]/96 px-3 py-2.5 shadow-lg backdrop-blur-md"
        >
          <p className="text-[13px] font-semibold text-sky-50">
            {t("layerApplyConfirm", labelLanguage)}
          </p>
          <p className="mt-0.5 text-[11px] text-sky-100/65">
            {t("layerApplyConfirmHint", labelLanguage)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onConfirmDraft}
              className="rounded-lg border border-sky-300/50 bg-sky-500/25 px-3 py-1.5 text-[12px] font-semibold text-sky-50 hover:bg-sky-500/40"
            >
              {t("layerApplyConfirmYes", labelLanguage)}
            </button>
            <button
              type="button"
              onClick={onCancelDraft}
              className="rounded-lg border border-white/15 bg-transparent px-3 py-1.5 text-[12px] text-slate-200 hover:border-white/30 hover:text-white"
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

      <LayerPanelLanguagePicker initialLang={labelLanguage} onChange={onLangDraftChange} />

      <UiFontPicker lang={labelLanguage} />

      <div className="rounded-xl border border-slate-800 bg-black/25 p-3">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">성능</p>
        <p className="mt-1 text-[11px] text-slate-600">
          저사양(내장 GPU·8GB)용 Ultra-Lite — 동시 레이어 {activeLayerCap(true)}개·핀 축소·무거운 레이어 강제 OFF
        </p>
        <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-700/80 bg-black/20 px-3 py-2.5">
          <span className="text-xs text-slate-200">Ultra-Lite 모드</span>
          <input
            type="checkbox"
            className="h-4 w-4 accent-amber-300"
            checked={ultraLite}
            onChange={(event) => onUltraLiteToggle(event.target.checked)}
          />
        </label>
        <p className="mt-2 text-[11px] text-slate-500">
          일반 캡 {activeLayerCap(false)}개 · 현재 활성{" "}
          {countActiveLayers(draftPrefs)}/
          {activeLayerCap(ultraLite)}
        </p>
      </div>

      <div className="rounded-xl border border-slate-800 bg-black/25 p-3">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
          {t("viewSettings", labelLanguage)}
        </p>
        <p className="mt-1 text-[11px] text-slate-600">
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

      <div className="rounded-xl border border-slate-800 bg-black/25 p-3">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
          {t("layers", labelLanguage)}
        </p>
        <p className="mt-1 text-[11px] text-slate-600">{t("layerDraftHint", labelLanguage)}</p>
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
                    ? "레이어 일괄 적용 중… 잠시 후 지구본에 반영됩니다."
                    : null
              }
              autoExpandCategoryId={isEconomyViewer ? "energy" : "conflict"}
              autoExpandWhen={showUkraineControl}
              expandActiveCategories
              onPatch={onPanelDraftPatch}
            />
          ) : (
            <p className="rounded-lg border border-slate-800/90 bg-slate-950/30 px-3 py-4 text-xs text-slate-500">
              레이어 목록 준비 중…
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
        <p className="mt-3 text-[10px] leading-4 text-slate-600">
          GEM · TeleGeography · OurAirports · NGA WPI · Natural Earth
        </p>
        {transportLoading && (
          <p className="mt-2 text-xs leading-5 text-slate-400">철도 데이터 로딩 중...</p>
        )}
        <p className="mt-2 text-xs leading-5 text-slate-500">
          현재 배율: {globeLodLabel}
          {showUkraineControl && viinaLodMode === "overview"
            ? " · 점령 개요"
            : showUkraineControl && viinaLodMode === "hidden"
              ? " · 점령(줌인 필요)"
              : ""}{" "}
          · 이벤트 {globePointsCount.toLocaleString()}개
        </p>
        {transportError && <p className="mt-2 text-xs leading-5 text-red-200">{transportError}</p>}
        <button
          type="button"
          onClick={onRefreshAis}
          disabled={aisLoading || !showAis}
          className="mt-3 w-full rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-xs text-cyan-100 transition hover:border-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {aisLoading ? "배 위치 불러오는 중…" : "배 위치 새로고침"}
        </button>
        {aisError && <p className="mt-2 text-xs leading-5 text-red-200">{aisError}</p>}
        <button
          type="button"
          onClick={onForceSync}
          disabled={syncBusy || syncRunning}
          className="mt-3 w-full rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs text-amber-100 transition hover:border-amber-200 disabled:cursor-wait disabled:opacity-60"
        >
          {syncBusy || syncRunning ? "스냅샷 동기화 중…" : "스냅샷 데이터 동기화"}
        </button>
        <p className="mt-2 text-[11px] leading-5 text-slate-500">
          정적 스냅샷은 약 6시간마다 자동 갱신됩니다. NASA FIRMS · ADS-B · MarineTraffic(AIS)은 Cron → D1 실시간 레이어입니다.
        </p>
        <p className="mt-3 text-[11px] leading-5 text-slate-500">
          GDELT 실시간 이벤트는 꺼 두었습니다. 우측 경보 패널은 로컬 분쟁 데이터를 사용합니다.
        </p>
      </div>

      <div className="rounded-xl border border-slate-800 bg-black/25 p-3">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">데이터 상태</p>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <Metric label="GDELT" value={gdeltEventsCount.toLocaleString()} />
          <Metric label="로컬 분쟁" value={disputesCount.toLocaleString()} />
          <Metric label="철도" value={railPathsCount.toLocaleString()} />
          <Metric label="MarineTraffic AIS" value={aisVesselsCount.toLocaleString()} />
          <Metric label="ADS-B mil" value={milAircraftCount.toLocaleString()} />
          <Metric label="ADS-B civ" value={civAircraftCount.toLocaleString()} />
          <Metric label="NASA FIRMS" value={visibleFirmsFiresCount.toLocaleString()} />
          <Metric label="국가" value={countriesCount.toLocaleString()} />
          <Metric label="도시 라벨" value={labelPlacesCount.toLocaleString()} />
        </dl>
        <p className="mt-3 text-[11px] leading-5 text-slate-500">
          생성 시각: {formatDateTime(generatedAt)}
        </p>
        <p className="mt-2 text-[10px] leading-4 text-slate-600">
          AI 전쟁지역은 외부 AI API 없이 Natural Earth 분쟁 구역 + GDELT 전투 뉴스 밀도로 데모 탐지합니다.
        </p>
        <p className="mt-3 text-[11px] leading-5 text-slate-500">
          점멸 체크 A: 국가 간 갈등 + 도시 이름 ON, 대륙/지역 경계 줌에서 회전
        </p>
        <p className="text-[11px] leading-5 text-slate-500">
          점멸 체크 B: 전투·군사 충돌 + 우크라이나 점령지 ON, 동유럽 근접 줌 팬/줌
        </p>
      </div>

      {loadError ? <LoadErrorBanner message={loadError} className="mt-3" /> : null}
    </aside>
  );
}
