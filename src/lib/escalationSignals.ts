/**
 * 확전 신호 (Escalation Signals) — 「작아 보이는데 임계선을 넘는다」 탐지.
 *
 * ══════════════════════════════════════════════════════════════════════
 *  근거는 `escalationTheory.ts` 에 있다. 가중치를 바꾸려면 거기부터.
 * ══════════════════════════════════════════════════════════════════════
 *
 * 핵심 명제 (RAND 정의):
 *   확전 = 규모가 커지는 것이 아니라 **임계선을 넘는 것**.
 *
 *   도네츠크 대규모 포격  → 임계선 안. 신호 아님.
 *   루마니아 영공 드론 1대 → 비교전국 주권 침범. 신호.
 *
 * 그래서 이 모듈은 **사건 크기를 재지 않는다.** 어떤 종류의 선을 넘었는지만 본다.
 *
 * ══════════════════════════════════════════════════════════════════════
 *  절대 하지 않는 것
 * ══════════════════════════════════════════════════════════════════════
 *   ✗ 「확전이다」 「전쟁 임박」          → 단정 금지
 *   ✗ 「NATO 5조 발동될 것」             → 예측 금지
 *   ✗ 확률·가능성 수치                   → 근거 없음
 *   ✗ 의도(고의·사고) 분류               → 보도로 알 수 없음
 *   ✗ LLM 에 "이거 위기냐" 묻기          → 환각·비용·지연
 *
 *   ✓ 「공개 보도에 이 임계선 유형이 언급됐다」
 *   ✓ 「그 판정은 이 항목들에서 이 점수가 나왔다」  → 근거 전면 공개
 */

import type { NewsTheater } from "@/lib/news/types";
import {
  FLANK_LABEL,
  findPerimeterStates,
  type FlankId,
  type PerimeterState,
} from "@/data/perimeterStates";
import {
  CONTAGION_LABEL,
  CONTAGION_WEIGHT,
  type ContagionVector,
  type EscalationDimension,
  ESCALATION_METHOD_NOTE_EN,
  ESCALATION_METHOD_NOTE_KO,
  THRESHOLD_LABEL,
  THRESHOLD_WEIGHT,
  type ThresholdKind,
} from "@/lib/escalationTheory";

// ─────────────────────────────────────────────────────────────────────
//  타입
// ─────────────────────────────────────────────────────────────────────

export type EscalationPattern =
  /** 전장 밖 경계국 영토에서 관측 — 수평 확전 */
  | "perimeter-spillover"
  /** 서로 다른 전장의 행위자가 한 사건에 — 수평 확전 */
  | "cross-theater"
  /** 안 쓰던 무기 종류 — 수직 확전 (능력 확대) */
  | "capability-threshold"
  /** 특별 보호 대상 시설 피격 — 수직 확전 (표적 종류 확대) */
  | "protected-target"
  /** 핵 지휘통제·조기경보 자산 — 비의도적 핵 확전 경로 (Acton) */
  | "c3i-entanglement"
  /** 외교공관 피격 — 빈 협약 불가침 위반 보도 */
  | "diplomatic-breach"
  /** 지도부 표적 타격 — 수직 (표적 종류 확대) */
  | "leadership-strike"
  /** 물리적 교전 없는 확전 신호 — 사이버·해저·핵신호·우주·봉쇄 */
  | "sub-kinetic"
  /** 경계국 당국의 공식 경보 발령 보도 */
  | "alliance-alert";

export type EscalationFactor = {
  code: string;
  points: number;
  labelKo: string;
  labelEn: string;
  /** 이 점수를 준 근거 — 실제 매칭된 문자열 */
  evidence?: string;
  /** 문헌 근거 한 줄 (있으면) */
  basisKo?: string;
};

export type EscalationSignal = {
  pattern: EscalationPattern;
  /** Morgan et al. 차원 축 */
  dimension: EscalationDimension;
  score: number;
  /** 점수 분해 — 전부 공개 */
  factors: EscalationFactor[];
  /** 넘은 것으로 **보도된** 임계선 종류 */
  thresholds: ThresholdKind[];
  /** 언급된 전이 경로 */
  contagion: ContagionVector[];
  theaters: NewsTheater[];
  perimeter: PerimeterState[];
  flanks: FlankId[];
  /**
   * 보도가 "표류·오폭" 등 사고성 표현을 썼는가.
   * ⚠️ 의도 판정이 **아니다.** 보도 표현의 인용일 뿐이다.
   */
  reportedAsStray: boolean;
  headlineKo: string;
  headlineEn: string;
};

// ─────────────────────────────────────────────────────────────────────
//  행위자 → 전장 귀속
// ─────────────────────────────────────────────────────────────────────

type TheaterActor = {
  id: string;
  theater: NewsTheater;
  labelKo: string;
  labelEn: string;
  re: RegExp;
};

