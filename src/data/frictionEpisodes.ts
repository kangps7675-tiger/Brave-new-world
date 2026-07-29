/**
 * 영토분쟁 아카이브 · 진영 내부(bloc) 렌즈 — 큐레이션 에피소드.
 * UI에서는 국경·화약고와 합쳐 `territorialArchive`로 노출.
 * coordinates: [lng, lat] (GeoJSON). 내부 fly는 lat/lng로 변환.
 * 브리핑은 공개 기록·표준 명칭·연도 위주.
 * 양피지 본문(frictionParchmentParagraphs)은 사실 위에 문학적 논픽션 줄글을 가미한다.
 */

import type { AxisHubId } from "@/data/axisNetwork";

export type FrictionLens = "china" | "russia" | "iran" | "north_korea" | "global";

export type FrictionEpisode = {
  id: string;
  title: string;
  /** English 전환용 — 없으면 한국어 폴백 */
  titleEn?: string;
  locationNameEn?: string;
  briefingEn?: string;
  noteEn?: string;
  lens: FrictionLens;
  /** [경도, 위도] */
  coordinates: readonly [number, number];
  /** MapLibre 계열 줌 — globe altitude로 환산 */
  zoom: number;
  pitch: number;
  bearing: number;
  historicalYear: number;
  yearEnd?: number;
  locationName: string;
  briefing: string;
  /** soft fly 시 펄스 링 반경 스케일 */
  radiusScale: number;
  parties: string[];
  note?: string;
};

