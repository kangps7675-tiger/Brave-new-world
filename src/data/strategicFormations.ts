/**
 * 지정학 개관 레이어 — 참고 인포그래픽(진영 블록·핵심 군사거점·명명된 전략태세·
 * 전략지원 연결선·상황 콜아웃)을 이 앱의 기존 진영 색칠(alliedBlocCountryPolygons)
 * 위에 얹는 "전략 태세 개관" 오버레이.
 *
 * 진영 블록 음영(NATO/AUKUS/CRINK/CSTO 등)과 군사기지 레이어는 이미
 * src/lib/alliedBlocCountryPolygons.ts · src/lib/militaryBaseForces.ts 등으로
 * 구현·기본 ON 상태다. 이 파일은 그 위에 없던 3가지만 새로 더한다:
 *   1) 핵심 거점 스타 마커(동맹측/CRINK측 — 호버 시 설명)
 *   2) 명명된 전략태세 라벨(Atlantic Bastion 등 — 호버 시 설명)
 *   3) 동맹 거점 간 "전략지원" 연결선(대권호) + 상시 표시 상황 콜아웃 3건
 *
 * 좌표는 공개 자료 기준 근사치(기지 소재 도시/항만 좌표)이며, 인포그래픽처럼
 * 도식적 배치가 아니라 실측 근사 좌표를 그대로 쓴다. 예측·비공개 정보 없음.
 */

import type { SituationCallout } from "@/data/situationCalloutTypes";

export type StrategicPostureVariant = "facility-allied" | "facility-crink" | "formation";

export type StrategicPostureSeed = {
  id: string;
  variant: StrategicPostureVariant;
  lat: number;
  lng: number;
  nameKo: string;
  nameEn: string;
  descKo: string;
  descEn: string;
};

/** 동맹측 핵심 군사거점 — 참고 이미지의 "AUKUS/동맹측 시설" 스타 마커에 대응 */
export const ALLIED_STRATEGIC_FACILITIES: StrategicPostureSeed[] = [
  {
    id: "fac-pearl-harbor",
    variant: "facility-allied",
    lat: 21.35,
    lng: -157.95,
    nameKo: "진주만·히캄 합동기지 (하와이)",
    nameEn: "Pearl Harbor–Hickam JB (Hawaii)",
    descKo: "미 인도태평양사령부(INDOPACOM) 본부. 태평양 전역 미군 전력의 총괄 지휘·군수 허브입니다.",
    descEn: "HQ of US INDOPACOM — the command and logistics hub for US forces across the Pacific.",
  },
  {
    id: "fac-yokosuka",
    variant: "facility-allied",
    lat: 35.29,
    lng: 139.67,
    nameKo: "요코스카 해군기지 (일본)",
    nameEn: "Yokosuka Naval Base (Japan)",
    descKo: "미 7함대 모항. 해외에 상시 배치된 유일한 미 항공모함 전단의 정박지입니다.",
    descEn: "Homeport of the US 7th Fleet — the only forward-deployed US carrier strike group base overseas.",
  },
  {
    id: "fac-sasebo",
    variant: "facility-allied",
    lat: 33.16,
    lng: 129.72,
    nameKo: "사세보 해군기지 (일본)",
    nameEn: "Sasebo Naval Base (Japan)",
    descKo: "미 강습상륙전단(7함대) 모항. 대만해협·동중국해에 근접한 상륙전력 거점입니다.",
    descEn: "Homeport of US amphibious ready forces — positioned close to the Taiwan Strait and East China Sea.",
  },
  {
    id: "fac-guam",
    variant: "facility-allied",
    lat: 13.55,
    lng: 144.93,
    nameKo: "앤더슨 공군기지·아프라항 (괌)",
    nameEn: "Andersen AFB / Apra Harbor (Guam)",
    descKo: "\"제2의 방어선\" 핵심 거점. 폭격기 순환배치와 잠수함 전대가 상주하는 서태평양 전략 요충지입니다.",
    descEn: "Key node on the \"second island chain\" — hosts bomber rotations and a forward-based submarine squadron.",
  },
  {
    id: "fac-diego-garcia",
    variant: "facility-allied",
    lat: -7.31,
    lng: 72.41,
    nameKo: "디에고가르시아 해군지원시설 (인도양)",
    nameEn: "Naval Support Facility Diego Garcia (Indian Ocean)",
    descKo: "미·영 공동 운용. 인도양 한복판에서 중동·인도태평양 양쪽에 전력을 투사하는 원거리 폭격·군수 거점입니다.",
    descEn: "Jointly run by the US and UK — a long-range bomber and logistics hub projecting into both the Middle East and Indo-Pacific.",
  },
  {
    id: "fac-subic-bay",
    variant: "facility-allied",
    lat: 14.79,
    lng: 120.28,
    nameKo: "수빅만·EDCA 순환배치 거점 (필리핀)",
    nameEn: "Subic Bay / EDCA rotational sites (Philippines)",
    descKo: "미-필리핀 확대방위협력협정(EDCA)에 따른 순환배치 거점 — 상시 기지는 아니며 남중국해 대응 전진 거점입니다.",
    descEn: "Rotational access under the US–Philippines EDCA — not a permanent base, but a forward point for South China Sea contingencies.",
  },
  {
    id: "fac-darwin",
    variant: "facility-allied",
    lat: -12.46,
    lng: 130.84,
    nameKo: "다윈·HMAS 스털링 (호주)",
    nameEn: "Darwin / HMAS Stirling (Australia)",
    descKo: "AUKUS 잠수함전력순환주둔(SRF-West) 및 미 해병대 순환배치 거점 — 인도양·남중국해 양쪽을 감제합니다.",
    descEn: "Site of AUKUS Submarine Rotational Force–West and rotational US Marine deployments, overlooking both the Indian Ocean and South China Sea.",
  },
];

