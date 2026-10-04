/**
 * Stage 공개면 조립 — Content는 이 모듈(또는 types의 ObserveStagePublicApi)만 본다.
 * camera/settle/governor/cinemaPref 외 Stage 내부는 re-export하지 않는다.
 */

import {
  readObserveCinemaPref,
  writeObserveCinemaPref,
} from "@/lib/cesiumObserveStage";
import {
  holdObserveRender,
  observeRequestRender,
  releaseObserveRender,
} from "@/lib/cesiumObserveRenderGovernor";
import type {
  ObserveStageCameraApi,
  ObserveStagePublicApi,
  ObserveStageSettleApi,
} from "@/lib/cesiumObserveContent/types";

export type CreateObserveStagePublicApiOpts = {
  camera: ObserveStageCameraApi;
  settle: ObserveStageSettleApi;
};

/** Host(CesiumSatelliteGlobe)가 넘기는 camera/settle에 governor·cinemaPref를 붙인다. */
export function createObserveStagePublicApi(
  opts: CreateObserveStagePublicApiOpts,
): ObserveStagePublicApi {
  return {
    camera: opts.camera,
    settle: opts.settle,
    governor: {
      hold: holdObserveRender,
      release: releaseObserveRender,
      requestRender: observeRequestRender,
    },
    cinemaPref: {
      read: readObserveCinemaPref,
      write: writeObserveCinemaPref,
    },
  };
}