export const FRICTION_EPISODES: readonly FrictionEpisode[] = [
  {
    id: "sino-soviet-border-1969",
    title: "중소 국경 분쟁 (1969)",
    titleEn: "Sino-Soviet Border Conflict (1969)",
    locationNameEn: "Zhenbao Island, Ussuri River (Damansky Island)",
    briefingEn:
      "In March 1969, Chinese and Soviet border units clashed on Zhenbao Island (Damansky in Soviet usage) in the Ussuri River. The fighting, over the island's ownership and border interpretation, is recorded as causing casualties on the order of dozens to hundreds on both sides. Further border skirmishes and a diplomatic-military standoff followed that year — a case where the Sino-Soviet split within the communist bloc broke into open armed conflict.",
    lens: "china",
    coordinates: [133.84, 46.64],
    zoom: 7,
    pitch: 45,
    bearing: 0,
    historicalYear: 1969,
    locationName: "우수리강 전바오섬 (다만스키 섬)",
    parties: ["CHN", "SUN"],
    radiusScale: 1.6,
    briefing:
      "1969년 3월, 중국과 소련 국경 부대가 우수리강(흑룡강)의 전바오섬(소련명 다만스키)에서 교전했습니다. 섬의 귀속과 국경 해석을 둘러싼 충돌로 양측 수십~수백 명 규모의 사상자가 발생했다는 기록이 있습니다. 같은 해 추가 국경 교전과 외교·군사 대치가 이어졌으며, 공산권 내부의 중소 분열이 무력 충돌로 드러난 사례로 기록됩니다.",
  },
  {
    id: "sino-vietnamese-war-1979",
    title: "중월전쟁 (1979)",
    titleEn: "Sino-Vietnamese War (1979)",
    locationNameEn: "Lạng Sơn border area, northern Vietnam",
    briefingEn:
      "On 17 February 1979 the People's Liberation Army attacked across Vietnam's northern border. The background combined Vietnam's intervention in Cambodia (ousting the Khmer Rouge), ethnic-minority and boat-people issues, and the Soviet–Vietnam treaty. Major fighting lasted about a month before China announced a withdrawal; literature offers casualty estimates in the tens of thousands on both sides.",
    lens: "china",
    coordinates: [106.76, 21.85],
    zoom: 6.5,
    pitch: 45,
    bearing: -10,
    historicalYear: 1979,
    locationName: "베트남 랑선(Lạng Sơn) 국경 지대",
    parties: ["CHN", "VNM"],
    radiusScale: 2.2,
    briefing:
      "1979년 2월 17일, 중국 인민해방군이 베트남 북부 국경을 공격하며 전쟁이 시작되었습니다. 배경에는 베트남의 캄보디아 개입(크메르 루주 축출), 소수민족·보트피플 문제, 소련–베트남 조약 등이 겹칩니다. 주요 교전은 약 한 달간 지속된 뒤 중국군이 철수했다고 발표했으며, 양측 사상자 규모는 수만 명대라는 추정치가 문헌에 제시됩니다.",
  },
  {
    id: "galwan-valley-clash-2020",
    title: "중인 국경·LAC 분쟁 (1962–)",
    titleEn: "Sino–Indian Border / LAC Conflict (1962–)",
    locationNameEn: "Himalaya · Aksai Chin · Doklam · Galwan (LAC)",
    noteEn:
      "India is a democracy — not a pure 'intra-anti-Western' case, but a public record of China-hub border friction from 1962 through Galwan.",
    briefingEn:
      "The 1962 Sino–Indian War left an ambiguous Line of Actual Control. Doklam 2017 tested gray-zone infrastructure without gunfire; Galwan 2020 turned lethal under firearm restraints. One unfinished Himalayan frontier—not three separate wars.",
    lens: "china",
    coordinates: [78.2, 34.37],
    zoom: 6.5,
    pitch: 50,
    bearing: 15,
    historicalYear: 1962,
    locationName: "히말라야 · 아크사이친 · 도클람 · 갈완 (LAC)",
    parties: ["CHN", "IND"],
    radiusScale: 2.0,
    note: "인도는 민주주의 국가. ‘반서방국간’ 순수 사례는 아니나 중국 허브 국경 마찰의 공개 연속사다.",
    briefing:
      "1962년 중인전쟁이 모호한 실질통제선(LAC)을 남긴 뒤, 2017 도클람은 총성 없는 인프라 대치로, 2020 갈완은 총기 제한 하 육탄 충돌로 같은 미획정 국경을 다시 켰습니다. 세 사건이 아니라 하나의 히말라야 전선 연속사입니다.",
  },
  {
    id: "russo-georgian-war-2008",
    title: "러시아–조지아 전쟁 (2008)",
    titleEn: "Russo-Georgian War (2008)",
    locationNameEn: "Tskhinvali, South Ossetia",
    briefingEn:
      "In August 2008, after fighting between Georgian forces and South Ossetian separatists escalated, Russia intervened militarily. Combat unfolded over a matter of days, after which Russia recognized the independence of Abkhazia and South Ossetia. Georgia and most UN member states regard them as Georgian territory. International organizations and reporting put casualties and displaced persons in the thousands to tens of thousands.",
    lens: "russia",
    coordinates: [43.96, 42.22],
    zoom: 7.5,
    pitch: 40,
    bearing: -5,
    historicalYear: 2008,
    locationName: "남오세티야 츠힌발리(Tskhinvali)",
    parties: ["RUS", "GEO"],
    radiusScale: 1.8,
    briefing:
      "2008년 8월, 조지아군과 남오세티야 분리 세력 간 전투가 확대된 뒤 러시아가 군사 개입했습니다. 교전은 수일 단위로 전개되었고, 이후 러시아는 압하지야·남오세티야의 독립을 승인했습니다. 조지아와 유엔 회원국 다수는 이를 자국 영토로 간주합니다. 사상자·이재민 규모는 수천~수만 명대 추정치가 국제기구·보도에 제시되었습니다.",
  },
  {
    id: "nagorno-karabakh-war-2020",
    title: "나고르노-카라바흐 분쟁 (1988–2023)",
    titleEn: "Nagorno-Karabakh Conflict (1988–2023)",
    locationNameEn: "Nagorno-Karabakh / Artsakh · Shusha",
    briefingEn:
      "From the late-Soviet First Karabakh War (1988–94) through a long freeze, the Second War of 2020, and Azerbaijan’s 2023 offensive that ended the unrecognized republic, this is one continuous post-Soviet territorial conflict. Russia mediated and peacekept but was not the primary belligerent; Armenia and Azerbaijan (with Artsakh) fought over status and land. Casualties across the arc run into the thousands to tens of thousands depending on period and source.",
    lens: "russia",
    coordinates: [46.75, 39.76],
    zoom: 7,
    pitch: 45,
    bearing: 10,
    historicalYear: 1988,
    yearEnd: 2023,
    locationName: "나고르노-카라바흐/아르차흐 · 슈샤",
    parties: ["AZE", "ARM"],
    radiusScale: 1.7,
    briefing:
      "소련 말 제1차 카라바흐 전쟁(1988–94)부터 장기 동결, 2020년 제2차 전쟁, 2023년 아제르바이잔의 공세로 미인정 공화국이 해체되기까지—하나의 포스트소련 영토 분쟁 연속사입니다. 러시아는 중재·평화유지로 관여했으나 주교전 당사자는 아르메니아·아제르바이잔(아르차흐)입니다. 시기·출처에 따라 사상자는 수천~수만 명대로 집계·추정됩니다.",
  },
  {
    id: "iran-iraq-war-1980",
    title: "이란–이라크 전쟁 (1980–1988)",
    titleEn: "Iran–Iraq War (1980–1988)",
    locationNameEn: "Shatt al-Arab / Arvand Rud waterway",
    briefingEn:
      "In September 1980 Iraq invaded Iran; the war ended in 1988 with acceptance of UN Resolution 598. The stated causes and background include the Shatt al-Arab waterway and border interpretation, and regional security perceptions after Iran's 1979 Islamic Revolution. Combined death and injury estimates vary by source from hundreds of thousands to around a million, and chemical weapons use is documented in international investigations and rulings.",
    lens: "iran",
    coordinates: [48.43, 30.43],
    zoom: 6.5,
    pitch: 45,
    bearing: 0,
    historicalYear: 1980,
    yearEnd: 1988,
    locationName: "샤트알아랍(Shatt al-Arab / Arvand Rud) 수로",
    parties: ["IRN", "IRQ"],
    radiusScale: 2.4,
    briefing:
      "1980년 9월, 이라크가 이란을 침공하며 전쟁이 시작되어 1988년 유엔 결의 598호 수용으로 종결되었습니다. 개전 명분·배경에는 샤트알아랍 수로·국경 해석, 1979년 이란 이슬람혁명 이후 지역 안보 인식이 포함됩니다. 사망·부상 합계는 문헌마다 다르나 수십만~백만 명대 추정치가 제시되며, 화학무기 사용 등도 국제 조사·판결 기록에 남았습니다.",
  },
  {
    id: "tunb-islands-dispute-1971",
    title: "톰브·아부무사 제도 점령 (1971)",
    titleEn: "Seizure of the Tunbs and Abu Musa (1971)",
    locationNameEn: "Greater Tunb, Persian Gulf",
    briefingEn:
      "On 30 November 1971, timed to Britain's withdrawal from the Persian Gulf, Iran landed forces on and took control of Greater and Lesser Tunb (and, through related arrangements, Abu Musa). The newly formed United Arab Emirates has claimed sovereignty ever since, while Iran maintains effective control. The islands and strait remain a recurring agenda item in bilateral and Gulf diplomacy.",
    lens: "iran",
    coordinates: [55.27, 26.26],
    zoom: 8.5,
    pitch: 55,
    bearing: -20,
    historicalYear: 1971,
    locationName: "페르시아만 큰 톰브(Greater Tunb)",
    parties: ["IRN", "ARE"],
    radiusScale: 1.3,
    briefing:
      "1971년 11월 30일, 영국의 페르시아만 철군 일정에 맞춰 이란이 큰 톰브·작은 톰브(및 관련 조치로 아부무사)에 병력을 상륙·통제했습니다. 직후 성립한 아랍에미리트(UAE)는 영유권을 주장해 왔으며, 이란은 실효 지배를 유지하고 있습니다. 해협·도서 주권 문제는 양국·걸프 외교에서 반복되는 의제입니다.",
  },
  {
    id: "cambodian-vietnamese-war-1978",
    title: "베트남–캄보디아 전쟁 (1978–1979)",
    titleEn: "Cambodian–Vietnamese War (1978–1979)",
    locationNameEn: "Phnom Penh, Cambodia",
    briefingEn:
      "In December 1978 Vietnamese forces invaded Cambodia (Democratic Kampuchea under the Khmer Rouge). Phnom Penh fell in January 1979 and a pro-Vietnamese government was installed. Preceding border clashes, the Khmer Rouge atrocities, and Cold War diplomatic alignments form the background. The intervention is widely described as one direct trigger of the 1979 Sino-Vietnamese War.",
    lens: "global",
    coordinates: [104.91, 11.55],
    zoom: 7,
    pitch: 45,
    bearing: 0,
    historicalYear: 1978,
    yearEnd: 1979,
    locationName: "캄보디아 프놈펜",
    parties: ["VNM", "KHM"],
    radiusScale: 2.0,
    briefing:
      "1978년 12월, 베트남군이 캄보디아(민주캄푸치아·크메르 루주)를 침공했습니다. 1979년 1월 프놈펜이 함락되고 친베트남 정권이 수립되었습니다. 선행 국경 교전과 크메르 루주 학살·외교 배치가 배경으로 정리됩니다. 이 개입은 1979년 중월전쟁의 직접 계기 중 하나로 널리 서술됩니다.",
  },
  {
    id: "eritrean-ethiopian-war-1998",
    title: "에티오피아–에리트레아 전쟁 (1998–2000)",
    titleEn: "Eritrean–Ethiopian War (1998–2000)",
    locationNameEn: "Badme area",
    briefingEn:
      "In May 1998, clashes over control of border areas such as Badme escalated into full-scale war, halted by the Algiers Agreement in 2000. The war was marked by trench warfare and mass troop deployments, with death estimates in the tens of thousands. Border demarcation went through subsequent arbitration and implementation; the dispute centered on territory, sovereignty, and logistics access.",
    lens: "global",
    coordinates: [37.94, 14.53],
    zoom: 7.5,
    pitch: 40,
    bearing: 5,
    historicalYear: 1998,
    yearEnd: 2000,
    locationName: "바드메(Badme) 일대",
    parties: ["ETH", "ERI"],
    radiusScale: 1.9,
    briefing:
      "1998년 5월 바드메 등 국경 지대 관할을 둘러싼 충돌이 전면전으로 확대되어 2000년 알제 협정으로 휴전했습니다. 참호전·대량 병력 투입이 특징이며, 사망자는 수만 명대 추정치가 제시됩니다. 국경 획정은 이후 중재·이행 과정을 거쳤고, 분쟁의 초점은 영토·주권·물류 접근에 있었습니다.",
  },
  {
    id: "sino-north-korean-border-clash-1969",
    title: "조·중 국경 긴장 (1960년대 말)",
    titleEn: "DPRK–China Border Tensions (late 1960s)",
    locationNameEn: "Border area around Mt. Paektu",
    noteEn:
      "Primary open sources on individual incidents are limited. Reflects reporting and research on deteriorating DPRK–China relations and border tension during the Sino-Soviet split and Cultural Revolution.",
    briefingEn:
      "In the late 1960s, amid the Sino-Soviet dispute and China's Cultural Revolution, DPRK–China relations also deteriorated. Research and memoirs mention border-area tension, propaganda campaigns, and reports of small-scale friction — though no single documented open battle on the scale of Zhenbao Island. The point of this lens: even inside a 'blood alliance,' distrust accumulated in the same period as the 1969 Sino-Soviet border clashes.",
    lens: "north_korea",
    coordinates: [128.05, 42.01],
    zoom: 7.5,
    pitch: 45,
    bearing: 0,
    historicalYear: 1969,
    locationName: "백두산 일대 국경",
    parties: ["PRK", "CHN"],
    radiusScale: 1.5,
    note: "개별 교전의 시·공간 세부는 공개 1차 자료가 제한적이다. 중소 분열·문화대혁명기 조중 관계 악화와 국경 긴장 보도·연구를 반영한다.",
    briefing:
      "1960년대 말, 중소 분쟁과 중국 문화대혁명 국면에서 북한–중국 관계도 악화되었습니다. 연구·회고 자료는 국경 지대 긴장, 선전 공세, 소규모 마찰 보고를 언급하나, 전바오섬 규모의 공개 전면전으로 문서화된 단일 사건은 아닙니다. 1969년 중소 국경 교전과 같은 시기에 ‘혈맹’ 관계 안에서도 불신이 쌓였다는 점이 이 렌즈의 요지입니다.",
  },
  {
    id: "ussr-north-korea-maritime-friction-1980s",
    title: "북·소 통항·주권 마찰 (1980년대)",
    titleEn: "DPRK–USSR Transit & Sovereignty Friction (1980s)",
    locationNameEn: "Tumen River estuary · East Sea boundary waters",
    noteEn:
      "Represents a recurring zone of Cold War-era sensitivity over the Soviet Pacific Fleet, transit, fishing, and airspace rather than a single dated naval battle.",
    briefingEn:
      "During the Cold War the Soviet Union expanded naval and air activity toward the Pacific, and North Korea showed sovereignty sensitivities over territorial waters, airspace, and base access. Open sources record friction and negotiation over fishing, transit, and intelligence collection, but resist reduction to a single 1985 'naval battle.' We read it as a caution about dependency — a contrast to today's Russia–DPRK military closeness.",
    lens: "north_korea",
    coordinates: [130.65, 42.43],
    zoom: 8,
    pitch: 40,
    bearing: -10,
    historicalYear: 1985,
    locationName: "두만강 하구 · 동해 접경 해역",
    parties: ["PRK", "SUN"],
    radiusScale: 1.6,
    note: "특정 일자 해전이라기보다 냉전기 소련 태평양함대·통항·어업·영공 관련 주권 민감성이 반복된 구간을 대표 좌표로 둔다.",
    briefing:
      "냉전기 소련은 태평양 방면 해군·항공 활동을 확대했고, 북한은 영해·영공·기지 접근을 둘러싼 주권 민감성을 드러냈습니다. 공개 자료는 어업·통항·정보 수집 등에 대한 마찰·교섭 기록을 남기며, 단일한 1985년 ‘해전’으로 고정하기는 어렵습니다. 오늘날 러–북 군수 밀착과 대조되는, 종속 관계에 대한 경계 사례로 읽습니다.",
  },
] as const;