const THEATER_ACTORS: TheaterActor[] = [
  { id: "russia", theater: "russia-ukraine", labelKo: "러시아", labelEn: "Russia",
    re: /\brussia\b|\brussian\b|\bkremlin\b|\bmoscow\b|러시아|크렘린|모스크바/i },
  { id: "ukraine", theater: "russia-ukraine", labelKo: "우크라이나", labelEn: "Ukraine",
    re: /\bukrain\w*\b|\bkyiv\b|\bkiev\b|우크라이나|키이우/i },
  { id: "belarus", theater: "russia-ukraine", labelKo: "벨라루스", labelEn: "Belarus",
    re: /\bbelarus\w*\b|\bminsk\b|벨라루스|민스크/i },
  { id: "iran", theater: "middle-east", labelKo: "이란", labelEn: "Iran",
    re: /\biran\b|\biranian\b|\btehran\b|\birgc\b|이란|테헤란|혁명수비대/i },
  { id: "israel", theater: "middle-east", labelKo: "이스라엘", labelEn: "Israel",
    re: /\bisrael\w*\b|\bidf\b|이스라엘/i },
  { id: "houthis", theater: "middle-east", labelKo: "후티", labelEn: "Houthis",
    re: /\bhouthi\w*\b|후티/i },
  { id: "hezbollah", theater: "middle-east", labelKo: "헤즈볼라", labelEn: "Hezbollah",
    re: /\bhezbollah\b|헤즈볼라/i },
  { id: "syria", theater: "middle-east", labelKo: "시리아", labelEn: "Syria",
    re: /\bsyria\w*\b|시리아/i },
  { id: "nk", theater: "korea", labelKo: "북한", labelEn: "North Korea",
    re: /\bnorth korea\w*\b|\bdprk\b|\bpyongyang\b|북한|평양|조선인민군/i },
  { id: "china", theater: "china-taiwan", labelKo: "중국", labelEn: "China",
    re: /\bchina\b|\bchinese\b|\bbeijing\b|\bpla\b|중국|베이징|인민해방군/i },
  { id: "taiwan", theater: "china-taiwan", labelKo: "대만", labelEn: "Taiwan",
    re: /\btaiwan\b|\btaipei\b|대만|타이완|타이베이/i },
];

// 미국·NATO 는 THEATER_ACTORS에 넣지 않는다 — 거의 모든 안보 기사에
// 등장해 교차 판정 오탐이 폭발한다. alliance-alert 패턴에서 따로 본다.

// ─────────────────────────────────────────────────────────────────────
//  임계선 탐지 — 전부 **관측 가능한 사실** 표현만
// ─────────────────────────────────────────────────────────────────────

/** 물리적 교전. 성명·규탄·우려는 제외. */
const KINETIC_RE =
  /\b(shot\s?down|shoot\s?down|downed|intercept(?:ed|s|ion)?|struck|strikes?\b|airstrike|missile\s?(?:strike|attack|launch)|drone\s?(?:attack|strike|incursion)|artillery|shell(?:ed|ing)|bombard|explosion|debris\s+(?:fell|landed)|crashed)\b|격추|요격|피격|타격|공습|포격|폭발|잔해|낙하/i;

/**
 * 주권 영역 침범 — 수평 확전의 교과서적 형태.
 *
 * ⚠️ 실제 헤드라인은 동사와 airspace 사이에 국적 형용사가 온다:
 *    "violated **Romanian** airspace" · "entered **Japanese** airspace"
 *    그래서 `(?:\w+\s+){0,2}` 로 사이 단어를 허용한다.
 *    이 여유가 없으면 대표 사건이 전부 탐지되지 않는다.
 */
const SOVEREIGN_VIOLATION_RE =
  /\b(?:(?:violat|enter|breach|cross|penetrat)\w*\s+(?:into\s+)?(?:\w+\s+){0,2}airspace|airspace\s+(?:was\s+)?(?:violat|breach)\w*|incursion\s+into|territorial\s+waters?\s+(?:violat|incurs)\w*)\b|영공\s?(?:침범|진입|침입)|영해\s?(?:침범|진입)|월경/i;

/**
 * 당국 발령 경보 — 공식 소스 인용이 전제.
 * "scrambled jets" 와 "jets were scrambled" 어순 양쪽을 받는다.
 */
const OFFICIAL_ALERT_RE =
  /\b(air\s?raid\s+(?:alert|siren|warning)|air\s?defen[cs]e\s+alert|scrambl\w*\s+(?:jets|fighters|aircraft)|(?:jets|fighters|aircraft)\s+(?:were\s+)?scrambl\w*|closed\s+(?:its\s+)?airspace|invok\w*\s+article\s+[45]|article\s+[45]\s+(?:consultation|request)|state\s+of\s+emergency)\b|공습\s?경보|대공\s?경보|전투기\s?긴급\s?발진|스크램블|영공\s?폐쇄|4조\s?협의|5조\s?발동/i;

/** 원자력 시설 — 제네바협약 1추가의정서 56조 대상 */
const NUCLEAR_SITE_RE =
  /\b(nuclear\s+(?:power\s+)?plant|npp|zaporizhzhia|enrichment\s+(?:facility|site)|fordow|natanz|reactor|iaea)\b|원전|원자력\s?발전소|농축\s?시설|자포리자|포르도|나탄즈/i;

/** 수직 확전 — 안 쓰던 무기 종류의 첫 사용 */
const NEW_CAPABILITY_RE =
  /\b(first\s+(?:use|time|reported\s+use)\s+of|for\s+the\s+first\s+time|newly\s+deployed|previously\s+unused|debut\w*\s+(?:in\s+combat|on\s+the\s+battlefield)|intermediate[\s-]range|icbm|hypersonic|cluster\s+munition|thermobaric)\b|처음\s?사용|최초\s?사용|첫\s?실전|신형\s?배치|중거리\s?탄도|극초음속|집속탄/i;