/** CRINK측 핵심 군사거점 — 참고 이미지의 "CRINK측 시설" 스타 마커에 대응 */
export const CRINK_STRATEGIC_FACILITIES: StrategicPostureSeed[] = [
  {
    id: "fac-zhanjiang",
    variant: "facility-crink",
    lat: 21.2,
    lng: 110.4,
    nameKo: "잔장 (중국 남해함대사령부)",
    nameEn: "Zhanjiang (PLAN South Sea Fleet HQ)",
    descKo: "중국 인민해방군 해군 남해함대 사령부 — 남중국해 작전의 주 지휘 거점입니다.",
    descEn: "HQ of the PLA Navy's South Sea Fleet — the primary command node for South China Sea operations.",
  },
  {
    id: "fac-yulin",
    variant: "facility-crink",
    lat: 18.22,
    lng: 109.55,
    nameKo: "위린 해군기지 (하이난)",
    nameEn: "Yulin Naval Base (Hainan)",
    descKo: "탄도미사일 잠수함(SSBN) 기지로 알려진 지하 시설 보유 거점 — 남중국해 진출로에 위치합니다.",
    descEn: "Reported to house underground SSBN pens — sits astride China's access route into the South China Sea.",
  },
  {
    id: "fac-severomorsk",
    variant: "facility-crink",
    lat: 69.07,
    lng: 33.42,
    nameKo: "세베로모르스크 (러시아 북방함대사령부)",
    nameEn: "Severomorsk (Russian Northern Fleet HQ)",
    descKo: "러시아 북방함대 사령부·콜라반도 SSBN 기지군 — '러시아 요새(Bastion)' 방어권의 핵심입니다.",
    descEn: "HQ of Russia's Northern Fleet and the Kola Peninsula SSBN base cluster — the core of the Russian \"Bastion\" defense concept.",
  },
  {
    id: "fac-vladivostok",
    variant: "facility-crink",
    lat: 43.12,
    lng: 131.9,
    nameKo: "블라디보스토크 (러시아 태평양함대사령부)",
    nameEn: "Vladivostok (Russian Pacific Fleet HQ)",
    descKo: "러시아 태평양함대 사령부 — 동해·오호츠크해 방면 해군력의 중심입니다.",
    descEn: "HQ of Russia's Pacific Fleet, the center of Russian naval power facing the Sea of Japan and Okhotsk.",
  },
  {
    id: "fac-bandar-abbas",
    variant: "facility-crink",
    lat: 27.19,
    lng: 56.28,
    nameKo: "반다르아바스 (이란 해군기지)",
    nameEn: "Bandar Abbas (Iranian naval base)",
    descKo: "호르무즈 해협을 감제하는 이란 해군·혁명수비대 해군 거점입니다.",
    descEn: "Iranian navy and IRGC-Navy base overlooking the Strait of Hormuz.",
  },
  {
    id: "fac-nampo",
    variant: "facility-crink",
    lat: 38.74,
    lng: 125.41,
    nameKo: "남포 (북한 해군기지)",
    nameEn: "Nampo (North Korean naval base)",
    descKo: "평양의 외항이자 서해 함대 거점 — 북한 해군력의 서해안 축입니다.",
    descEn: "Pyongyang's outer port and a West Sea Fleet base — the western anchor of North Korean naval power.",
  },
];