/** labelLanguage에 따른 텍스트 해석 — EN 필드 없으면 KO 폴백 */
export function episodeTitle(ep: FrictionEpisode, lang: "ko" | "en"): string {
  return lang === "en" && ep.titleEn ? ep.titleEn : ep.title;
}

export function episodeLocationName(ep: FrictionEpisode, lang: "ko" | "en"): string {
  return lang === "en" && ep.locationNameEn ? ep.locationNameEn : ep.locationName;
}

export function episodeBriefing(ep: FrictionEpisode, lang: "ko" | "en"): string {
  return lang === "en" && ep.briefingEn ? ep.briefingEn : ep.briefing;
}

export function episodeNote(ep: FrictionEpisode, lang: "ko" | "en"): string | undefined {
  return lang === "en" && ep.noteEn ? ep.noteEn : ep.note;
}

export function episodeLat(ep: FrictionEpisode): number {
  return ep.coordinates[1];
}

export function episodeLng(ep: FrictionEpisode): number {
  return ep.coordinates[0];
}

/** react-globe altitude ≈ f(MapLibre zoom) */
export function altitudeFromEpisodeZoom(zoom: number): number {
  return Math.max(0.38, Math.min(1.25, 5.5 / zoom));
}

export function lensForHub(hubId: AxisHubId): FrictionLens {
  if (hubId === "CHN") return "china";
  if (hubId === "RUS") return "russia";
  if (hubId === "IRN") return "iran";
  return "north_korea";
}

