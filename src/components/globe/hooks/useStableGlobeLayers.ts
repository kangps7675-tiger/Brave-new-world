"use client";

import { useEffect, useMemo, useRef, useState, startTransition, type MutableRefObject } from "react";
import { HEATMAP_MEANINGFUL_DELTA, LABEL_MEANINGFUL_DELTA, PATH_MEANINGFUL_DELTA } from "@/components/globe/constants";
import type { GlobeLabel, CasualtySkullHtmlMarker, NuclearStockpileHtmlMarker } from "@/components/globe/types";
import type { TransportPath } from "@/data/geoTypes";
import { HEATMAP_UPDATE_CADENCE_MS, LABEL_UPDATE_CADENCE_MS, PATH_UPDATE_CADENCE_MS } from "@/lib/globePerformance";
import { applyNuclearOverlayScale, getNuclearOverlayScale } from "@/lib/nuclearStockpiles";
import type { TensionHeatmapLayer } from "@/lib/tensionHeatmap";
import { getCasualtyOverlayScale, applyCasualtyOverlayMetrics } from "@/lib/warCasualtyOverlay";

export type UseStableGlobeLayersOptions = {
  applyGeneration: number;
  immediateUntilRef: MutableRefObject<number>;
  showGtaInterventions: boolean;
  showBriTradeConnectivity: boolean;
  showStrategicCorridors: boolean;
  showAlliedLogisticsCorridors: boolean;
  showSanctionsEvasionCorridors: boolean;
  showUsDfcSupplyChain: boolean;
  layerAltitude: number;
  isCameraMoving: boolean;
  stableNeptunLivePaths: TransportPath[];
  stableNeptunArchivedPaths: TransportPath[];
  isVectorBaseMap: boolean;
  reconOrbitPaths: TransportPath[];
  rawTensionHeatmaps: TensionHeatmapLayer[];
  casualtySkullMarkers: CasualtySkullHtmlMarker[];
  nuclearStockpileMarkers: NuclearStockpileHtmlMarker[];
  rawGlobeLabels: GlobeLabel[];
  rawGlobePaths: TransportPath[];
};

/**
 * 마커 재스케일·히트맵/라벨/경로 안정화(카메라 이동 중 동결) 묶음.
 * GlobeDashboard에서 추출 (분리 Phase D).
 */
