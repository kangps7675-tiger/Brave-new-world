"use client";

import { forwardRef, memo, type Ref } from "react";
import { MapGlobeView } from "@/components/MapGlobeView";
import type { MapGlobeMethods } from "@/lib/mapGlobeRef";

export type PausedMapGlobeProps = React.ComponentProps<typeof MapGlobeView> & {
  interactionPaused: boolean;
};

type InnerProps = {
  forwardedRef: Ref<MapGlobeMethods>;
  interactionPaused: boolean;
  mapProps: React.ComponentProps<typeof MapGlobeView>;
};

/**
 * memo(forwardRef) + `{...spread}` 뒤에 ref가 덮이면, 얼린 props가
 * useImperativeHandle의 대상이 되어
 * `Cannot add property current, object is not extensible`가 난다.
 * inner는 일반 memo, 바깥만 forwardRef — ref는 항상 스프레드 뒤에 둔다.
 */
const PausedMapGlobeViewInner = memo(function PausedMapGlobeViewInner({
  forwardedRef,
  interactionPaused,
  mapProps,
}: InnerProps) {
  void interactionPaused;
  return <MapGlobeView {...mapProps} ref={forwardedRef} />;
}, (prev, next) => {
  if (prev.forwardedRef !== next.forwardedRef) return false;
  if (
    prev.mapProps.basemapMode !== next.mapProps.basemapMode ||
    prev.mapProps.ultraLite !== next.mapProps.ultraLite ||
    prev.mapProps.showCityLabels !== next.mapProps.showCityLabels ||
    prev.mapProps.mapStyleUrl !== next.mapProps.mapStyleUrl
  ) {
    return false;
  }
  if (next.interactionPaused && prev.interactionPaused) {
    return true;
  }
  return false;
});

/** 레이어 패널 열림 동안 지도 GeoJSON 재빌드 차단 — 메인 스레드 UI 멈춤 방지.
 *  basemapMode / ultraLite는 패널이 열려 있어도 즉시 반영. */
export const PausedMapGlobeView = forwardRef<MapGlobeMethods, PausedMapGlobeProps>(
  function PausedMapGlobeView(props, ref) {
    const interactionPaused = Boolean(props.interactionPaused);
    const { interactionPaused: _paused, ...mapProps } = props;
    void _paused;
    return (
      <PausedMapGlobeViewInner
        forwardedRef={ref}
        interactionPaused={interactionPaused}
        mapProps={mapProps}
      />
    );
  },
);
