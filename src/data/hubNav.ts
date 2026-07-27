import {
  AXIS_HUB_META,
  AXIS_NODES,
  edgesForHub,
  type AxisHubId,
} from "@/data/axisNetwork";
import type { NavSelection, NavSubItem, RegionBBox } from "@/data/navRegions";

export type HubFocusMode =
  | "network"
  | "ally"
  | "claim"
  | "arms"
  | "regime"
  | "westpac-pulse"
  | "disputes";

export type HubClaim = {
  id: string;
  label: string;
  description: string;
  lat: number;
  lng: number;
  /** 색연필 원 반경 (deg 근사 → ringMaxRadius 스케일) */
  radiusScale: number;
  altitude: number;
  bbox: RegionBBox;
};

export type HubAlly = {
  code: string;
  nameKo: string;
  nameEn: string;
  lat: number;
  lng: number;
};

export type HubDefinition = {
  hubId: AxisHubId;
  /** nav top id e.g. hub-chn */
  id: string;
  label: string;
  lat: number;
  lng: number;
  altitude: number;
  description: string;
  bbox: RegionBBox;
  iso: string;
  color: string;
  allies: HubAlly[];
  claims: HubClaim[];
};

function alliesForHub(hub: AxisHubId): HubAlly[] {
  const codes = new Set<string>();
  for (const e of edgesForHub(hub)) {
    if (e.a !== hub) codes.add(e.a);
    if (e.b !== hub) codes.add(e.b);
  }
  return [...codes]
    .map((code) => AXIS_NODES[code])
    .filter(Boolean)
    .map((n) => ({
      code: n.code,
      nameKo: n.nameKo,
      nameEn: n.nameEn,
      lat: n.lat,
      lng: n.lng,
    }))
    .sort((a, b) => a.nameKo.localeCompare(b.nameKo, "ko"));
}

