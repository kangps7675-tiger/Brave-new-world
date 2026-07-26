/**
 * 레퍼런스 라이브러리 — 콘텐츠 집필용 1차 자료 목록.
 *
 * 「반서방 11대 분쟁사」(frictionEpisodes.ts)는 큐레이션 서사고, 이쪽은 그 서사를
 * 뒷받침할 원자료 대장이다. 각 항목은 저장소에 실제로 보존된 파일을 가리키며
 * (scripts/vendor/strategic-missile/…), 파생 산출물이 있으면 함께 적는다.
 *
 * 새 자료를 넣을 때 규칙:
 *  1. 원본을 scripts/vendor/ 아래에 손대지 말고 그대로 보존
 *  2. 파서가 필요하면 extract 스크립트로 정규화 JSON을 하나 만들고 커밋
 *  3. 여기에 인용 정보를 등록 — 지도·문서 어디서 쓰든 출처가 한 곳에서 나온다
 */

export type ReferenceMediaKind = "geodata" | "dataset" | "report" | "workbook";

export type ReferenceLibraryEntry = {
  id: string;
  titleKo: string;
  titleEn: string;
  publisher: string;
  kind: ReferenceMediaKind;
  /** 저장소 내 원본 경로 — 삭제·변환 금지 */
  vendorPath: string;
  /** 파서를 거친 정규화 산출물 (있으면) */
  normalizedPath?: string;
  /** 이 자료에서 나온 공개 데이터 파일 */
  derived: string[];
  /** 지도에 실제로 붙은 레이어 / API */
  surfaces: string[];
  coverage: string;
  citation: string;
  url?: string;
  /** 콘텐츠로 쓸 때 반드시 같이 적어야 할 한계 */
  caveatKo: string;
};

export const REFERENCE_LIBRARY: ReferenceLibraryEntry[] = [
  {
    id: "plarf-silo-study",
    titleKo: "PLARF 사일로 연구 — 중국 미사일 사일로군 판독",
    titleEn: "PLARF Silo Study",
    publisher: "PLARF Silo Study (open-source imagery analysis)",
    kind: "geodata",
    vendorPath: "scripts/vendor/strategic-missile/plarf-silo-study/PLARF-Silo-Study-Clean.kmz",
    normalizedPath:
      "scripts/vendor/strategic-missile/plarf-silo-study/plarf-silo-study.normalized.json",
    derived: ["missile-silos.json", "missile-silo-fields.json"],
    surfaces: ["/api/layers/strategic-missile?dataset=silos"],
    coverage: "위먼·하미·항긴기 3개 사일로군 사일로 312 · 도로 619구간, 별도 조사 격자 560",
    citation: "PLARF Silo Study shapefiles/KMZ, WGS84 (EPSG:4326)",
    caveatKo:
      "사일로 판정은 위성영상 판독 결과지 공식 확인이 아니다. 조사 격자 560개는 새 후보지를 훑은 범위일 뿐 사일로 존재를 뜻하지 않으며, 확인된 3개 사일로군과 지리적으로 겹치지 않는다.",
  },
  {
    id: "vtn-china-silo-construction",
    titleKo: "중국 미사일 사일로 건설 2019–2021",
    titleEn: "China's Missile Silo Construction 2019-2021",
    publisher: "VTN / open-source report",
    kind: "report",
    vendorPath:
      "scripts/vendor/strategic-missile/reports/VTN-Chinas-Missile-Silo-Construction-2019-2021.pdf",
    derived: [],
    surfaces: [],
    coverage: "2019–2021 건설 진척 서술 — PLARF 사일로 연구의 해설 문서",
    citation: "VTN-20N03AD1328201, China's Missile Silo Construction 2019-2021",
    caveatKo: "지도 데이터가 아니라 서술 리포트. 사일로군 타임라인 집필의 근거 문서로만 쓴다.",
  },
  {
    id: "nti-india-pakistan-launch-tracker",
    titleKo: "NTI 인도·파키스탄 미사일 발사 추적기",
    titleEn: "India and Pakistan Missile Launch Tracker",
    publisher: "Nuclear Threat Initiative · CNS (James Martin Center)",
    kind: "workbook",
    vendorPath:
      "scripts/vendor/strategic-missile/nti-missile-tracker/India-Pakistan-Missile-Launch-Tracker_v2026.1.twbx",
    normalizedPath:
      "scripts/vendor/strategic-missile/nti-missile-tracker/nti-missile-tests.normalized.json",
    derived: ["missile-test-sites.json", "missile-launch-tests.json"],
    surfaces: [
      "/api/layers/strategic-missile?dataset=launches",
      "/api/layers/strategic-missile?dataset=test-sites",
    ],
    coverage: "1979–2020 인도 228건 · 파키스탄 98건, 시험장 10곳 좌표 포함",
    citation: "NTI/CNS India and Pakistan Missile Launch Tracker v2026.1",
    caveatKo:
      "Tableau 추출본 기준이라 최신 발사가 빠져 있을 수 있다. 좌표는 발사 시설 위치이지 탄착점이 아니다.",
  },
  {
    id: "rvsn-order-of-battle",
    titleKo: "러시아 전략로켓군(RVSN) 편제",
    titleEn: "Russian Strategic Rocket Forces order of battle",
    publisher: "Open-source curation",
    kind: "dataset",
    vendorPath: "scripts/data/russia-srf-divisions-seed.json",
    derived: ["strategic-missile-bases.json"],
    surfaces: ["/api/layers/strategic-missile?dataset=bases"],
    coverage: "제27근위·제31·제33근위 미사일군 예하 12개 사단 주둔지와 배치 체계",
    citation: "RVSN army/division garrisons, open-source compilation",
    caveatKo:
      "좌표는 주둔 도시지 발사 진지가 아니다. 이동식(Yars 등)은 실제 전개 위치가 상시 달라진다.",
  },
];

export function referenceById(id: string): ReferenceLibraryEntry | undefined {
  return REFERENCE_LIBRARY.find((entry) => entry.id === id);
}

/** 특정 공개 데이터 파일이 어느 1차 자료에서 나왔는지 역추적 */
export function referencesForDataFile(fileName: string): ReferenceLibraryEntry[] {
  return REFERENCE_LIBRARY.filter((entry) => entry.derived.includes(fileName));
}
