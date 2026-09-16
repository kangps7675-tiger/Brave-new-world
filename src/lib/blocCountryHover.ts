/**
 * MapLibre 진영·지경학·축허브 국가 면 → PolygonLayerFeature.
 * (index 없는 properties 기반 피킹)
 */

import type { PolygonLayerFeature } from "@/components/globe/types";
import {
  ALLIED_BLOC_LABEL,
  type AlliedBloc,
} from "@/lib/alliedBlocCountryPolygons";
import {
  GEOECON_CAMP_LABEL,
  GEOECON_MEMBERSHIP_LABEL,
  type GeoEconCamp,
} from "@/lib/geoeconBlocCountryPolygons";
import type { LabelLanguage } from "@/lib/layerPrefs";

const ALLIED_BLOCS = new Set<string>([
  "nato",
  "aukus",
  "crink",
  "crink-aligned",
  "us-bilateral-treaty",
  "us-security-partner",
]);

const GEOECON_CAMPS = new Set<string>([
  "pro-western",
  "anti-western",
  "non-aligned",
  "mixed",
]);

const AXIS_HUB_NAME: Record<string, { ko: string; en: string }> = {
  CHN: { ko: "중국", en: "China" },
  RUS: { ko: "러시아", en: "Russia" },
  PRK: { ko: "북한", en: "North Korea" },
  IRN: { ko: "이란", en: "Iran" },
};

export const BLOC_COUNTRY_FILL_LAYER_IDS = [
  "allied-bloc-countries-fill",
  "geoecon-bloc-countries-fill",
  "axis-hub-countries-fill",
] as const;

export type BlocCountryFillLayerId = (typeof BLOC_COUNTRY_FILL_LAYER_IDS)[number];

export function isBlocCountryFillLayerId(id: string): id is BlocCountryFillLayerId {
  return (BLOC_COUNTRY_FILL_LAYER_IDS as readonly string[]).includes(id);
}

export function blocFeatureFromMapProps(
  layerId: string,
  properties: Record<string, unknown> | null | undefined,
): PolygonLayerFeature | null {
  if (!properties) return null;
  const iso = typeof properties.iso === "string" ? properties.iso : "";
  const name =
    typeof properties.name === "string" && properties.name
      ? properties.name
      : iso || "—";

  if (layerId === "allied-bloc-countries-fill") {
    const bloc = properties.bloc;
    if (typeof bloc !== "string" || !ALLIED_BLOCS.has(bloc)) return null;
    return {
      polygonLayer: "allied-bloc",
      name,
      iso,
      bloc: bloc as AlliedBloc,
      disputed: Boolean(properties.disputed),
    };
  }

  if (layerId === "geoecon-bloc-countries-fill") {
    const camp = properties.camp;
    if (typeof camp !== "string" || !GEOECON_CAMPS.has(camp)) return null;
    const memberships = Array.isArray(properties.memberships)
      ? properties.memberships.filter((m): m is string => typeof m === "string")
      : typeof properties.memberships === "string"
        ? properties.memberships.split(",").map((s) => s.trim()).filter(Boolean)
        : [];
    return {
      polygonLayer: "geoecon-bloc",
      name,
      iso,
      camp: camp as GeoEconCamp,
      memberships,
    };
  }

  if (layerId === "axis-hub-countries-fill") {
    if (!iso) return null;
    return {
      polygonLayer: "axis-hub",
      name,
      iso,
    };
  }

  return null;
}

export function alliedBlocAffiliationDetail(bloc: AlliedBloc, lang: LabelLanguage): string {
  return lang === "en" ? ALLIED_BLOC_LABEL[bloc].en : ALLIED_BLOC_LABEL[bloc].ko;
}

export function geoeconCampDetail(camp: GeoEconCamp, lang: LabelLanguage): string {
  return lang === "en" ? GEOECON_CAMP_LABEL[camp].en : GEOECON_CAMP_LABEL[camp].ko;
}