export const HUB_DEFINITIONS: HubDefinition[] = [
  {
    hubId: "CHN",
    id: "hub-chn",
    label: "중국",
    lat: 35.0,
    lng: 105.0,
    altitude: 1.55,
    description: "국경 · 우군 관계망 · 영유권 주장 및 영향",
    bbox: { minLat: 5, maxLat: 55, minLng: 70, maxLng: 145 },
    iso: "CHN",
    color: AXIS_HUB_META.CHN.color,
    allies: alliesForHub("CHN"),
    claims: [
      {
        id: "claim-chn-taiwan",
        label: "대만",
        description: "하나의 중국 주장 · 해협",
        lat: 23.7,
        lng: 121.0,
        radiusScale: 2.2,
        altitude: 0.85,
        bbox: { minLat: 21.5, maxLat: 26.5, minLng: 118.5, maxLng: 123.5 },
      },
      {
        id: "claim-chn-scs",
        label: "남중국해 (구단선)",
        description: "스프래틀리·파라셀 포함 주장해역",
        lat: 12.0,
        lng: 114.0,
        radiusScale: 3.4,
        altitude: 1.05,
        bbox: { minLat: 4, maxLat: 22, minLng: 105, maxLng: 122 },
      },
      {
        id: "claim-chn-senkaku",
        label: "센카쿠·댜오위다오",
        description: "중일 영유권",
        lat: 25.75,
        lng: 123.45,
        radiusScale: 1.4,
        altitude: 0.78,
        bbox: { minLat: 24.5, maxLat: 27.5, minLng: 122, maxLng: 126 },
      },
      {
        id: "claim-chn-arunachal",
        label: "아루나찰 (짱난)",
        description: "중인 국경 주장",
        lat: 28.2,
        lng: 94.0,
        radiusScale: 1.8,
        altitude: 0.9,
        bbox: { minLat: 26.5, maxLat: 29.5, minLng: 91.5, maxLng: 97.5 },
      },
    ],
  },
  {
    hubId: "RUS",
    id: "hub-rus",
    label: "러시아",
    lat: 58.0,
    lng: 50.0,
    altitude: 1.75,
    description: "국경 · 우군 관계망 · 영유권 주장 및 영향",
    bbox: { minLat: 40, maxLat: 72, minLng: 20, maxLng: 100 },
    iso: "RUS",
    color: AXIS_HUB_META.RUS.color,
    allies: alliesForHub("RUS"),
    claims: [
      {
        id: "claim-rus-crimea",
        label: "크림",
        description: "병합 주장 · 흑해",
        lat: 45.3,
        lng: 34.0,
        radiusScale: 1.6,
        altitude: 0.75,
        bbox: { minLat: 44.2, maxLat: 46.3, minLng: 32.3, maxLng: 36.7 },
      },
      {
        id: "claim-rus-donbas",
        label: "돈바스",
        description: "도네츠크·루한스크",
        lat: 48.3,
        lng: 38.0,
        radiusScale: 2.0,
        altitude: 0.72,
        bbox: { minLat: 47.0, maxLat: 50.0, minLng: 36.0, maxLng: 40.5 },
      },
      {
        id: "claim-rus-abkhazia",
        label: "압하지야",
        description: "인정·주둔",
        lat: 43.0,
        lng: 41.0,
        radiusScale: 1.2,
        altitude: 0.7,
        bbox: { minLat: 42.5, maxLat: 43.6, minLng: 40.0, maxLng: 42.0 },
      },
      {
        id: "claim-rus-s-ossetia",
        label: "남오세티야",
        description: "인정·주둔",
        lat: 42.3,
        lng: 44.0,
        radiusScale: 1.1,
        altitude: 0.68,
        bbox: { minLat: 41.9, maxLat: 42.7, minLng: 43.4, maxLng: 44.7 },
      },
    ],
  },
  {
    hubId: "PRK",
    id: "hub-prk",
    label: "북한",
    lat: 39.0,
    lng: 127.0,
    altitude: 0.95,
    description: "국경 · 우군 관계망 · 영유권 주장 및 영향",
    bbox: { minLat: 33, maxLat: 43.5, minLng: 123.5, maxLng: 132 },
    iso: "PRK",
    color: AXIS_HUB_META.PRK.color,
    allies: alliesForHub("PRK"),
    claims: [
      {
        id: "claim-prk-rok",
        label: "한반도 전체",
        description: "과거 통일 서사 · 2023 말 정책 전환",
        lat: 37.5,
        lng: 127.5,
        radiusScale: 2.8,
        altitude: 0.85,
        bbox: { minLat: 33.5, maxLat: 43.0, minLng: 124.5, maxLng: 131.5 },
      },
      {
        id: "claim-prk-nll",
        label: "서해 NLL",
        description: "북방한계선 부정 · 서해",
        lat: 37.7,
        lng: 125.3,
        radiusScale: 1.5,
        altitude: 0.72,
        bbox: { minLat: 37.0, maxLat: 38.5, minLng: 124.0, maxLng: 126.5 },
      },
    ],
  },
  {
    hubId: "IRN",
    id: "hub-irn",
    label: "이란",
    lat: 32.0,
    lng: 53.0,
    altitude: 1.35,
    description: "국경 · 우군 관계망 · 영유권 주장 및 영향",
    bbox: { minLat: 14, maxLat: 40, minLng: 40, maxLng: 66 },
    iso: "IRN",
    color: AXIS_HUB_META.IRN.color,
    allies: alliesForHub("IRN"),
    claims: [
      {
        id: "claim-irn-tunbs",
        label: "아부무사·톤브 제도",
        description: "걸프 도서 영유권",
        lat: 26.25,
        lng: 55.3,
        radiusScale: 1.3,
        altitude: 0.7,
        bbox: { minLat: 25.5, maxLat: 27.0, minLng: 54.5, maxLng: 56.2 },
      },
      {
        id: "claim-irn-gulf",
        label: "페르시아만 영향권",
        description: "걸프·호르무즈",
        lat: 26.8,
        lng: 52.5,
        radiusScale: 2.6,
        altitude: 0.95,
        bbox: { minLat: 24, maxLat: 30, minLng: 48, maxLng: 58 },
      },
      {
        id: "claim-irn-levant",
        label: "레반트 축",
        description: "시리아·레바논 영향",
        lat: 34.5,
        lng: 37.5,
        radiusScale: 2.4,
        altitude: 0.9,
        bbox: { minLat: 32, maxLat: 37, minLng: 34, maxLng: 42 },
      },
    ],
  },
];

export function hubById(hubId: AxisHubId): HubDefinition | undefined {
  return HUB_DEFINITIONS.find((h) => h.hubId === hubId);
}

