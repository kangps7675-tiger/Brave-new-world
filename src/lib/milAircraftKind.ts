import type { MilitaryAircraft } from "@/data/geoTypes";

/** ADS-B 기종·카테고리 기반 역할 (탑다운 실루엣 매핑용) */
export type MilAircraftRole =
  | "fighter"
  | "bomber"
  | "helicopter"
  | "tanker"
  | "transport"
  | "awacs"
  | "recon"
  | "patrol"
  | "gunship"
  | "trainer"
  | "uav"
  | "other";

export type MilAircraftKindInfo = {
  role: MilAircraftRole;
  /** 짧은 역할 라벨 (KO) */
  labelKo: string;
  /** 짧은 역할 라벨 (EN) */
  labelEn: string;
};

const ROLE_LABEL: Record<MilAircraftRole, { ko: string; en: string }> = {
  fighter: { ko: "전투기", en: "Fighter" },
  bomber: { ko: "폭격기", en: "Bomber" },
  helicopter: { ko: "헬기", en: "Helicopter" },
  tanker: { ko: "급유기", en: "Tanker" },
  transport: { ko: "수송기", en: "Transport" },
  awacs: { ko: "조기경보기", en: "AWACS" },
  recon: { ko: "정찰기", en: "ISR" },
  patrol: { ko: "초계기", en: "Patrol" },
  gunship: { ko: "건쉽", en: "Gunship" },
  trainer: { ko: "훈련기", en: "Trainer" },
  uav: { ko: "무인기", en: "UAV" },
  other: { ko: "군용기", en: "Military" },
};

