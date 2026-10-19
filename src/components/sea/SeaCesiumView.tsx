"use client";

/**
 * 사건 하나 깊게 보기 — CesiumJS 위성 화면 (해운 전용 얇은 래퍼).
 *
 * 예전 CesiumSatelliteGlobe(4천 줄, 레이어 40여 개)를 대체한다. 엔진·베이스 스택은 같다:
 *   Ion 토큰 있으면 World Terrain + Google Photorealistic 3D + Ion 위성,
 *   없으면 Esri World Imagery + Esri Elevation.
 * 올리는 것: 주변 AIS 선박 · 군용기(ADS-B) · UKMTO 경보 · 항행경보 · 피격 속보 · FIRMS 열점.
 */

import { useEffect, useRef, useState } from "react";
import type { AisVessel, FirmsFire, MilitaryAircraft } from "@/data/geoTypes";
import { getRuntimeConfig } from "@/lib/runtimeConfig.client";
import { applyObserveOceanLook } from "@/lib/cesiumOceanLook";
import { aisTrackerArrowSvg, aisTrackerMark, aisVesselHeadingDeg } from "@/lib/aisVesselMarkers";
import { classifyMilAircraft } from "@/lib/milAircraftKind";
import { milAircraftIconSvg } from "@/lib/milAircraftIcon";
import {
  attachLiveuaStrikePulse,
  syncLiveuaStrikeEntities,
  type CesiumLiveuaStrikePoint,
} from "@/lib/cesiumLiveuaStrikes";
import { attachFirmsFirePulse, syncFirmsFireEntities } from "@/lib/cesiumFirmsFires";
import type { UkmtoIncidentPoint } from "@/lib/ukmtoHatch";
import type { NavareaFeaturePoint } from "@/lib/navareaHatch";

type CesiumNS = typeof import("cesium");
type Viewer = import("cesium").Viewer;

const ESRI_WORLD_IMAGERY = "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer";
const ESRI_WORLD_ELEVATION =
  "https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer";

export type SeaCesiumPick = { kind: "ais" | "aircraft" | "ukmto" | "navarea"; title: string; detail: string };

type Props = {
  initial: { lat: number; lng: number; heightM: number };
  vessels: AisVessel[];
  aircraft: MilitaryAircraft[];
  ukmto: UkmtoIncidentPoint[];
  navarea: NavareaFeaturePoint[];
  strikes: CesiumLiveuaStrikePoint[];
  fires: FirmsFire[];
  onPick?: (p: SeaCesiumPick | null) => void;
};

const svgUri = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
const iconCache = new Map<string, string>();
function cached(key: string, make: () => string): string {
  let v = iconCache.get(key);
  if (!v) {
    v = svgUri(make());
    iconCache.set(key, v);
  }
  return v;
}

