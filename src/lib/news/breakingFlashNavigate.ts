import type { BreakingFlashBriefing } from "@/lib/news/breakingFlash";
import { resolveRssFlashPlace } from "@/lib/news/rssFlashPlace";
import {
  flyTargetForTheater,
  THEATER_FLY_TO,
} from "@/lib/news/theaterMap";
import { incidentSuggestsEnergyPipelines } from "@/lib/flashPipelineReveal";
import { LOCATION_LOOK_DOWN, resolveCinematicCamera } from "@/lib/globeCamera";
import type { LabelLanguage } from "@/lib/layerPrefs";

export type BreakingFlashNavigateDeps = {
  breakingFlash: BreakingFlashBriefing | null;
  labelLanguage: LabelLanguage;
  incidentEntryAltitude: number;
  revealIncidentEnergyPipelines: () => void;
  dismissBreakingFlash: () => void;
  switchToObserveAndFly: (
    lat: number,
    lng: number,
    opts: {
      altitude: number;
      durationMs: number;
      camera: ReturnType<typeof resolveCinematicCamera>;
      descend?: boolean;
      subtitle: string;
      title: string;
      kicker: string;
    },
  ) => void;
};

/**
 * 신속속보 양피지 「위치로 가기」— GlobeDashboard OverlayHost 인라인에서 추출.
 * RSS 지명 해석 → 좌표 → 전장 플라이 순으로 관측 진입.
 */
export function runBreakingFlashGoToLocation({
  breakingFlash,
  labelLanguage,
  incidentEntryAltitude,
  revealIncidentEnergyPipelines,
  dismissBreakingFlash,
  switchToObserveAndFly,
}: BreakingFlashNavigateDeps): void {
  if (!breakingFlash) return;
  if (
    incidentSuggestsEnergyPipelines({
      theater: breakingFlash.theater,
      title: breakingFlash.title,
      body: breakingFlash.paragraphs?.join(" ") ?? "",
    })
  ) {
    revealIncidentEnergyPipelines();
  }
  /** 이름 있는 지점·해역·나라 대표 도시는 도시보다 넓게 보여 줘야 위치가 어긋나 보이지 않는다 */
  const altitudeFor = () => {
    const precision = breakingFlash.place?.precision;
    if (precision === "country-rep") return Math.max(incidentEntryAltitude, 1.1);
    if (precision === "landmark") return Math.max(incidentEntryAltitude, 0.7);
    return incidentEntryAltitude;
  };
  const fly = (lat: number, lng: number) => {
    const headline =
      breakingFlash.title
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .pop() || breakingFlash.title;
    switchToObserveAndFly(lat, lng, {
      altitude: altitudeFor(),
      durationMs: LOCATION_LOOK_DOWN.durationMs,
      camera: resolveCinematicCamera({
        pitch: LOCATION_LOOK_DOWN.pitch,
        bearing: LOCATION_LOOK_DOWN.bearing,
        lookAt: LOCATION_LOOK_DOWN.lookAt,
      }),
      descend: true,
      subtitle: labelLanguage === "en" ? "Breaking" : "속보",
      title: headline,
      kicker: labelLanguage === "en" ? "Inside the report" : "속보 공간",
    });
    dismissBreakingFlash();
  };
  // 브리핑을 만들 때 제목·사진 설명·요약·번역문에서 이미 위치를 풀었다 — 그 좌표를 먼저 쓴다.
  // (예전엔 제목만 다시 풀어 기사 안의 시험장·해역·사진 설명 단서를 버렸다)
  if (breakingFlash.coords) {
    fly(breakingFlash.coords.lat, breakingFlash.coords.lng);
    return;
  }
  if (breakingFlash.flashSource !== "liveuamap") {
    const headline =
      breakingFlash.title.split("\n").slice(1).join("\n").trim() ||
      breakingFlash.title;
    const body = breakingFlash.paragraphs?.join("\n") ?? "";
    const named = resolveRssFlashPlace(headline, body, breakingFlash.theater);
    if (named) {
      fly(named.lat, named.lng);
      return;
    }
  }
  if (breakingFlash.theater && breakingFlash.theater !== "global") {
    const target = flyTargetForTheater(breakingFlash.theater);
    if (target.kind === "coords") {
      fly(target.lat, target.lng);
    } else {
      const center = THEATER_FLY_TO[target.theater];
      fly(center.lat, center.lng);
    }
  }
}