export function episodesForHub(
  hubId: AxisHubId,
  includeGlobal = true,
): FrictionEpisode[] {
  const lens = lensForHub(hubId);
  return FRICTION_EPISODES.filter(
    (e) => e.lens === lens || (includeGlobal && e.lens === "global"),
  );
}

export function frictionEpisodeById(id: string): FrictionEpisode | undefined {
  return FRICTION_EPISODES.find((e) => e.id === id);
}

export function hubColorForLens(lens: FrictionLens): string {
  if (lens === "china") return "rgba(230, 180, 34, 0.92)";
  if (lens === "russia") return "rgba(96, 165, 250, 0.92)";
  if (lens === "iran") return "rgba(16, 185, 129, 0.92)";
  if (lens === "north_korea") return "rgba(255, 0, 85, 0.92)";
  return "rgba(167, 139, 250, 0.9)";
}

/** 에피소드 좌표 주변 국소 전쟁구역 폴리곤 ([lng, lat] ring) */
export function frictionEpisodeWarGeometry(ep: FrictionEpisode): {
  type: "Polygon";
  coordinates: number[][][];
} {
  const lat = episodeLat(ep);
  const lng = episodeLng(ep);
  const halfLng = Math.max(0.28, 0.22 * ep.radiusScale);
  const halfLat = halfLng * 0.72;
  return {
    type: "Polygon",
    coordinates: [
      [
        [lng - halfLng, lat - halfLat],
        [lng + halfLng, lat - halfLat],
        [lng + halfLng, lat + halfLat],
        [lng - halfLng, lat + halfLat],
        [lng - halfLng, lat - halfLat],
      ],
    ],
  };
}