function dotSvg(fill: string, stroke: string, r = 7): string {
  const s = r * 2 + 4;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}"><circle cx="${s / 2}" cy="${s / 2}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="2"/></svg>`;
}

/** prefix 로 시작하는 엔티티를 rows 와 맞춘다 (없어진 건 지움) */
function syncPrefix<T>(
  Cesium: CesiumNS,
  viewer: Viewer,
  prefix: string,
  rows: readonly T[],
  build: (row: T) => { id: string; lat: number; lng: number; alt?: number; image: string; rotationDeg?: number | null; scale?: number; pick: SeaCesiumPick } | null,
  picks: Map<string, SeaCesiumPick>,
) {
  const seen = new Set<string>();
  for (const r of rows) {
    const b = build(r);
    if (!b || !Number.isFinite(b.lat) || !Number.isFinite(b.lng)) continue;
    const id = `${prefix}${b.id}`;
    seen.add(id);
    picks.set(id, b.pick);
    const position = Cesium.Cartesian3.fromDegrees(b.lng, b.lat, b.alt ?? 0);
    const rotation = b.rotationDeg != null ? -Cesium.Math.toRadians(b.rotationDeg) : 0;
    const existing = viewer.entities.getById(id);
    if (existing) {
      existing.position = new Cesium.ConstantPositionProperty(position);
      if (existing.billboard) {
        existing.billboard.image = new Cesium.ConstantProperty(b.image);
        existing.billboard.rotation = new Cesium.ConstantProperty(rotation);
      }
      continue;
    }
    viewer.entities.add({
      id,
      position,
      billboard: {
        image: b.image,
        rotation,
        alignedAxis: Cesium.Cartesian3.UNIT_Z,
        scale: b.scale ?? 1,
        heightReference: b.alt ? Cesium.HeightReference.NONE : Cesium.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scaleByDistance: new Cesium.NearFarScalar(2e4, 1.3, 3e6, 0.5),
      },
    });
  }
  for (const e of [...viewer.entities.values]) {
    if (typeof e.id === "string" && e.id.startsWith(prefix) && !seen.has(e.id)) {
      viewer.entities.remove(e);
      picks.delete(e.id);
    }
  }
}

export function SeaCesiumView(props: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const cesiumRef = useRef<CesiumNS | null>(null);
  const picksRef = useRef(new Map<string, SeaCesiumPick>());
  const onPickRef = useRef(props.onPick);
  onPickRef.current = props.onPick;
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [ready, setReady] = useState(0);

  // ── 뷰어 생성 (한 번) ──────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;
    let viewer: Viewer | null = null;
    const detach: Array<() => void> = [];

    (async () => {
      try {
        (window as unknown as { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL = "/cesium/";
        const Cesium = await import("cesium");
        await import("cesium/Build/Cesium/Widgets/widgets.css");
        if (cancelled) return;
        const ionToken = getRuntimeConfig().cesiumIonToken?.trim() || "";
        if (ionToken) Cesium.Ion.defaultAccessToken = ionToken;

        viewer = new Cesium.Viewer(container, {
          timeline: false,
          animation: false,
          baseLayerPicker: false,
          geocoder: false,
          homeButton: false,
          sceneModePicker: false,
          navigationHelpButton: false,
          fullscreenButton: false,
          vrButton: false,
          selectionIndicator: false,
          infoBox: false,
          baseLayer: false,
          msaaSamples: 4,
        });
        viewer.scene.backgroundColor = Cesium.Color.fromCssColorString("#02040a");
        viewer.scene.fog.enabled = false;
        viewer.scene.globe.enableLighting = false;
        if (typeof viewer.scene.globe.showGroundAtmosphere === "boolean") viewer.scene.globe.showGroundAtmosphere = false;
        applyObserveOceanLook(Cesium, viewer);

        viewer.imageryLayers.removeAll();
        let google3d = false;
        try {
          viewer.terrainProvider = ionToken
            ? await Cesium.createWorldTerrainAsync({ requestVertexNormals: true, requestWaterMask: false })
            : await Cesium.ArcGISTiledElevationTerrainProvider.fromUrl(ESRI_WORLD_ELEVATION);
        } catch {
          viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
        }
        if (ionToken && getRuntimeConfig().cesiumGoogle3dEnabled !== false) {
          try {
            const tiles = await Cesium.createGooglePhotorealistic3DTileset(
              { onlyUsingWithGoogleGeocoder: true },
              { maximumScreenSpaceError: 16, showCreditsOnScreen: true },
            );
            viewer.scene.primitives.add(tiles);
            google3d = true;
          } catch {
            /* Google 3D 미사용 */
          }
        }
        let imageryAdded = false;
        if (ionToken) {
          try {
            const img = await Cesium.createWorldImageryAsync({ style: Cesium.IonWorldImageryStyle.AERIAL });
            viewer.imageryLayers.addImageryProvider(img);
            imageryAdded = true;
          } catch {
            /* Esri 폴백 */
          }
        }
        if (!imageryAdded) {
          const esri = await Cesium.ArcGisMapServerImageryProvider.fromUrl(ESRI_WORLD_IMAGERY, {
            enablePickFeatures: false,
            credit: "Esri, Maxar, Earthstar Geographics, and the GIS User Community",
          });
          viewer.imageryLayers.addImageryProvider(esri);
        }
        viewer.scene.globe.depthTestAgainstTerrain = !google3d;
        if (cancelled) return;

        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(props.initial.lng, props.initial.lat - 2.2, props.initial.heightM),
          orientation: { heading: 0, pitch: Cesium.Math.toRadians(-52), roll: 0 },
        });

        detach.push(attachLiveuaStrikePulse(Cesium, viewer));
        detach.push(attachFirmsFirePulse(Cesium, viewer));

        const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        handler.setInputAction((ev: { position: import("cesium").Cartesian2 }) => {
          const picked = viewer?.scene.pick(ev.position) as { id?: { id?: string } } | undefined;
          const id = picked?.id?.id;
          onPickRef.current?.(id ? picksRef.current.get(id) ?? null : null);
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
        detach.push(() => handler.destroy());

        cesiumRef.current = Cesium;
        viewerRef.current = viewer;
        setStatus("ready");
        setReady((n) => n + 1);
      } catch (e) {
        console.warn("[SeaCesiumView] init failed", e);
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      for (const d of detach) d();
      viewerRef.current = null;
      if (viewer && !viewer.isDestroyed()) viewer.destroy();
    };
    // 초기 위치는 마운트 때만 (사건을 바꾸면 상위에서 key 로 다시 마운트)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 데이터 → 엔티티 ────────────────────────────────────────────
  useEffect(() => {
    const Cesium = cesiumRef.current;
    const viewer = viewerRef.current;
    if (!Cesium || !viewer || viewer.isDestroyed()) return;
    const picks = picksRef.current;

    syncPrefix(Cesium, viewer, "sea-ais:", props.vessels, (v) => {
      const mark = aisTrackerMark(v);
      const heading = aisVesselHeadingDeg(v);
      return {
        id: v.id,
        lat: v.lat,
        lng: v.lng,
        image: cached(`ais:${mark.kind}`, () => aisTrackerArrowSvg(mark.kind, mark.color, Math.max(14, mark.px))),
        rotationDeg: heading,
        pick: {
          kind: "ais",
          title: v.shipName || `MMSI ${v.mmsi}`,
          detail: [
            `MMSI ${v.mmsi}`,
            v.shipTypeLabel ?? null,
            v.speedOverGround != null ? `${v.speedOverGround.toFixed(1)}kn` : null,
            v.timestamp ? `수신 ${v.timestamp.slice(11, 16)} UTC` : null,
          ]
            .filter(Boolean)
            .join(" · "),
        },
      };
    }, picks);

    syncPrefix(Cesium, viewer, "sea-air:", props.aircraft, (a) => {
      const k = classifyMilAircraft(a);
      return {
        id: a.id,
        lat: a.lat,
        lng: a.lng,
        alt: Math.max(500, (a.altitude ?? 20000) * 0.3048),
        image: cached(`air:${k.role}`, () => milAircraftIconSvg(k.role)),
        rotationDeg: a.track,
        pick: {
          kind: "aircraft",
          title: a.callsign?.trim() || a.registration || a.hex,
          detail: [k.labelKo, a.altitude != null ? `${Math.round(a.altitude).toLocaleString()}ft` : null, `hex ${a.hex}`]
            .filter(Boolean)
            .join(" · "),
        },
      };
    }, picks);

    syncPrefix(Cesium, viewer, "sea-ukmto:", props.ukmto, (u) => ({
      id: u.id,
      lat: u.lat,
      lng: u.lng,
      image: cached(`ukmto:${/attack|hijack|boarding/i.test(u.incidentTypeName)}`, () =>
        /attack|hijack|boarding/i.test(u.incidentTypeName) ? dotSvg("#f43f5e", "#111827", 8) : dotSvg("#e5e7eb", "#111827", 6),
      ),
      pick: {
        kind: "ukmto",
        title: `UKMTO ${u.incidentTypeName}`,
        detail: [u.utcDateOfIncident?.slice(0, 16).replace("T", " "), u.place, u.vesselName, u.detail?.slice(0, 160)]
          .filter(Boolean)
          .join(" · "),
      },
    }), picks);

    syncPrefix(Cesium, viewer, "sea-navarea:", props.navarea, (n) =>
      n.lat == null || n.lng == null
        ? null
        : {
            id: n.id,
            lat: n.lat,
            lng: n.lng,
            image: cached("navarea", () => dotSvg("rgba(168,85,247,0.85)", "#2e1065", 6)),
            pick: { kind: "navarea", title: `NAVAREA ${n.region} · ${n.date.slice(0, 10)}`, detail: n.description.slice(0, 220) },
          },
    picks);

    syncLiveuaStrikeEntities(Cesium, viewer, props.strikes);
    syncFirmsFireEntities(
      Cesium,
      viewer,
      props.fires.map((f) => ({ id: f.id, lat: f.lat, lng: f.lng, frp: f.frp })),
    );
    viewer.scene.requestRender();
  }, [ready, props.vessels, props.aircraft, props.ukmto, props.navarea, props.strikes, props.fires]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="absolute inset-0" />
      {status !== "ready" ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black text-sm text-sky-100/70">
          {status === "loading" ? "위성 화면 불러오는 중…" : "위성 화면을 열지 못했습니다 (WebGL 확인)."}
        </div>
      ) : null}
    </div>
  );
}
