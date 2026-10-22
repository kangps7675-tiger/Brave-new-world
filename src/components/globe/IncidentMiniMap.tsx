"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { StackItem } from "@/lib/incidentStack/build";
import { nearbyPlaces } from "@/lib/nearbyContext";

const IncidentFlatMap = dynamic(() => import("@/components/globe/IncidentFlatMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-[#0b1724]" />,
});

function hhmm(at: number): string {
  return new Date(at).toISOString().slice(5, 16).replace("T", " ") + "Z";
}

type Props = {
  item: StackItem;
  /** 같은 지도에 흐리게 찍을 다른 최근 사건 */
  others?: readonly StackItem[];
  lang: "ko" | "en";
  /** 말풍선 첫 줄 — 사건 종류(선박·타격·정세 등) */
  kindLabel: string;
  heightClass?: string;
  interactive?: boolean;
};

/**
 * 사건 카드 안에 넣는 작은 2D 위치 지도 — 점 + 말풍선(지명·종류·시각) + 근처 해협·시설 라벨 + 주변 최근 사건 점.
 * 3D 지구본을 열지 않고도 "어디서 난 일인지"가 보이게 한다.
 */
export function IncidentMiniMap({ item, others = [], lang, kindLabel, heightClass = "h-44", interactive = false }: Props) {
  const places = useMemo(() => nearbyPlaces(item.lat, item.lng, lang), [item.lat, item.lng, item.id, lang]);
  const dots = useMemo(
    () =>
      others
        .filter((o) => o.id !== item.id && Math.abs(o.lat - item.lat) < 8 && Math.abs(o.lng - item.lng) < 12)
        .slice(0, 20)
        .map((o) => ({ id: o.id, lat: o.lat, lng: o.lng })),
    [others, item.id, item.lat, item.lng],
  );
  const place = item.place && !/^[a-z-]+$/.test(item.place) ? item.place : (places[0]?.name ?? "");
  return (
    <div className={`${heightClass} w-full overflow-hidden rounded-md border border-white/10`} data-incident-mini-map>
      <IncidentFlatMap
        lat={item.lat}
        lng={item.lng}
        zoom={5}
        interactive={interactive}
        ariaLabel={lang === "en" ? "Incident location map" : "사건 위치 지도"}
        callout={{ title: kindLabel, subtitle: [place, hhmm(item.at)].filter(Boolean).join(" · ") }}
        dots={dots}
        places={places}
      />
    </div>
  );
}