/** 명명된 전략태세 — 참고 이미지의 "Atlantic Bastion / Russian Bastion / JEF" 등 라벨 오버레이 */
export const STRATEGIC_FORMATION_LABELS: StrategicPostureSeed[] = [
  {
    id: "fmn-atlantic-bastion",
    variant: "formation",
    lat: 63,
    lng: -12,
    nameKo: "대서양 보루 (GIUK 갭)",
    nameEn: "Atlantic Bastion (GIUK Gap)",
    descKo: "그린란드-아이슬란드-영국을 잇는 대서양 대잠 감시선 — 나토가 러시아 잠수함의 대서양 진출을 감시·저지하는 전통적 관문입니다.",
    descEn: "The Greenland–Iceland–UK anti-submarine barrier — NATO's traditional gateway for monitoring Russian submarine transits into the Atlantic.",
  },
  {
    id: "fmn-russian-bastion",
    variant: "formation",
    lat: 74,
    lng: 38,
    nameKo: "러시아 요새 방어권 (콜라·바렌츠해)",
    nameEn: "Russian Bastion Defense (Kola/Barents Sea)",
    descKo: "러시아가 전략 잠수함(SSBN)을 보호하기 위해 콜라반도·바렌츠해에 구축한 다층 방공·대잠 방어권입니다.",
    descEn: "A layered air-defense and anti-submarine zone Russia maintains around the Kola Peninsula/Barents Sea to protect its SSBN fleet.",
  },
  {
    id: "fmn-eastern-flank",
    variant: "formation",
    lat: 56.5,
    lng: 25,
    nameKo: "나토 동부전선 전진배치 (발트 3국)",
    nameEn: "NATO Eastern Flank forward presence (Baltic states)",
    descKo: "2014년 이후 강화된 나토의 다국적 전투단 전진배치 — 러시아 접경 발트 3국·폴란드에 순환 배치됩니다.",
    descEn: "NATO's enhanced Forward Presence battlegroups, rotating through the Baltic states and Poland since 2014.",
  },
  {
    id: "fmn-jef",
    variant: "formation",
    lat: 58,
    lng: 8,
    nameKo: "합동원정군 (JEF)",
    nameEn: "Joint Expeditionary Force (JEF)",
    descKo: "영국 주도로 북유럽·발트해 10개국이 참여하는 신속대응 다국적군 — 나토와 별개로 운용되는 소다자 안보 협의체입니다.",
    descEn: "A UK-led rapid-response coalition of 10 Northern European and Baltic states — a minilateral security format run alongside, not inside, NATO.",
  },
  {
    id: "fmn-sovereign-bases",
    variant: "formation",
    lat: 34.65,
    lng: 33.15,
    nameKo: "주권기지구역 (키프로스)",
    nameEn: "Sovereign Base Areas (Cyprus)",
    descKo: "아크로티리·데켈리아 — 영국이 1960년 키프로스 독립 후에도 유지한 주권 영토로, 중동 방면 감청·전력투사 거점입니다.",
    descEn: "Akrotiri and Dhekelia — sovereign UK territory retained after Cyprus's 1960 independence, used for intelligence-gathering and power projection into the Middle East.",
  },
  {
    id: "fmn-fpda",
    variant: "formation",
    lat: 1.8,
    lng: 103.5,
    nameKo: "5개국 방위협정 (FPDA)",
    nameEn: "Five Power Defence Arrangements (FPDA)",
    descKo: "영국·호주·뉴질랜드·말레이시아·싱가포르 간 1971년 체결된 방위협의체 — 조약 수준 동맹은 아니지만 정례 합동훈련을 유지합니다.",
    descEn: "A 1971 defense consultative arrangement among the UK, Australia, New Zealand, Malaysia and Singapore — short of a treaty alliance, but sustains regular joint exercises.",
  },
  {
    id: "fmn-submarine-patrol",
    variant: "formation",
    lat: 47.75,
    lng: -122.73,
    nameKo: "전략핵잠수함 초계 거점 (뱅고어)",
    nameEn: "SSBN deterrence patrol base (Bangor)",
    descKo: "미 해군 뱅고어 기지 — 태평양 방면 오하이오급 전략핵잠수함(SSBN) 초계의 모항입니다. 대서양 쪽은 킹스베이·파슬레인이 맡습니다.",
    descEn: "US Navy Naval Base Kitsap–Bangor — homeport for Pacific Ohio-class SSBN deterrence patrols. The Atlantic side is covered by Kings Bay and Faslane.",
  },
];

