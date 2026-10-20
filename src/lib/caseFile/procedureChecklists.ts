/**
 * 사건 종류별 확인 절차 — 「무엇을 어떤 순서로 볼지」.
 * brave.html: 바다 사고·공습 등 종류마다 확인 순서가 다르다.
 */

import { evidenceSourceKind, type EvidenceSourceKind } from "@/lib/caseFile/sourceKind";
import {
  CORE_CLAIM_KINDS,
  type CaseEventType,
  type CaseFile,
  type ClaimKind,
  type EvidenceRole,
} from "@/lib/caseFile/types";

export type SensorAttachMode =
  | "firms"
  | "air-raid"
  | "ais"
  | "adsb"
  | "satellite-auto"
  | "control-zone"
  | "facility";

export type FindStep = {
  mode: SensorAttachMode;
  kinds: EvidenceSourceKind[];
  role: EvidenceRole;
  ko: string;
  en: string;
};

/** 기본(전 유형 공통) — 이전 FIND_ALL_STEPS와 동일 순서 */
const STEPS_OTHER: FindStep[] = [
  {
    mode: "satellite-auto",
    kinds: ["satellite"],
    role: "supports",
    ko: "위성 전후",
    en: "Satellite",
  },
  {
    mode: "firms",
    kinds: ["firms"],
    role: "supports",
    ko: "화재(FIRMS)",
    en: "Fire (FIRMS)",
  },
  {
    mode: "air-raid",
    kinds: ["neptun", "tzeva-adom"],
    role: "supports",
    ko: "공습 경보",
    en: "Air raid",
  },
  {
    mode: "ais",
    kinds: ["ais"],
    role: "supports",
    ko: "선박(AIS)",
    en: "Ships (AIS)",
  },
  {
    mode: "adsb",
    kinds: ["adsb"],
    role: "supports",
    ko: "군용기(ADS-B)",
    en: "Military aircraft",
  },
  {
    mode: "control-zone",
    kinds: ["control-zone"],
    role: "context",
    ko: "통제 구역",
    en: "Control zone",
  },
  {
    mode: "facility",
    kinds: ["facility"],
    role: "context",
    ko: "주변 시설",
    en: "Facilities",
  },
];

/** 타격·공습·미사일·드론 — 공중·화재·위성 우선 */
const STEPS_STRIKE: FindStep[] = [
  STEPS_OTHER[0]!, // satellite
  STEPS_OTHER[1]!, // firms
  STEPS_OTHER[2]!, // air-raid
  STEPS_OTHER[4]!, // adsb
  STEPS_OTHER[5]!, // control
  STEPS_OTHER[6]!, // facility
  STEPS_OTHER[3]!, // ais last (less central)
];

/** 해상 — AIS·위성·화재 우선, 공습·군용기는 뒤로 */
const STEPS_MARITIME: FindStep[] = [
  STEPS_OTHER[3]!, // ais
  STEPS_OTHER[0]!, // satellite
  STEPS_OTHER[1]!, // firms
  STEPS_OTHER[6]!, // facility
  STEPS_OTHER[5]!, // control
  STEPS_OTHER[4]!, // adsb
  STEPS_OTHER[2]!, // air-raid last
];

export function findStepsForEventType(eventType: CaseEventType): FindStep[] {
  if (eventType === "maritime") return STEPS_MARITIME;
  if (eventType === "strike") return STEPS_STRIKE;
  return STEPS_OTHER;
}

export type ProcedureCheckItem = {
  id: string;
  ko: string;
  en: string;
  /** 이 항목이 끝나면 ☑ — sensor kinds 또는 'anchor' */
  doneWhen: "anchor" | "map-support" | SensorAttachMode;
};