// ── 2차 문헌 검토 추가분 ────────────────────────────────────────────
//
// ⚠️ 아래 임계선 중 상당수는 **키네틱 동사가 아예 없다.**
//    "케이블이 끊겼다" · "핵 연습을 실시했다" · "랜섬웨어가 전력망을 멈췄다"
//    초기 구현은 키네틱/영공/경보 셋 중 하나를 요구해서 이걸 전부 놓쳤다.

/**
 * 핵 지휘통제·조기경보 자산.
 * 문헌상 가장 위험한 단일 경로 (Acton 2018 entanglement).
 * 재래식 표적처럼 보이지만 핵 태세의 눈이다.
 */
const C3I_ASSET_RE =
  /\b(early[\s-]?warning\s+(?:radar|satellite|system|site)|ballistic\s+missile\s+early\s+warning|nuclear\s+command\s+(?:and\s+)?control|c3i|c2\s+node|voronezh\s+radar|dnepr\s+radar|missile\s+attack\s+warning|strategic\s+radar)\b|조기\s?경보\s?(?:레이더|위성|시설)|핵\s?지휘\s?통제|미사일\s?경보\s?체계/i;

/**
 * 외교공관 — 빈 협약상 불가침.
 * 다마스쿠스 이란 영사관(2024-04-01)이 이란–이스라엘 직접 교전을 촉발했다.
 */
// ⚠️ 실제 헤드라인: "destroyed the Iranian consulate **building** in Damascus"
//    명사구가 끼고 동사가 앞뒤 양쪽에 온다. 초기 정규식은 이걸 놓쳐
//    다마스쿠스 사건(이란–이스라엘 직접 교전의 방아쇠)을 0점 처리했다.
const DIPLOMATIC_PREMISES_RE =
  /\b(?:(?:embassy|consulate|consular\s+(?:section|building)|diplomatic\s+(?:mission|premises|compound))(?:\s+\w+){0,3}\s+(?:was\s+)?(?:struck|hit|bombed|attacked|targeted|destroyed|levell?ed)|(?:struck|hit|bombed|attacked|targeted|destroyed|levell?ed)\s+(?:the\s+)?(?:\w+\s+){0,3}(?:embassy|consulate|consular\s+(?:section|building)|diplomatic\s+mission))\b|(?:대사관|영사관|공관)\s?(?:피격|폭격|공격|타격|파괴)/i;

/**
 * 핵 신호 — 물리적 교전 없이도 확전 사다리를 올린다.
 *
 * ⚠️ "rhetoric" · "threat" 은 **일부러 뺐다.** 논평 기사에 흔히 나와
 *    ("nuclear rhetoric has intensified") 오탐의 주범이 된다.
 *    구체적으로 관측 가능한 것만 남긴다 — 연습·교리·태세·이동·경계태세.
 */
const NUCLEAR_SIGNALING_RE =
  /\b(nuclear\s+(?:drill|exercise|doctrine|posture|alert|readiness)|tactical\s+nuclear\s+(?:weapon|warhead)s?\s+(?:deployed|moved|transferred)|raised\s+(?:its\s+)?nuclear\s+alert|lowered\s+the\s+(?:nuclear\s+)?threshold|suspend\w*\s+(?:new\s+)?start|withdrew?\s+from\s+(?:the\s+)?(?:npt|ctbt)|resume\w*\s+nuclear\s+test)\b|핵\s?(?:훈련|연습|교리|태세)|전술핵\s?(?:배치|이동)|핵실험\s?재개/i;

/**
 * 핵심 인프라 사이버.
 * NATO 2022 전략개념 — 개별·누적 사이버가 5조 임계에 도달 가능.
 */
const CYBER_CRITICAL_RE =
  /\b(cyber\s?attack\w*\s+(?:on|against|targeting)\s+(?:\w+\s+){0,3}(?:grid|power|energy|water|hospital|port|railway|telecom|pipeline|bank)|ransomware\s+(?:shut|halted|disabled|crippled)|hack\w*\s+(?:the\s+)?(?:power\s+grid|water\s+system|air\s+traffic)|took\s+down\s+(?:the\s+)?(?:power\s+grid|electricity))\b|사이버\s?공격.{0,12}(?:전력망|발전소|상수도|병원|항만|철도|통신)|랜섬웨어.{0,10}(?:마비|중단)/i;

/**
 * 해저 인프라 손상.
 * ⚠️ 귀속이 구조적으로 어렵다 — 사고와 사보타주가 섞인다.
 *    그래서 "손상 보도가 있었다"까지만 기록한다.
 */
// ⚠️ "Undersea cable **between Finland and Estonia** was severed" —
//    주어와 동사 사이에 수식구가 길게 온다. 영공 정규식과 같은 종류의 버그였다.
const UNDERSEA_INFRA_RE =
  /\b(?:(?:undersea|subsea|submarine)\s+(?:cable|pipeline)(?:\s+\w+){0,6}\s+(?:was\s+)?(?:cut|damaged|severed|broken|ruptured)|(?:cut|damaged|severed|ruptured)\s+(?:an?\s+|the\s+)?(?:undersea|subsea|submarine)\s+(?:cable|pipeline)|nord\s?stream|balticconnector|anchor\s+dragg\w+|seabed\s+sabotage|cable\s+(?:cut|damage)\s+in\s+the\s+baltic)\b|해저\s?(?:케이블|가스관|파이프라인).{0,12}(?:절단|손상|파손)|노르트\s?스트림|닻\s?끌기/i;