export function useStableGlobeLayers(opts: UseStableGlobeLayersOptions) {
  const {
    applyGeneration,
    immediateUntilRef,
    showGtaInterventions,
    showBriTradeConnectivity,
    showStrategicCorridors,
    showAlliedLogisticsCorridors,
    showSanctionsEvasionCorridors,
    showUsDfcSupplyChain,
    layerAltitude,
    isCameraMoving,
    stableNeptunLivePaths,
    stableNeptunArchivedPaths,
    isVectorBaseMap,
    reconOrbitPaths,
    rawTensionHeatmaps,
    casualtySkullMarkers,
    nuclearStockpileMarkers,
    rawGlobeLabels,
    rawGlobePaths,
  } = opts;

  /**
   * MapLibre 렌더러는 react-globe.gl 시절의 htmlElementVisibilityModifier를 호출하지 않는다.
   * 그래서 사상자·핵탄두 배지는 마운트 시점(대개 줌아웃된 초기 지구본, 스케일 하한 0.12)에
   * 만들어진 크기로 고정되어, 우크라이나·가자로 줌인해도 커지지 않아 사실상 안 보였다.
   * 고도(layerAltitude)나 마커 목록이 바뀔 때 DOM 배지를 직접 재스케일해 가시성을 회복한다.
   */
  useEffect(() => {
    if (typeof document === "undefined") return;
    const rescale = () => {
      document
        .querySelectorAll<HTMLElement>(".casualty-skull-marker")
        .forEach((el) => {
          const span = Number(el.dataset.territorySpan || 10);
          const scale = getCasualtyOverlayScale(
            layerAltitude,
            Number.isFinite(span) ? span : 10,
          );
          applyCasualtyOverlayMetrics(el, scale, true);
        });
      document
        .querySelectorAll<HTMLElement>(".nuclear-icbm-marker")
        .forEach((el) => {
          applyNuclearOverlayScale(el, getNuclearOverlayScale(layerAltitude), true);
        });
    };
    // 마커 DOM은 커밋 직후 ref 콜백에서 붙으므로 한 프레임 뒤 재적용해 초기 크기까지 보정
    rescale();
    const raf = window.requestAnimationFrame(rescale);
    return () => window.cancelAnimationFrame(raf);
  }, [layerAltitude, casualtySkullMarkers, nuclearStockpileMarkers]);

  const [tensionHeatmaps, setTensionHeatmaps] = useState(rawTensionHeatmaps);
  const [globeLabels, setGlobeLabels] = useState(rawGlobeLabels);
  const [globePaths, setGlobePaths] = useState(rawGlobePaths);

  // DFC/BRI 토글 직후 throttle 게이트를 우회해 즉시 경로 반영
  useEffect(() => {
    if (
      !showBriTradeConnectivity &&
      !showGtaInterventions &&
      !showUsDfcSupplyChain &&
      !showStrategicCorridors &&
      !showAlliedLogisticsCorridors &&
      !showSanctionsEvasionCorridors
    )
      return;
    setGlobePaths([...rawGlobePaths]);
  }, [
    showBriTradeConnectivity,
    showGtaInterventions,
    showUsDfcSupplyChain,
    showStrategicCorridors,
    showAlliedLogisticsCorridors,
    showSanctionsEvasionCorridors,
    rawGlobePaths,
  ]);

  const dynamicGlobePaths = useMemo(() => rawGlobePaths, [rawGlobePaths]);

  const heatmapStabilityRef = useRef<{ signature: string; points: number; updatedAt: number }>({
    signature: "",
    points: 0,
    updatedAt: 0,
  });
  const labelStabilityRef = useRef<{ signature: string; count: number; updatedAt: number }>({
    signature: "",
    count: 0,
    updatedAt: 0,
  });
  const pathStabilityRef = useRef<{
    signature: string;
    count: number;
    oilCount: number;
    gasCount: number;
    subseaCount: number;
    cableCount: number;
    briCount: number;
    dfcCount: number;
    oilSig: string;
    gasSig: string;
    subseaSig: string;
    cableSig: string;
    briSig: string;
    dfcSig: string;
    updatedAt: number;
  }>({
    signature: "",
    count: 0,
    oilCount: 0,
    gasCount: 0,
    subseaCount: 0,
    cableCount: 0,
    briCount: 0,
    dfcCount: 0,
    oilSig: "",
    gasSig: "",
    subseaSig: "",
    cableSig: "",
    briSig: "",
    dfcSig: "",
    updatedAt: 0,
  });

  useEffect(() => {
    // 줌/팬 중 히트맵·라벨·경로 교체를 막아서 WebGL 부담과 흰 화면 유발 재할당을 줄임
    const bypass = Date.now() < immediateUntilRef.current;
    if (isCameraMoving && !bypass) return;
    const now = Date.now();
    const points = rawTensionHeatmaps.reduce((sum, layer) => sum + layer.points.length, 0);
    const signature = rawTensionHeatmaps
      .map((layer) => `${layer.id}:${layer.points.length}:${layer.bandwidth.toFixed(2)}`)
      .join("|");
    const prev = heatmapStabilityRef.current;
    const elapsed = now - prev.updatedAt;
    const meaningfulChange = Math.abs(points - prev.points) >= HEATMAP_MEANINGFUL_DELTA;
    const cadenceHit = elapsed >= HEATMAP_UPDATE_CADENCE_MS;
    if (
      signature !== prev.signature &&
      (bypass || meaningfulChange || cadenceHit || prev.updatedAt === 0)
    ) {
      setTensionHeatmaps(rawTensionHeatmaps);
      heatmapStabilityRef.current = { signature, points, updatedAt: now };
    }
  }, [applyGeneration, immediateUntilRef, isCameraMoving, rawTensionHeatmaps]);

  useEffect(() => {
    const bypass = Date.now() < immediateUntilRef.current;
    if (isCameraMoving && !bypass) return;
    const now = Date.now();
    const count = rawGlobeLabels.length;
    const signature = rawGlobeLabels
      .slice(0, 84)
      .map((item) => `p:${item.id}`)
      .join("|");
    const prev = labelStabilityRef.current;
    const elapsed = now - prev.updatedAt;
    const meaningfulChange = Math.abs(count - prev.count) >= LABEL_MEANINGFUL_DELTA;
    const cadenceHit = elapsed >= LABEL_UPDATE_CADENCE_MS;
    if (
      signature !== prev.signature &&
      (bypass || meaningfulChange || cadenceHit || prev.updatedAt === 0)
    ) {
      setGlobeLabels(rawGlobeLabels);
      labelStabilityRef.current = { signature, count, updatedAt: now };
    }
  }, [applyGeneration, immediateUntilRef, isCameraMoving, rawGlobeLabels]);

  useEffect(() => {
    const now = Date.now();
    const count = dynamicGlobePaths.length;
    let oilCount = 0;
    let gasCount = 0;
    let subseaCount = 0;
    let cableCount = 0;
    let briCount = 0;
    let dfcCount = 0;
    let hatchCount = 0;
    const oilIds: string[] = [];
    const gasIds: string[] = [];
    const subseaIds: string[] = [];
    const cableIds: string[] = [];
    const briIds: string[] = [];
    const dfcIds: string[] = [];
    for (const item of dynamicGlobePaths) {
      if (item.kind === "oil-pipeline") {
        oilCount += 1;
        if (oilIds.length < 24) oilIds.push(item.id);
      } else if (item.kind === "gas-pipeline") {
        gasCount += 1;
        if (gasIds.length < 24) gasIds.push(item.id);
      } else if (item.kind === "subsea-pipeline") {
        subseaCount += 1;
        if (subseaIds.length < 24) subseaIds.push(item.id);
      } else if (item.kind === "submarine-cable") {
        cableCount += 1;
        if (cableIds.length < 24) cableIds.push(item.id);
      } else if (item.kind === "bri-trade") {
        briCount += 1;
        if (briIds.length < 24) briIds.push(item.id);
      } else if (item.kind === "us-dfc-supply") {
        dfcCount += 1;
        if (dfcIds.length < 24) dfcIds.push(item.id);
      } else if (
        item.kind === "dispute-hatch" ||
        item.kind === "conflict-hatch" ||
        item.kind === "dispute-zone"
      ) {
        hatchCount += 1;
      }
    }
    const oilSig = oilIds.join(",");
    const gasSig = gasIds.join(",");
    const subseaSig = subseaIds.join(",");
    const cableSig = cableIds.join(",");
    const briSig = briIds.join(",");
    const dfcSig = dfcIds.join(",");
    const prev = pathStabilityRef.current;
    const infraChanged =
      oilCount !== prev.oilCount ||
      gasCount !== prev.gasCount ||
      subseaCount !== prev.subseaCount ||
      cableCount !== prev.cableCount ||
      briCount !== prev.briCount ||
      dfcCount !== prev.dfcCount ||
      oilSig !== prev.oilSig ||
      gasSig !== prev.gasSig ||
      subseaSig !== prev.subseaSig ||
      cableSig !== prev.cableSig ||
      briSig !== prev.briSig ||
      dfcSig !== prev.dfcSig;
    // 자원 인프라는 카메라 이동 중에도 반영 — 팬 중 fetch 완료 후 영구 스킵 방지
    const bypass =
      Date.now() < immediateUntilRef.current || isVectorBaseMap || infraChanged;
    if (isCameraMoving && !bypass) return;
    // 앞 96개만 보면 해치에 밀려 인프라 id 교체가 안 잡힘 → fingerprint 포함
    const signature = `${count}|h${hatchCount}|o${oilCount}|g${gasCount}|s${subseaCount}|c${cableCount}|b${briCount}|d${dfcCount}|O:${oilSig}|G:${gasSig}|S:${subseaSig}|C:${cableSig}|B:${briSig}|D:${dfcSig}|${dynamicGlobePaths
      .slice(0, 96)
      .map((item) => `${item.kind}:${item.id}`)
      .join("|")}`;
    const elapsed = now - prev.updatedAt;
    const meaningfulChange = Math.abs(count - prev.count) >= PATH_MEANINGFUL_DELTA;
    const cadenceHit = elapsed >= PATH_UPDATE_CADENCE_MS;
    if (
      signature !== prev.signature &&
      (bypass || meaningfulChange || cadenceHit || prev.updatedAt === 0 || infraChanged)
    ) {
      const nextPaths = dynamicGlobePaths;
      const commit = () => {
        pathStabilityRef.current = {
          signature,
          count,
          oilCount,
          gasCount,
          subseaCount,
          cableCount,
          briCount,
          dfcCount,
          oilSig,
          gasSig,
          subseaSig,
          cableSig,
          briSig,
          dfcSig,
          updatedAt: now,
        };
        setGlobePaths([...nextPaths]);
      };
      // 인프라 토글은 즉시 반영.
      // (예전: ref를 먼저 갱신 + RAF 예약 → cleanup에서 cancel되면
      //  signature는 이미 먹은 채 setGlobePaths는 스킵 → 체크 ON인데 안 보임)
      if (infraChanged || (count - prev.count < 40 && count < 120)) {
        commit();
        return;
      }
      let applied = false;
      const raf = window.requestAnimationFrame(() => {
        applied = true;
        startTransition(() => commit());
      });
      return () => {
        window.cancelAnimationFrame(raf);
        if (!applied) commit();
      };
    }
  }, [
    applyGeneration,
    dynamicGlobePaths,
    immediateUntilRef,
    isCameraMoving,
    isVectorBaseMap,
  ]);

  useEffect(() => {
    const bypass = Date.now() < immediateUntilRef.current;
    if (isCameraMoving && !bypass) return;
    setGlobePaths((prev) => {
      const base = prev.filter(
        (path) =>
          path.kind !== "neptun-trail" &&
          path.kind !== "neptun-projection" &&
          path.kind !== "neptun-trail-archived" &&
          path.kind !== "recon-orbit",
      );
      const paths = [
        ...stableNeptunLivePaths,
        ...stableNeptunArchivedPaths,
        ...reconOrbitPaths,
      ];
      if (paths.length === 0) {
        const hadDynamic = prev.some(
          (path) => path.kind.startsWith("neptun-") || path.kind === "recon-orbit",
        );
        return hadDynamic ? base : prev;
      }
      return [...base, ...paths];
    });
  }, [
    immediateUntilRef,
    isCameraMoving,
    reconOrbitPaths,
    stableNeptunArchivedPaths,
    stableNeptunLivePaths,
  ]);

  return {
    tensionHeatmaps,
    globeLabels,
    globePaths,
  };
}