export function hubByNavId(id: string): HubDefinition | undefined {
  return HUB_DEFINITIONS.find((h) => h.id === id || h.hubId === id);
}

export function parseHubNavId(id: string): {
  hubId: AxisHubId | null;
  focusMode: HubFocusMode | null;
  claimId?: string;
  allyCode?: string;
} {
  const key = id.toLowerCase();
  if (key.startsWith("claim-")) {
    const hub = HUB_DEFINITIONS.find((h) => h.claims.some((c) => c.id === id));
    return { hubId: hub?.hubId ?? null, focusMode: "claim", claimId: id };
  }
  if (key.startsWith("ally-")) {
    // ally-chn-blr
    const parts = id.split("-");
    const hubSlug = parts[1]?.toUpperCase();
    const allyCode = parts[2]?.toUpperCase();
    const hub = HUB_DEFINITIONS.find(
      (h) => h.hubId === hubSlug || h.id === `hub-${parts[1]}`,
    );
    return {
      hubId: hub?.hubId ?? null,
      focusMode: "ally",
      allyCode: allyCode || undefined,
    };
  }
  if (key.endsWith("-arms") || key.includes("-arms")) {
    const hub = hubByNavId(id.replace(/-arms$/, "")) ?? hubByNavId(id.replace("-arms", ""));
    const h =
      hub ??
      HUB_DEFINITIONS.find((x) => id === `hub-${x.hubId.toLowerCase()}-arms`);
    return { hubId: h?.hubId ?? null, focusMode: "arms" };
  }
  if (key.endsWith("-regime") || key.includes("-regime") || key.includes("-friction")) {
    const h =
      hubByNavId(id.replace(/-regime$/, "").replace(/-friction$/, "")) ??
      HUB_DEFINITIONS.find(
        (x) =>
          id === `hub-${x.hubId.toLowerCase()}-regime` ||
          id === `hub-${x.hubId.toLowerCase()}-friction`,
      );
    return { hubId: h?.hubId ?? null, focusMode: "regime" };
  }
  if (key.startsWith("hub-")) {
    const hub = hubByNavId(id);
    return { hubId: hub?.hubId ?? null, focusMode: "network" };
  }
  return { hubId: null, focusMode: null };
}

export function selectionForHubNetwork(hub: HubDefinition): NavSelection {
  return {
    id: hub.id,
    label: hub.label,
    lat: hub.lat,
    lng: hub.lng,
    altitude: hub.altitude,
    description: hub.description,
    bbox: hub.bbox,
    actorCountries: [hub.iso, ...hub.allies.map((a) => a.code)],
    groupId: "axis-hubs",
    hubId: hub.hubId,
    focusMode: "network",
  };
}

export function selectionForAlly(hub: HubDefinition, ally: HubAlly): NavSelection {
  return {
    id: `ally-${hub.hubId.toLowerCase()}-${ally.code.toLowerCase()}`,
    label: ally.nameKo,
    lat: ally.lat,
    lng: ally.lng,
    altitude: 1.1,
    description: `${hub.label} 우군 · ${ally.nameKo}`,
    bbox: {
      minLat: Math.min(hub.lat, ally.lat) - 8,
      maxLat: Math.max(hub.lat, ally.lat) + 8,
      minLng: Math.min(hub.lng, ally.lng) - 12,
      maxLng: Math.max(hub.lng, ally.lng) + 12,
    },
    actorCountries: [hub.iso, ally.code],
    groupId: "axis-hubs",
    parentLabel: hub.label,
    hubId: hub.hubId,
    focusMode: "ally",
    allyCode: ally.code,
  };
}

export function selectionForClaim(hub: HubDefinition, claim: HubClaim): NavSelection {
  return {
    id: claim.id,
    label: claim.label,
    lat: claim.lat,
    lng: claim.lng,
    altitude: claim.altitude,
    description: claim.description,
    bbox: claim.bbox,
    actorCountries: [hub.iso],
    groupId: "axis-hubs",
    parentLabel: hub.label,
    hubId: hub.hubId,
    focusMode: "claim",
    claimId: claim.id,
  };
}