/** 대위성·우주 자산 간섭 */
const COUNTERSPACE_RE =
  /\b(anti[\s-]?satellite|asat\b|destroyed\s+(?:a\s+)?satellite|satellite\s+(?:was\s+)?(?:jammed|blinded|dazzled|disabled|hacked)|gps\s+(?:jamming|spoofing|interference)|gnss\s+(?:jamming|spoofing)|co[\s-]?orbital\s+(?:weapon|interceptor)|nudol)\b|위성\s?(?:요격|공격|교란)|대위성\s?무기|gps\s?(?:재밍|교란|스푸핑)/i;

/** 지도부 표적 타격 — 보복의 순환 */
const LEADERSHIP_TARGETING_RE =
  /\b((?:assassinat|kill|target)\w*\s+(?:the\s+)?(?:\w+\s+){0,3}(?:commander|general|chief\s+of\s+staff|defence\s+minister|defense\s+minister|president|supreme\s+leader|head\s+of\s+state)|decapitation\s+strike|targeted\s+killing\s+of)\b|(?:사령관|참모총장|국방장관|최고\s?지도자|수반)\s?(?:암살|제거|피살|사살)|참수\s?작전|표적\s?살해/i;

/**
 * 봉쇄 선언 — 국제법상 **교전 행위(act of war)**.
 * 선언·실효성·공평성 요건이 따르고 평시 봉쇄는 원칙적으로 위법이다.
 */
const BLOCKADE_DECLARED_RE =
  /\b(declared?\s+(?:a\s+)?(?:naval\s+)?blockade|imposed?\s+(?:a\s+)?blockade|blockad\w+\s+(?:the\s+)?(?:port|strait|coast)|quarantine\s+of\s+(?:the\s+)?(?:coast|island)|close[sd]?\s+the\s+strait)\b|(?:해상\s?)?봉쇄\s?(?:선언|조치)|해협\s?폐쇄/i;

/**
 * 임검·나포 — 봉쇄와 **법적 제도가 다르다.** 문헌도 둘을 구분한다.
 * 걸프 유조선 나포는 상시적이라 단독으로는 노출되지 않도록 낮게 잡는다.
 */
const MARITIME_INTERDICTION_RE =
  /\b(seiz\w+\s+(?:a\s+|the\s+)?(?:tanker|vessel|ship)|board\w+\s+(?:a\s+|the\s+)?(?:tanker|vessel)|impound\w*\s+(?:a\s+|the\s+)?(?:tanker|vessel|ship))\b|유조선\s?나포|선박\s?(?:나포|억류)/i;

/** 제3국 국적 자산 — UNCLOS 기국 관할 */
const THIRD_PARTY_ASSET_RE =
  /\b((?:panama|liberia|marshall\s+islands|greek|cyprus|malta)[\s-]?flagged|foreign[\s-]?flagged|civilian\s+(?:airliner|vessel|cargo\s+ship)|merchant\s+(?:vessel|ship)|commercial\s+tanker)\b|외국\s?국적\s?선박|민간\s?여객기|상선|외국\s?선적/i;

// ── 전이 경로 (Forsberg / Salehyan & Gleditsch) ──────────────────────

const ARMS_TRANSFER_RE =
  /\b(shahed|geran|garpiya|kn-2[35]|iranian[\s-]?made|north\s?korean[\s-]?(?:shell|missile|munition)|arms\s+(?:transfer|shipment|delivery)|weapons?\s+(?:transfer|supplied)|missile\s+transfer)\b|샤헤드|게란|이란제|북한제|무기\s?(?:이전|공급|지원)/i;

const COMBATANT_MOVEMENT_RE =
  /\b(troops?\s+(?:deployed|sent|dispatched)\s+to|foreign\s+fighters?|mercenar\w+|military\s+advisers?\s+(?:sent|deployed)|north\s?korean\s+troops?)\b|파병|용병|외국인\s?전투원|군사\s?고문단|북한군\s?파병/i;

const REFUGEE_FLOW_RE =
  /\b(refugees?\s+(?:fled|crossed|flow)|displaced\s+persons?\s+crossed|mass\s+(?:exodus|displacement)|border\s+crossing\s+surge)\b|난민\s?(?:유입|월경|행렬)|피란민|대규모\s?이재민/i;

// ── 제외·감점 ─────────────────────────────────────────────────────────

const SOFT_EXCLUDE_RE =
  /\b(celebrity|sport|football|soccer|nba|oscar|grammy|fashion|recipe|op[\s-]?ed|opinion|editorial|anniversary|documentary|movie|drama|obituary)\b|연예|스포츠|축구|야구|영화|드라마|칼럼|사설|오피니언|다큐|부고/i;

/**
 * 가정·전망 표현 — 감점.
 * 「~할 수도」「전문가는 ~라고 경고」는 사건이 아니라 논평이다.
 * 이걸 안 거르면 시스템이 남의 뇌피셜을 그대로 증폭한다.
 */
const SPECULATIVE_RE =
  /\b(could\s+(?:lead|trigger|spark)|might\s+(?:lead|escalate)|risk\s+of\s+\w+\s+war|fears?\s+(?:of|that)|warns?\s+(?:of|that)|analysts?\s+say|experts?\s+(?:say|warn)|scenario|what\s+if|potential(?:ly)?\s+escalat)\b|우려된다|가능성이\s?있다|전망이다|경고했다|분석가|전문가는|시나리오/i;

