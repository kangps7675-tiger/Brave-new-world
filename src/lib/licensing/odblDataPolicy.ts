/**
 * 멋진 신세계 — 데이터·레이어 라이선스 정책
 *
 * 세 가지 부류로 나눈다.
 *
 * 1. **자체 제작 판단·기록물** (확전 신호, 사건 파일의 근거·판정, 일별 이력,
 *    직접 큐레이션한 레이어) → `proprietary`.
 *    이용 허락 없이 복제·재배포·대량 수집할 수 없다. 이 서비스의 핵심 자산.
 * 2. **상속 의무가 있는 것** (OpenStreetMap·VIINA 등 ODbL 원본에서 파생한 DB)
 *    → `ODbL-1.0`. 원본의 조건(출처 표시·Share-Alike)을 그대로 따른다.
 *    파생 DB를 통째로 내보내지 않고 "화면 렌더(제작물)"로만 쓰는 정책을 유지한다
 *    (`viinaRenderGate`). 이 부류는 독점으로 선언할 수 없다.
 * 3. **외부 원본** (ACLED·MarineTraffic·FIRMS·언론사 RSS 등) → 원 라이선스 유지.
 *    `upstream` 또는 실제 ID. 우리가 라이선스를 줄 수 없는 것을 줄 수 있다고
 *    적지 않는다.
 *
 * commercialUse(유료 게이트)와 dataLicense(데이터셋 라이선스)는 별개 축이다.
 *
 * ⚠️ 독점 선언·ODbL 렌더 전용 해석의 법적 효력은 변호사 확인 대기 중이다.
 *
 * @see docs/commercial-licensing.md
 * @see DATA_LICENSE.md
 * @see https://opendatacommons.org/licenses/odbl/1-0/
 */

export const ODBL_LICENSE_ID = "ODbL-1.0" as const;
export const PROPRIETARY_LICENSE_ID = "proprietary" as const;

export const ODBL_POLICY = {
  licenseUrl: "https://opendatacommons.org/licenses/odbl/1-0/",
  /** ODbL은 **상속 의무가 있는 원본에서 파생된 경우에만** 쓴다. 기본값이 아니다. */
  onlyWhenInherited: true,
} as const;

export const DATA_LICENSE_POLICY = {
  /** 직접 만든 판단·기록물의 기본 라이선스 */
  defaultForOwnWork: PROPRIETARY_LICENSE_ID,
  /** 업스트림이 다른 라이선스면 catalog.dataLicense 에 그 값을 명시한다. */
  upstreamMustDeclareExplicitly: true,
} as const;

export type DataLicenseId =
  | typeof ODBL_LICENSE_ID
  | typeof PROPRIETARY_LICENSE_ID
  | "CC-BY-4.0"
  | "CC0-1.0"
  | "MIT"
  | "OGL"
  | "KOGL"
  | "public-domain"
  | "upstream"
  | "unknown";

/** 출처·방법론 패널 — 자체 제작물 고지 */
export const OWN_WORK_NOTICE_EN =
  "Judgments and records produced by Brave New World (escalation signals, case-file evidence and verdicts, daily history, curated layers) are not licensed for copying, redistribution, or bulk collection without permission. Upstream sources keep their own licenses — see the Sources panel.";

export const OWN_WORK_NOTICE_KO =
  "이 서비스가 직접 만든 판단과 기록(확전 신호, 사건 파일의 근거·판정, 일별 이력, 직접 큐레이션한 레이어)은 허락 없이 복제·재배포·대량 수집할 수 없습니다. 외부 원본 자료는 각자의 라이선스를 따르며 출처 패널에 따로 표기합니다.";

/** 출처·방법론 패널 — ODbL 상속분 고지 */
export const INHERITED_ODBL_NOTICE_EN =
  "Some map data (e.g. OpenStreetMap-derived layers, VIINA) is used under the Open Database License (ODbL). Those layers keep ODbL terms and are shown as rendered maps only.";

export const INHERITED_ODBL_NOTICE_KO =
  "일부 지도 데이터(OpenStreetMap 기반 레이어, VIINA 등)는 Open Database License(ODbL)에 따라 사용합니다. 해당 레이어는 원 조건을 그대로 따르며 화면 렌더링으로만 제공합니다.";

/** attribution 문구에 ODbL이 이미 있으면 true */
export function attributionMentionsOdbl(attribution: string | undefined): boolean {
  if (!attribution) return false;
  return /odbl|open database license/i.test(attribution);
}

/** 자체 제작 판단·기록물(독점)인가 */
export function isOwnWorkLicense(license: string | undefined): boolean {
  return license === PROPRIETARY_LICENSE_ID;
}

type LicenseNote = {
  dataLicense?: DataLicenseId | string;
  commercialUse: "allowed" | "license-required" | "prohibited" | "unknown";
  attribution?: string;
};

/**
 * 레이어 한 줄의 데이터 라이선스 해석.
 * - 명시된 dataLicense 우선
 * - attribution 에 ODbL이 있으면 ODbL-1.0 (상속분)
 * - 그 외는 upstream / unknown — **자체 제작물을 추정으로 독점 처리하지 않는다.**
 *   (자체 제작물은 카탈로그에 `proprietary` 를 명시해야 한다)
 */
export function resolveLayerDataLicense(note: LicenseNote): DataLicenseId | string {
  if (note.dataLicense) return note.dataLicense;
  if (attributionMentionsOdbl(note.attribution)) return ODBL_LICENSE_ID;
  if (note.commercialUse === "unknown") return "unknown";
  if (
    note.commercialUse === "license-required" ||
    note.commercialUse === "prohibited"
  ) {
    return "upstream";
  }
  return "unknown";
}

/** 새 자체 제작 판단·기록 레이어 추가 시 카탈로그에 넣을 기본값 */
export const NEW_PROJECT_LAYER_DATA_LICENSE = PROPRIETARY_LICENSE_ID;