export function geoeconMembershipsMeta(memberships: string[]): string | undefined {
  if (!memberships.length) return undefined;
  return memberships.map((m) => GEOECON_MEMBERSHIP_LABEL[m] ?? m).join(" · ");
}

export function axisHubDisplayName(iso: string, fallback: string, lang: LabelLanguage): string {
  const hit = AXIS_HUB_NAME[iso];
  if (!hit) return fallback;
  return lang === "en" ? hit.en : hit.ko;
}

/** 진영별 한 줄 보충 — 호버 body에 레이어 설명과 함께 붙임 */
export function alliedBlocMeaning(bloc: AlliedBloc, lang: LabelLanguage): string {
  if (lang === "en") {
    switch (bloc) {
      case "nato":
        return "This country is shaded as NATO — the North Atlantic mutual-defense alliance.";
      case "aukus":
        return "Shaded as AUKUS (Australia–UK–US security pact). More specific than NATO membership here.";
      case "crink":
        return "Shaded as CRINK hub (China–Russia–Iran–North Korea). A Western analytic label, not a formal treaty.";
      case "crink-aligned":
        return "Shaded as CSTO / CRINK-aligned — Russia-led collective security, linked to the CRINK sketch.";
      case "us-bilateral-treaty":
        return "US bilateral mutual-defense treaty partner (e.g. Korea, Japan, Philippines, Thailand).";
      case "us-security-partner":
        return "Hosts major US bases under defense cooperation, without a full mutual-defense treaty.";
    }
  }
  switch (bloc) {
    case "nato":
      return "이 나라는 NATO(북대서양조약기구) 상호방위 동맹 소속으로 칠해져 있습니다.";
    case "aukus":
      return "AUKUS(호주·영국·미국 안보협정) 소속입니다. 이 지도에서는 NATO보다 더 특정한 분류로 표시됩니다.";
    case "crink":
      return "CRINK(중국·러시아·이란·북한) 축 허브로 표시됩니다. 공식 동맹 조약 이름이 아니라 분석용 통칭입니다.";
    case "crink-aligned":
      return "CSTO(집단안보조약기구)·CRINK 연계권으로 표시됩니다. 러시아 주도 안보 협력권입니다.";
    case "us-bilateral-treaty":
      return "미국과 양자 상호방위조약을 맺은 나라입니다(예: 한국·일본·필리핀·태국).";
    case "us-security-partner":
      return "미군 기지가 있으나 정식 상호방위조약은 없는 안보 파트너입니다(예: 카타르·바레인).";
  }
}

export function geoeconCampMeaning(camp: GeoEconCamp, lang: LabelLanguage): string {
  if (lang === "en") {
    switch (camp) {
      case "pro-western":
        return "Geoeconomic camp: Western-aligned trade/finance platforms (G7, EU, CPTPP, etc.).";
      case "anti-western":
        return "Geoeconomic camp: anti-Western / CRINK-linked platforms (EAEU, SCO, BRI, INSTC).";
      case "non-aligned":
        return "Geoeconomic camp: non-aligned regional blocs (ASEAN, NAM, AfCFTA, Mercosur).";
      case "mixed":
        return "Mixed memberships (e.g. RCEP / SCO India–Pakistan) — not a single camp.";
    }
  }
  switch (camp) {
    case "pro-western":
      return "지경학 진영: 서방·우호권 경제협력(G7·EU·CPTPP 등) 회원국으로 칠해져 있습니다.";
    case "anti-western":
      return "지경학 진영: 반서방·CRINK 연계 플랫폼(EAEU·SCO·BRI·INSTC) 쪽입니다.";
    case "non-aligned":
      return "지경학 진영: 비동맹·지역 블록(ASEAN·NAM·AfCFTA·Mercosur) 쪽입니다.";
    case "mixed":
      return "혼합 소속(RCEP·SCO 인도/파키스탄 등)이라 한 진영으로만 보기 어렵습니다.";
  }
}