/**
 * 보도가 사고성으로 기술하는가.
 * ⚠️ 의도 판정이 아니다. 표현의 인용이다. 점수에 영향을 주지 않는다.
 */
const STRAY_FRAMING_RE =
  /\b(stray(?:ed)?|errant|off[\s-]course|accidental(?:ly)?|malfunction(?:ed)?|technical\s+(?:failure|fault)|lost\s+control)\b|표류|오폭|기술적\s?결함|오작동|경로\s?이탈/i;

// ─────────────────────────────────────────────────────────────────────
//  임계값
// ─────────────────────────────────────────────────────────────────────

/**
 * 노출 임계.
 *
 * 픽스처로 보정한 값이다 (`escalationSignals.test.ts`).
 * 이 값을 낮추면 전선 안 교전이 새어 들어오고, 높이면 자포리자 원전 피격이나
 * 중거리탄도 첫 사용 같은 **실제 수직 확전이 묻힌다.**
 * 바꾸려면 반드시 픽스처 전체를 다시 돌릴 것.
 */
export const ESCALATION_SHOW_THRESHOLD = 4;
/** 이 점수 이상이면 속보 타전·푸시 후보 */
export const ESCALATION_FLASH_THRESHOLD = 8;

// ─────────────────────────────────────────────────────────────────────
//  판정
// ─────────────────────────────────────────────────────────────────────

export type EscalationInput = {
  title: string;
  summary?: string;
  /** 기존 파이프라인이 붙인 전장 태그 */
  theater?: NewsTheater;
  /** 최근 N시간 내 활성 전장 — dailyRanks/GDELT 밀도에서. 없으면 가점 없음. */
  hotTheaters?: NewsTheater[];
};

function detect(re: RegExp, text: string): string | undefined {
  return re.exec(text)?.[0];
}

/**
 * 확전 신호 판정.
 * @returns 임계 미달이면 `null` — 조용한 게 기본값이다.
 */