export function selectionForArms(hub: HubDefinition): NavSelection {
  return {
    id: `hub-${hub.hubId.toLowerCase()}-arms`,
    label: `${hub.label} · 무기거래`,
    lat: hub.lat,
    lng: hub.lng,
    altitude: hub.altitude,
    description: "SIPRI 재래식 무기 이전 (축 관련)",
    bbox: hub.bbox,
    actorCountries: [hub.iso, ...hub.allies.map((a) => a.code)],
    groupId: "axis-hubs",
    parentLabel: hub.label,
    hubId: hub.hubId,
    focusMode: "arms",
  };
}

export function selectionForRegime(hub: HubDefinition): NavSelection {
  return {
    id: `hub-${hub.hubId.toLowerCase()}-regime`,
    label: `${hub.label} · 반서방국 충돌사`,
    lat: hub.lat,
    lng: hub.lng,
    altitude: hub.altitude,
    description: "진영 내부 충돌 현장 · 상황 설명 큐레이션",
    bbox: hub.bbox,
    actorCountries: [hub.iso],
    groupId: "axis-hubs",
    parentLabel: hub.label,
    hubId: hub.hubId,
    focusMode: "regime",
  };
}

/** 상단 nav의 전체 분쟁사 진입점 — 특정 허브 필터 없이 11대 에피소드 표시 */
export function selectionForRegimeOverview(): NavSelection {
  return {
    id: "axis-regime-overview",
    label: "반서방국 분쟁사",
    lat: 34,
    lng: 76,
    altitude: 2.15,
    description: "반서방 진영 내부의 주요 충돌 현장 11대 큐레이션",
    bbox: { minLat: -20, maxLat: 70, minLng: -20, maxLng: 145 },
    groupId: "axis-hubs",
    focusMode: "regime",
  };
}

/** 상단 nav의 국경·영토 분쟁 진입점 — LSIB(미 국무부) + 실제 분쟁 큐레이션 56건 */
export function selectionForDisputesOverview(): NavSelection {
  return {
    id: "territorial-disputes-overview",
    label: "국경·영토 분쟁 (LSIB)",
    lat: 20,
    lng: 70,
    altitude: 2.3,
    description: "미 국무부 LSIB 경계 데이터 + 실제 영토·해양 분쟁 큐레이션",
    bbox: { minLat: -20, maxLat: 70, minLng: -20, maxLng: 145 },
    groupId: "axis-hubs",
    focusMode: "disputes",
  };
}

/** HoverNav 이벤트 메뉴 — USNI·JSO 공개 관측 기반 주간 함선 이동기 */
export function selectionForWestpacPulseOverview(): NavSelection {
  return {
    id: "westpac-ship-movements-overview",
    label: "서태평양 주간 함선 이동기",
    lat: 22,
    lng: 128,
    altitude: 1.65,
    description: "공개 관측 기반 주간 함선 이동 기록 (실시간 AIS 아님)",
    bbox: { minLat: 5, maxLat: 42, minLng: 110, maxLng: 150 },
    groupId: "axis-hubs",
    focusMode: "westpac-pulse",
  };
}

/** HoverNav용 가상 그룹 — 실제 UI는 커스텀 드롭다운 */
export const HUB_NAV_GROUP = {
  id: "axis-hubs",
  label: "반서방 축",
  items: HUB_DEFINITIONS.map((hub) => ({
    id: hub.id,
    label: hub.label,
    lat: hub.lat,
    lng: hub.lng,
    altitude: hub.altitude,
    description: hub.description,
    bbox: hub.bbox,
    actorCountries: [hub.iso],
    subItems: [
      ...hub.allies.map(
        (a): NavSubItem => ({
          id: `ally-${hub.hubId.toLowerCase()}-${a.code.toLowerCase()}`,
          label: a.nameKo,
          lat: a.lat,
          lng: a.lng,
          altitude: 1.1,
          description: `${hub.label} 우군`,
          bbox: {
            minLat: a.lat - 4,
            maxLat: a.lat + 4,
            minLng: a.lng - 6,
            maxLng: a.lng + 6,
          },
          actorCountries: [hub.iso, a.code],
        }),
      ),
      ...hub.claims.map(
        (c): NavSubItem => ({
          id: c.id,
          label: c.label,
          lat: c.lat,
          lng: c.lng,
          altitude: c.altitude,
          description: c.description,
          bbox: c.bbox,
          actorCountries: [hub.iso],
        }),
      ),
    ],
  })),
} as const;