function normType(value: string | null | undefined): string {
  return (value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

/**
 * ICAO type designator / ADS-B category / callsign 휴리스틱으로 역할 분류.
 * 정확한 기종 DB가 없어도 지구본 실루엣이 갈라지도록 넓게 커버한다.
 */
export function classifyMilAircraft(aircraft: Pick<
  MilitaryAircraft,
  "type" | "category" | "callsign" | "registration"
>): MilAircraftKindInfo {
  const t = normType(aircraft.type);
  const cat = (aircraft.category || "").toUpperCase();
  const call = `${aircraft.callsign || ""} ${aircraft.registration || ""}`.toUpperCase();

  // ADS-B emitter category (A7 rotorcraft 등)
  if (cat.includes("A7") || /\bROTOR|\bHELI/.test(cat)) {
    return pack("helicopter");
  }
  if (/\bUAV|\bUAS|\bRPA|\bDRONE/.test(cat) || /\bUAV|\bRPA/.test(call)) {
    return pack("uav");
  }

  // --- Helicopters ---
  if (
    /^(AH|UH|MH|CH|HH|SH|EH|TH|OH|NH|EC|AS|SA|MI|KA|Z[0-9]|H[0-9]|S70|S92)/.test(t) ||
    /^(AH64|UH60|MH60|CH47|CH53|HH60|SH60|MI8|MI17|MI24|MI28|MI35|KA50|KA52|EC725|NH90|H225|H145|H60)/.test(
      t,
    ) ||
    /\bHELI|\bHELIO|\bROTOR/.test(call)
  ) {
    return pack("helicopter");
  }

  // --- Tankers ---
  if (
    /^(KC|K35|A330MRT|MRTT|IL78|A3XX)/.test(t) ||
    /^(KC10|KC135|KC46|KC767|A330|IL78)/.test(t) ||
    /\bTANKER|\bREFUEL/.test(call)
  ) {
    return pack("tanker");
  }

  // --- AWACS / AEW ---
  if (
    /^(E3|E7|E2|E2C|E2D|E3A|E3B|E3C|E3D|E3F|A50|KJ200|KJ500|B737AEW|E767)/.test(t) ||
    /\bAWACS|\bAEW|\bAEW&C|\bGCI/.test(call)
  ) {
    return pack("awacs");
  }

  // --- Bombers ---
  if (
    /^(B1|B1B|B2|B21|B52|TU16|TU22|TU95|TU160|H6|H6K|XB70)/.test(t) ||
    /\bBOMBER/.test(call)
  ) {
    return pack("bomber");
  }

  // --- Gunship ---
  if (/^(AC130|AC47|CN235G)/.test(t) || /\bGUNSHIP/.test(call)) {
    return pack("gunship");
  }

  // --- Maritime patrol ---
  if (
    /^(P3|P8|P1|CP140|ATL|ATL2|C295MPA|P3C|P8A)/.test(t) ||
    /\bPATROL|\bMPA|\bASW/.test(call)
  ) {
    return pack("patrol");
  }

  // --- Recon / ISR ---
  if (
    /^(U2|RQ|MQ|RC135|EP3|SR71|TR1|E8|E6|WC135|OC135|RC12|MC12|ARTEMIS)/.test(t) ||
    /^(RQ4|RQ7|RQ9|MQ1|MQ4|MQ9|MQ9R)/.test(t) ||
    /\bRECON|\bISR|\bRIVET|\bJSTARS/.test(call)
  ) {
    // drones often MQ/RQ
    if (/^(RQ|MQ)/.test(t)) return pack("uav");
    return pack("recon");
  }

  // --- Transport / airlift ---
  if (
    /^(C5|C17|C130|C27|C2|C12|C21|C37|C40|C45|A400|IL76|AN12|AN26|AN32|AN72|AN124|AN225|Y20|Y8|Y9|CN235|C295)/.test(
      t,
    ) ||
    /^(C5M|C17A|C130J|C130H|A400M)/.test(t) ||
    /\bAIRLIFT|\bCARGO|\bTRANSPORT/.test(call)
  ) {
    return pack("transport");
  }

  // --- Trainer ---
  if (
    /^(T6|T38|T45|T7|T1|L39|L159|HAWK|MB339|PC21|PC9|SF260|YAK130|M346|KT1|T50|FA50)/.test(t) ||
    /\bTRAINER/.test(call)
  ) {
    return pack("trainer");
  }

  // --- Fighters / attack ---
  if (
    /^(F1[456789]|F2[02]|F3[5]|F4|F5|F14|F15|F16|F18|F22|F35|FA18|A10|A4|A6|A7|SU[0-9]|MIG|J[0-9]|JF17|RAFALE|EF200|TYPHOON|GRIPEN|TORNADO|HARRIER|AV8|M2000|MIRAGE|TEJAS|K2|FA50)/.test(
      t,
    ) ||
    /^(F15|F16|F18|F22|F35|FA18|A10|SU27|SU30|SU34|SU35|SU57|MIG21|MIG29|MIG31|J10|J11|J16|J20|J31)/.test(
      t,
    ) ||
    /\bFIGHTER|\bVIPER|\bRAPTOR|\bEAGLE|\bHORNET|\bLIGHTNING/.test(call)
  ) {
    return pack("fighter");
  }

  // Generic jet category A1/A2 often airliners used as mil transport
  if (cat.startsWith("A1") || cat.startsWith("A2")) {
    return pack("transport");
  }
  if (cat.startsWith("A5") || cat.startsWith("A6")) {
    return pack("fighter");
  }

  return pack("other");
}

function pack(role: MilAircraftRole): MilAircraftKindInfo {
  const labels = ROLE_LABEL[role];
  return {
    role,
    labelKo: labels.ko,
    labelEn: labels.en,
  };
}

/**
 * 민간 기체 아이콘 역할 — 헬기(A7)·경항공기(A1)만 따로, 나머지는 여객기 실루엣.
 * classifyMilAircraft는 군용 휴리스틱이라 민항기에 쓰면 엉뚱한 역할이 나온다.
 */
export function civilAircraftIconRole(
  aircraft: Pick<MilitaryAircraft, "category" | "type">,
): MilAircraftRole {
  const cat = (aircraft.category || "").toUpperCase();
  if (cat.includes("A7")) return "helicopter";
  if (cat.includes("A1")) return "trainer";
  return "transport";
}

export function milAircraftRoleLabel(
  kind: MilAircraftKindInfo,
  lang: "ko" | "en" = "ko",
): string {
  return lang === "en" ? kind.labelEn : kind.labelKo;
}