export function scoreEscalation(input: EscalationInput): EscalationSignal | null {
  const text = `${input.title} ${input.summary ?? ""}`.trim();
  if (!text) return null;
  if (SOFT_EXCLUDE_RE.test(text)) return null;

  const factors: EscalationFactor[] = [];
  const thresholds: ThresholdKind[] = [];
  const contagion: ContagionVector[] = [];

  const add = (
    code: string,
    points: number,
    labelKo: string,
    labelEn: string,
    evidence?: string,
    basisKo?: string,
  ) => factors.push({ code, points, labelKo, labelEn, evidence, basisKo });

  const addThreshold = (kind: ThresholdKind, evidence?: string) => {
    if (thresholds.includes(kind)) return;
    thresholds.push(kind);
    const label = THRESHOLD_LABEL[kind];
    add(`threshold:${kind}`, THRESHOLD_WEIGHT[kind], label.ko, label.en, evidence, label.basisKo);
  };

  // ── 사건성 확인 ────────────────────────────────────────────────────
  const kinetic = detect(KINETIC_RE, text);
  const sovereign = detect(SOVEREIGN_VIOLATION_RE, text);
  const alert = detect(OFFICIAL_ALERT_RE, text);

  /**
   * ⚠️ 비(非)키네틱 임계선.
   *
   * 초기 구현은 키네틱/영공/경보 중 하나를 **필수**로 요구했다.
   * 그래서 아래 사건들이 전부 0점이었다:
   *   · 해저 케이블 절단 (교전 동사 없음)
   *   · 핵 교리 변경 성명 (물리적 사건 없음)
   *   · 랜섬웨어로 전력망 마비 (사이버)
   *   · GPS 재밍 (연성 킬)
   *   · 봉쇄 선언 (선언 자체가 교전 행위)
   *
   * 확전은 발사체로만 일어나지 않는다. 게이트를 넓힌다.
   */
  const cyber = detect(CYBER_CRITICAL_RE, text);
  const undersea = detect(UNDERSEA_INFRA_RE, text);
  const nuclearSignal = detect(NUCLEAR_SIGNALING_RE, text);
  const counterspace = detect(COUNTERSPACE_RE, text);
  const blockadeDeclared = detect(BLOCKADE_DECLARED_RE, text);
  const interdiction = detect(MARITIME_INTERDICTION_RE, text);
  const blockade = blockadeDeclared || interdiction;
  const diplomatic = detect(DIPLOMATIC_PREMISES_RE, text);
  const c3i = detect(C3I_ASSET_RE, text);
  const leadership = detect(LEADERSHIP_TARGETING_RE, text);

  const nonKinetic =
    cyber || undersea || nuclearSignal || counterspace || blockade || diplomatic;

  if (!kinetic && !sovereign && !alert && !nonKinetic) return null;

  if (kinetic) {
    add("kinetic", 1, "물리적 교전 보도", "Kinetic event reported", kinetic);
  }

  // ── 경계국 · 전장 ──────────────────────────────────────────────────
  const perimeterRaw = findPerimeterStates(text);
  // 대만처럼 **그 전장의 당사국**이면 같은 전장 기사에서 유출로 세지 않는다.
  // 일본은 china-taiwan 에 인접하지만 당사국이 아니므로 제3자로 남는다.
  const perimeter = perimeterRaw.filter((p) => p.principalIn !== input.theater);
  const flanks = [...new Set(perimeter.map((p) => p.flank))];

  const actors = THEATER_ACTORS.filter((a) => a.re.test(text));
  const theaters = [...new Set(actors.map((a) => a.theater))];

  // ── 임계선 판정 ────────────────────────────────────────────────────
  if (sovereign && perimeter.length > 0) {
    addThreshold("sovereign-territory", sovereign);
  }
  // ⚠️ nonKinetic 을 반드시 포함해야 한다. NATO 회원국 전력망을 겨눈
  //    사이버 공격이나 발트해 케이블 절단도 **조약 영토에서 벌어진 사건**이다.
  //    초기 구현은 키네틱만 봐서 이 조합을 통째로 놓쳤다.
  if (
    perimeter.some((p) => p.collectiveDefense !== "none") &&
    (sovereign || kinetic || alert || nonKinetic)
  ) {
    addThreshold(
      "treaty-territory",
      perimeter.find((p) => p.collectiveDefense !== "none")?.collectiveDefense,
    );
  }
  const nuclearSite = detect(NUCLEAR_SITE_RE, text);
  if (nuclearSite && kinetic) addThreshold("nuclear-infrastructure", nuclearSite);

  const newCap = detect(NEW_CAPABILITY_RE, text);
  if (newCap && kinetic) addThreshold("new-capability-class", newCap);

  const thirdParty = detect(THIRD_PARTY_ASSET_RE, text);
  if (thirdParty && kinetic) addThreshold("third-party-asset", thirdParty);

  // ── 2차 검토 추가 임계선 ──────────────────────────────────────────
  // 이 중 다수는 kinetic 을 요구하지 않는다 (위 주석 참조).
  if (c3i && kinetic) addThreshold("c3i-early-warning", c3i);
  if (diplomatic) addThreshold("diplomatic-premises", diplomatic);
  if (nuclearSignal) addThreshold("nuclear-signaling", nuclearSignal);
  if (cyber) addThreshold("cyber-critical-infrastructure", cyber);
  if (undersea) addThreshold("undersea-infrastructure", undersea);
  if (counterspace) addThreshold("counterspace", counterspace);
  if (leadership && kinetic) addThreshold("leadership-targeting", leadership);
  if (blockadeDeclared) addThreshold("blockade-declared", blockadeDeclared);
  if (interdiction) addThreshold("maritime-interdiction", interdiction);

  if (theaters.length >= 2) {
    addThreshold("theater-linkage", actors.map((a) => a.labelEn).join(" · "));
    // 단순 동시 언급과 **실제 교전**은 다르다.
    // 키네틱 동사가 함께 있으면 사건 자체가 전장을 가로지른 것이다.
    if (kinetic) {
      add(
        "cross-theater-engagement",
        2,
        "전장을 가로지른 교전 보도",
        "Kinetic engagement spanning theaters",
        kinetic,
      );
    }
  }

  // ── 전이 경로 ──────────────────────────────────────────────────────
  const addContagion = (v: ContagionVector, evidence?: string) => {
    if (contagion.includes(v)) return;
    contagion.push(v);
    const l = CONTAGION_LABEL[v];
    add(`contagion:${v}`, CONTAGION_WEIGHT[v], l.ko, l.en, evidence, "전이 문헌 (Forsberg 등)");
  };
  const arms = detect(ARMS_TRANSFER_RE, text);
  if (arms) addContagion("arms-transfer", arms);
  const combatants = detect(COMBATANT_MOVEMENT_RE, text);
  if (combatants) addContagion("combatant-movement", combatants);
  const refugees = detect(REFUGEE_FLOW_RE, text);
  if (refugees) addContagion("refugee-flow", refugees);

  // ── 공식 경보 ──────────────────────────────────────────────────────
  if (alert && perimeter.length > 0) {
    add(
      "official-alert",
      2,
      `경계국 당국 경보 (${perimeter.map((p) => p.nameKo).join("·")})`,
      `Official alert by ${perimeter.map((p) => p.nameEn).join(", ")}`,
      alert,
    );
  }

  // ── 패턴·차원 결정 ────────────────────────────────────────────────
  let pattern: EscalationPattern;
  let dimension: EscalationDimension;

  // 순서가 중요하다 — 위험도가 높은 임계선이 먼저 패턴을 가져간다.
  if (c3i && kinetic) {
    // 문헌상 가장 위험한 단일 경로. 다른 무엇보다 먼저 잡는다.
    pattern = "c3i-entanglement";
    dimension = "vertical";
  } else if (diplomatic) {
    pattern = "diplomatic-breach";
    dimension = "horizontal";
  } else if (perimeter.length > 0 && (sovereign || kinetic)) {
    pattern = "perimeter-spillover";
    dimension = "horizontal";
  } else if (theaters.length >= 2) {
    pattern = "cross-theater";
    dimension = "horizontal";
  } else if (newCap && kinetic) {
    pattern = "capability-threshold";
    dimension = "vertical";
  } else if (nuclearSite && kinetic) {
    // Morgan et al. 의 수직 확전 후단 — "expansion of the type of targets at risk"
    pattern = "protected-target";
    dimension = "vertical";
  } else if (perimeter.length > 0 && alert) {
    pattern = "alliance-alert";
    dimension = "horizontal";
  } else if (leadership && kinetic) {
    // 표적 종류의 확대 — 수직. 분기가 없어 점수를 받고도 버려지던 케이스였다.
    pattern = "leadership-strike";
    dimension = "vertical";
  } else if (nonKinetic) {
    // 사이버·해저·핵신호·우주·봉쇄 — 발사체 없이 사다리를 올리는 사건들
    pattern = "sub-kinetic";
    // 핵 신호는 강도 축(수직), 나머지는 범위·영역 확대(수평)
    dimension = nuclearSignal ? "vertical" : "horizontal";
  } else {
    // 전장 하나 안에서 벌어진 평범한 교전 — 임계선을 넘지 않았다.
    // 도네츠크 포격 수백 건이 여기서 탈락한다.
    return null;
  }

  // ── 보조 가점 ──────────────────────────────────────────────────────
  const hot = new Set(input.hotTheaters ?? []);
  const hotOverlap = theaters.filter((t) => hot.has(t));
  if (hotOverlap.length >= 2) {
    add("both-hot", 2, "관련 전장 2곳이 동시 활성", "Two related theaters both active", hotOverlap.join(","));
  }
  if (flanks.length > 0) {
    // 대칭 원칙 — 대서양·인도태평양 동일 가중치
    add("flank", 1, FLANK_LABEL[flanks[0]].ko, FLANK_LABEL[flanks[0]].en, flanks.join(","));
  }

  // ── 감점: 가정·논평 ───────────────────────────────────────────────
  const speculative = detect(SPECULATIVE_RE, text);
  if (speculative) {
    add("speculative", -4, "가정·전망 표현 (사건 아님)", "Speculative framing — not an event", speculative);
  }

  const score = factors.reduce((s, f) => s + f.points, 0);
  if (score < ESCALATION_SHOW_THRESHOLD) return null;

  return {
    pattern,
    dimension,
    score,
    factors,
    thresholds,
    contagion,
    theaters,
    perimeter,
    flanks,
    reportedAsStray: STRAY_FRAMING_RE.test(text),
    headlineKo: buildHeadline(pattern, actors, perimeter, "ko"),
    headlineEn: buildHeadline(pattern, actors, perimeter, "en"),
  };
}