/** 데스크에 보여 줄 짧은 절차 (종류별) */
export function procedureChecklistFor(
  eventType: CaseEventType,
): ProcedureCheckItem[] {
  const commonStart: ProcedureCheckItem[] = [
    {
      id: "anchor",
      ko: "사건 위치·시각(앵커) 확정",
      en: "Lock incident place & time",
      doneWhen: "anchor",
    },
  ];
  if (eventType === "maritime") {
    return [
      ...commonStart,
      {
        id: "ais",
        ko: "그 시각 선박(AIS) 항적",
        en: "Ship tracks (AIS) at that time",
        doneWhen: "ais",
      },
      {
        id: "sat",
        ko: "위성 전후 영상",
        en: "Satellite before/after",
        doneWhen: "satellite-auto",
      },
      {
        id: "firms",
        ko: "화재점(있으면)",
        en: "Fire hotspots if any",
        doneWhen: "firms",
      },
      {
        id: "gap",
        ko: "못 찾은 센서는 「없음」으로 남기기",
        en: "Leave misses marked as none",
        doneWhen: "map-support",
      },
    ];
  }
  if (eventType === "strike") {
    return [
      ...commonStart,
      {
        id: "sat",
        ko: "위성 전후(구름·해상도 한계 명시)",
        en: "Satellite before/after (note limits)",
        doneWhen: "satellite-auto",
      },
      {
        id: "firms",
        ko: "화재(FIRMS)와 시각·거리 맞추기",
        en: "FIRMS fire vs time/distance",
        doneWhen: "firms",
      },
      {
        id: "air",
        ko: "공습 경보·NEPTUN(해당 시)",
        en: "Air-raid / NEPTUN if relevant",
        doneWhen: "air-raid",
      },
      {
        id: "adsb",
        ko: "군용기 항적(해당 시)",
        en: "Military tracks if relevant",
        doneWhen: "adsb",
      },
      {
        id: "gap",
        ko: "확인 못 한 주장은 「확인 못함」으로",
        en: "Unproven claims stay unconfirmed",
        doneWhen: "map-support",
      },
    ];
  }
  return [
    ...commonStart,
    {
      id: "find",
      ko: "한 번에 찾기로 센서 훑기",
      en: "Run Find-all sensors",
      doneWhen: "map-support",
    },
    {
      id: "gap",
      ko: "없는 근거는 숨기지 않기",
      en: "Do not hide missing evidence",
      doneWhen: "map-support",
    },
  ];
}

export function eventTypeLabel(
  eventType: CaseEventType,
  lang: "ko" | "en",
): string {
  if (lang === "en") {
    if (eventType === "maritime") return "Maritime";
    if (eventType === "strike") return "Strike / air";
    return "Other";
  }
  if (eventType === "maritime") return "해상";
  if (eventType === "strike") return "타격·공습";
  return "기타";
}

const MODE_KINDS: Record<SensorAttachMode, EvidenceSourceKind[]> = {
  firms: ["firms"],
  "air-raid": ["neptun", "tzeva-adom"],
  ais: ["ais"],
  adsb: ["adsb"],
  "satellite-auto": ["satellite"],
  "control-zone": ["control-zone"],
  facility: ["facility"],
};

function caseHasSensorKind(caseFile: CaseFile, mode: SensorAttachMode): boolean {
  const want = new Set(MODE_KINDS[mode]);
  for (const c of caseFile.claims) {
    for (const e of c.evidence) {
      if (want.has(evidenceSourceKind(e.sourceKey))) return true;
    }
  }
  return false;
}

function caseHasMapSupport(caseFile: CaseFile): boolean {
  for (const c of caseFile.claims) {
    if (!(CORE_CLAIM_KINDS as readonly ClaimKind[]).includes(c.kind)) continue;
    if (!c.mapCheckable) continue;
    if (c.evidence.some((e) => e.role === "supports")) return true;
  }
  return false;
}

/** 절차 한 줄이 이 사건에서 끝났는지 */
export function isProcedureItemDone(
  caseFile: CaseFile,
  item: ProcedureCheckItem,
): boolean {
  if (item.doneWhen === "anchor") {
    return Boolean(caseFile.incident?.place && caseFile.incident.occurredAt);
  }
  if (item.doneWhen === "map-support") {
    return caseHasMapSupport(caseFile);
  }
  return caseHasSensorKind(caseFile, item.doneWhen);
}