export const ALL_STRATEGIC_POSTURE_SEEDS: StrategicPostureSeed[] = [
  ...ALLIED_STRATEGIC_FACILITIES,
  ...CRINK_STRATEGIC_FACILITIES,
  ...STRATEGIC_FORMATION_LABELS,
];

export type StrategicSupportLink = {
  id: string;
  fromId: string;
  toId: string;
  nameKo: string;
  nameEn: string;
  descKo: string;
  descEn: string;
};

/** 동맹측 거점 간 "전략지원" 연결선 — 참고 이미지의 진주만→요코스카/사세보/아프라항 화살표에 대응 */
export const STRATEGIC_SUPPORT_LINKS: StrategicSupportLink[] = [
  {
    id: "link-pearl-yokosuka",
    fromId: "fac-pearl-harbor",
    toId: "fac-yokosuka",
    nameKo: "진주만 → 요코스카",
    nameEn: "Pearl Harbor → Yokosuka",
    descKo: "INDOPACOM 본부에서 서태평양 전진배치 함대로 이어지는 지휘·군수 지원선입니다.",
    descEn: "Command-and-logistics link from INDOPACOM headquarters to the forward-deployed fleet in the Western Pacific.",
  },
  {
    id: "link-pearl-guam",
    fromId: "fac-pearl-harbor",
    toId: "fac-guam",
    nameKo: "진주만 → 괌",
    nameEn: "Pearl Harbor → Guam",
    descKo: "제1도련선 밖 '제2방어선' 괌으로 이어지는 폭격기·잠수함 순환배치 지원선입니다.",
    descEn: "Rotational bomber and submarine reinforcement link to Guam, the anchor of the \"second island chain.\"",
  },
  {
    id: "link-guam-sasebo",
    fromId: "fac-guam",
    toId: "fac-sasebo",
    nameKo: "괌 → 사세보",
    nameEn: "Guam → Sasebo",
    descKo: "괌에서 대만해협 인접 상륙전력 거점 사세보로 이어지는 전진배치 지원선입니다.",
    descEn: "Forward-support link from Guam to Sasebo, the amphibious-force base closest to the Taiwan Strait.",
  },
];

/** 지정학 개관에서 상시 표시할 상황 콜아웃 3건 — 참고 이미지의 주석 박스에 대응 */
export const STRATEGIC_OVERVIEW_CALLOUTS: SituationCallout[] = [
  {
    id: "overview-dprk-missile",
    theater: "korea",
    lat: 40.5,
    lng: 127.3,
    title: "북한 탄도미사일 위협",
    body: "단거리~대륙간 탄도미사일 개발 지속 (각국 정부 발표 기준). 유엔 안보리 결의 위반 사안입니다.",
    side: "red",
  },
  {
    id: "overview-crimea-annexation",
    theater: "russia-ukraine",
    lat: 45.3,
    lng: 34.4,
    title: "러시아의 크름반도 병합",
    body: "2014년 병합 이후 유엔총회 결의(68/262 등)로 다수 회원국이 불인정하고 있는 사안입니다.",
    side: "red",
  },
  {
    id: "overview-scs-ecs-clashes",
    theater: "china-taiwan",
    lat: 16,
    lng: 114,
    title: "남중국해·동중국해 충돌",
    body: "영유권·항행의 자유를 둘러싼 대치가 반복됩니다 (필리핀·베트남·일본 등 각국 발표 기준).",
    side: "neutral",
  },
];

export function strategicFacilityById(id: string): StrategicPostureSeed | undefined {
  return ALL_STRATEGIC_POSTURE_SEEDS.find((s) => s.id === id);
}