/** 한 줄 요약 — 반드시 "(보도)" 로 끝난다. 확인한 게 아니라 보도됐을 뿐이다. */
function buildHeadline(
  pattern: EscalationPattern,
  actors: TheaterActor[],
  perimeter: PerimeterState[],
  lang: "ko" | "en",
): string {
  const ko = lang === "ko";
  const a = actors.map((x) => (ko ? x.labelKo : x.labelEn)).join(ko ? "·" : ", ");
  const s = perimeter.map((p) => (ko ? p.nameKo : p.nameEn)).join(ko ? "·" : ", ");
  switch (pattern) {
    case "perimeter-spillover":
      return ko
        ? `이웃 나라까지 번진 사건 · ${s} (보도)`
        : `Spillover into a neighbor · ${s} (reported)`;
    case "cross-theater":
      return ko
        ? `다른 전쟁 세력이 한 보도에 등장 · ${a} (보도)`
        : `Actors from separate wars in one report · ${a} (reported)`;
    case "capability-threshold":
      return ko
        ? `쓰이지 않던 무기 종류가 등장 · ${a} (보도)`
        : `Previously unused weapon type · ${a} (reported)`;
    case "protected-target":
      return ko
        ? `특별히 보호되는 시설이 피격됨 · ${a} (보도)`
        : `Specially protected site struck · ${a} (reported)`;
    case "c3i-entanglement":
      return ko
        ? `핵 경보·지휘 시설이 관련됨 · ${a} (보도)`
        : `Nuclear warning / command facility · ${a} (reported)`;
    case "diplomatic-breach":
      return ko
        ? `대사관·영사관이 피격됨 · ${a} (보도)`
        : `Embassy or consulate struck · ${a} (reported)`;
    case "leadership-strike":
      return ko
        ? `지도부·지휘관이 표적이 됨 · ${a} (보도)`
        : `Leader or commander targeted · ${a} (reported)`;
    case "sub-kinetic":
      return ko
        ? `총성 없이 긴장을 키운 사건 · ${a || s} (보도)`
        : `Tension rises without gunfire · ${a || s} (reported)`;
    case "alliance-alert":
      return ko
        ? `이웃·동맹국이 경보를 발령함 · ${s} (보도)`
        : `Neighbor or ally issued an alert · ${s} (reported)`;
  }
}

// ─────────────────────────────────────────────────────────────────────
//  UI 보조
// ─────────────────────────────────────────────────────────────────────

export const ESCALATION_PATTERN_LABEL: Record<
  EscalationPattern,
  { ko: string; en: string; hintKo: string; hintEn: string }
> = {
  "perimeter-spillover": {
    ko: "이웃 나라로 번짐",
    en: "Spillover to a neighbor",
    hintKo:
      "본래 싸우던 지역이 아닌 이웃 나라의 영토나 영공에서 군사 사건이 보도됐습니다. " +
      "싸움이 새 장소로 번진 것처럼 보일 수 있지만, 전쟁이 커졌다고 단정하지는 않습니다.",
    hintEn:
      "A military event was reported on a neighboring country's territory outside the main fighting zone. That can look like conflict spreading — we do not claim a wider war has begun.",
  },
  "cross-theater": {
    ko: "다른 전쟁 세력이 겹침",
    en: "Actors from separate wars",
    hintKo:
      "서로 다른 전쟁의 당사자가 같은 사건 보도에 함께 나옵니다. 두 전쟁이 하나로 합쳐졌다는 뜻은 아닙니다.",
    hintEn:
      "Parties from separate wars appear in one report. That does not mean the wars have merged.",
  },
  "capability-threshold": {
    ko: "새 무기 종류 등장",
    en: "New weapon type",
    hintKo:
      "이전에는 쓰이지 않던 종류의 무기가 언급된 보도입니다. 싸움의 강도가 한 단계 올라갈 수 있는 신호로 봅니다.",
    hintEn:
      "Reporting mentions a type of weapon not previously used here — a possible step-up in intensity.",
  },
  "protected-target": {
    ko: "특별 보호 시설",
    en: "Specially protected site",
    hintKo:
      "원전처럼 국제법으로 특별히 보호하는 시설이 맞았다는 보도입니다. " +
      "사고인지 고의인지는 여기서 판단하지 않습니다.",
    hintEn:
      "Reporting that a specially protected site (e.g. a nuclear plant) was struck. We do not judge accident vs intent.",
  },
  "c3i-entanglement": {
    ko: "핵 경보·지휘 시설",
    en: "Nuclear warning / command site",
    hintKo:
      "미사일 조기경보 레이더나 핵 지휘 시설이 언급된 교전 보도입니다. " +
      "겉보기에는 일반 군사 목표처럼 보여도 핵 태세와 연결된 시설이라, 오해가 커질 수 있습니다. " +
      "핵 확전이 일어났다고 말하는 것은 아닙니다.",
    hintEn:
      "Reporting involves early-warning radars or nuclear command sites. They can look like ordinary military targets but underpin nuclear posture — so misreading the strike is dangerous. This does not claim nuclear escalation has occurred.",
  },
  "diplomatic-breach": {
    ko: "대사관·영사관 피격",
    en: "Embassy or consulate struck",
    hintKo:
      "대사관이나 영사관이 맞았다는 보도입니다. 국제법상 공관은 손대면 안 되는 곳이라, " +
      "규모가 작아도 보복의 명분이 바로 생길 수 있습니다. (예: 2024년 다마스쿠스 영사관)",
    hintEn:
      "Reporting that an embassy or consulate was struck. Such premises are inviolable in international law, so even a small strike can create grounds for retaliation.",
  },
  "leadership-strike": {
    ko: "지도부·지휘관 표적",
    en: "Leader or commander targeted",
    hintKo:
      "지휘관이나 고위 인사가 표적이 됐다는 보도입니다. 보복이 이어질 여지는 있지만, 여기서 보복을 예측하지는 않습니다.",
    hintEn:
      "Reporting that a commander or senior figure was targeted. Retaliation risk exists; we do not forecast it.",
  },
  "sub-kinetic": {
    ko: "총성 없는 긴장",
    en: "Tension without gunfire",
    hintKo:
      "미사일이나 포격 없이도 긴장을 키울 수 있는 사건 보도입니다. 사이버 공격, 해저 케이블 손상, 핵 관련 신호, 위성 방해, 봉쇄 등이 여기에 해당합니다. " +
      "누가 했는지는 종종 불확실해서, ‘그런 보도가 있었다’까지만 적습니다.",
    hintEn:
      "Reporting of events that raise tension without gunfire — cyber attacks, undersea cable damage, nuclear signalling, satellite interference, blockade. Attribution is often unclear, so we only note that such reporting exists.",
  },
  "alliance-alert": {
    ko: "이웃·동맹국 경보",
    en: "Neighbor or ally alert",
    hintKo:
      "이웃이나 동맹국 정부가 경보를 냈다는 보도입니다. 동맹 조약이 발동됐다는 뜻이 아니며, 발동을 예측하지도 않습니다.",
    hintEn:
      "Reporting that a neighboring or allied government issued an alert. That is not a treaty activation, and we do not predict one.",
  },
};

export const ESCALATION_DISCLAIMER_KO =
  "공개 뉴스에서 골라 올린 알림입니다. 전쟁이 커졌다고 판단하거나, 곧 터진다고 예측하지 않습니다.";
export const ESCALATION_DISCLAIMER_EN =
  "A highlight from public news — not a judgement or forecast that war has widened or is imminent.";

export { ESCALATION_METHOD_NOTE_KO, ESCALATION_METHOD_NOTE_EN };

/** 점수 분해를 사람이 읽는 줄로. UI 가 그대로 나열한다. */
export function formatFactors(signal: EscalationSignal, lang: "ko" | "en" = "ko"): string[] {
  const lines = signal.factors.map((f) => {
    const label = lang === "ko" ? f.labelKo : f.labelEn;
    const sign = f.points >= 0 ? "+" : "";
    const ev = f.evidence ? ` — "${f.evidence}"` : "";
    const basis = lang === "ko" && f.basisKo ? `  [${f.basisKo}]` : "";
    return `${sign}${f.points}  ${label}${ev}${basis}`;
  });
  lines.push(
    lang === "ko"
      ? `= ${signal.score}점(${ESCALATION_SHOW_THRESHOLD}점 이상이면 화면에 표시)`
      : `= ${signal.score} pts · shown at ${ESCALATION_SHOW_THRESHOLD}+`,
  );
  return lines;
}

export function shouldFlash(signal: EscalationSignal): boolean {
  return signal.score >= ESCALATION_FLASH_THRESHOLD;
}
