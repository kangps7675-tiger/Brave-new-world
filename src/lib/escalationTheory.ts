/**
 * 확전 이론 — 문헌 근거 (Escalation Theory Reference)
 *
 * ══════════════════════════════════════════════════════════════════════
 *  왜 이 파일이 따로 있나
 * ══════════════════════════════════════════════════════════════════════
 *
 * `escalationSignals.ts` 의 가중치는 처음에 **내가 지어낸 숫자**였다.
 * 「키네틱 +2, 교차 +3」에 아무 근거가 없었다. 그건 우리가 막으려던 뇌피셜을
 * 시스템 안쪽에 심는 것이다.
 *
 * 그래서 판정 축과 가중치를 **공개된 확전 문헌**에 맞춰 다시 세웠다.
 * 이 파일은 그 근거를 코드 옆에 두기 위한 것이다. 가중치를 바꾸려면
 * 여기 근거부터 바꿔야 한다.
 *
 * ══════════════════════════════════════════════════════════════════════
 *  1. 확전의 정의 (RAND)
 * ══════════════════════════════════════════════════════════════════════
 *
 *   "an increase in the intensity or scope of military activity
 *    **that crosses threshold(s) considered significant by
 *    one or more of the participants**"
 *
 *   — Radin, Demus & Evans, *A Vocabulary of Escalation* (RAND RR-A1933-1),
 *     Morgan et al., *Dangerous Thresholds* (RAND MG-614, 2008) 인용
 *
 * 핵심은 **"임계선을 넘었다"** 이지 "규모가 크다"가 아니다.
 * 전선 안에서 벌어지는 대규모 포격은 아무 임계선도 넘지 않는다.
 * 소형 드론 한 대가 NATO 회원국 영공에 들어가면 임계선을 넘는다.
 *
 * → 그래서 우리 점수는 **사건 크기가 아니라 임계선 종류**에 가중치를 준다.
 *
 * ══════════════════════════════════════════════════════════════════════
 *  2. 차원 축: 수직 / 수평 (Morgan et al., pp. 18–20)
 * ══════════════════════════════════════════════════════════════════════
 *
 *   vertical   강도(intensity) 증가 — 안 쓰던 무기·능력의 사용,
 *              표적 종류·수의 확대
 *   horizontal 지리적 범위(scope) 확대 — 적대 상호작용이 새 지역으로
 *
 * 우리가 잡으려는 두 사건이 정확히 이 축에 놓인다:
 *   · 루마니아 영공 드론  → **수평** (전장 밖으로 범위 확대)
 *   · 카스피해 교차 격추  → **수평** (행위자 연결로 범위 확대)
 *   · 새 미사일 유형 첫 사용 → **수직**
 *
 * ══════════════════════════════════════════════════════════════════════
 *  3. 의도 축: 고의 / 비의도 / 사고 — **우리는 판정하지 않는다**
 * ══════════════════════════════════════════════════════════════════════
 *
 *   deliberate  의도적 확전
 *   inadvertent 상대의 임계선을 모르고 넘어 예상 못 한 반응을 부름
 *   accidental  오작동·무단 행동 등 사고
 *
 * 이 축은 **행위자의 머릿속**에 있다. 공개 보도로는 알 수 없다.
 * 그래서 우리는 이 축을 **분류하지 않고**, 보도가 "표류(strayed)"·"오폭"
 * 같은 표현을 쓰는지만 **인용**한다. 단정은 하지 않는다.
 *
 * ══════════════════════════════════════════════════════════════════════
 *  4. 전이(contagion) 메커니즘 — 실증 문헌
 * ══════════════════════════════════════════════════════════════════════
 *
 * 분쟁이 이웃으로 번지는 경로는 실증적으로 좁혀져 있다:
 *
 *   · 무기·전투원의 국경 넘는 유출 (arms/combatant spillover)
 *   · 난민 이동 (refugee flows)
 *   · 초국경 종족·친족 유대 (transnational ethnic / kinship ties)
 *
 *   — Forsberg, *Neighbors at Risk* (Uppsala) · Salehyan & Gleditsch,
 *     "Refugees and the Spread of Civil War" · Buhaug & Gleditsch
 *
 * **모든 이웃이 같은 위험이 아니다.** 그래서 `perimeterStates.ts` 는
 * 아무 인접국이나 넣지 않고, 실제 유출 이력·접경·조약 지위를 기준으로 뽑았다.
 *
 * ⚠️ 단, 위 문헌은 대부분 **내전(civil war) 전이**를 다룬다.
 *    국가 간 전쟁의 제3국 유출에 그대로 적용되지 않는다.
 *    우리는 "메커니즘 목록"만 빌리고 계수는 빌리지 않는다.
 *
 * ══════════════════════════════════════════════════════════════════════
 *  5. 이 시스템의 한계 — 반드시 UI 에 함께 나가야 한다
 * ══════════════════════════════════════════════════════════════════════
 *
 *  · 확률을 내지 않는다. 「확전 가능성 37%」 같은 숫자는 근거가 없다.
 *  · 의도를 추정하지 않는다.
 *  · 미래를 예측하지 않는다.
 *  · 보도를 검증하지 않는다 — 보도가 있었다는 사실만 안다.
 *
 *  이 시스템이 하는 일: **"어떤 종류의 임계선이 언급됐는가"를 분류해서
 *  묻힐 뻔한 기사를 위로 올린다.** 그게 전부다.
 */

/** Morgan et al. 차원 축 */
export type EscalationDimension = "horizontal" | "vertical";

/**
 * 의도 축 — 타입만 두고 **값은 채우지 않는다.**
 * 공개 보도로 의도를 알 수 없다는 사실을 타입으로 박아둔다.
 */
export type EscalationIntent = "deliberate" | "inadvertent" | "accidental" | "undetermined";

/**
 * 임계선 종류와 가중치.
 *
 * RAND 정의의 "threshold considered significant by one or more participants"
 * 를 **공개 보도에서 식별 가능한 형태**로 좁힌 것이다.
 * 가중치는 "그 임계선을 넘었을 때 당사자가 반응할 제도적 의무가 얼마나 명시적인가"
 * 순서다 — 우리가 느끼는 심각도가 아니라 **문서화된 구속력** 기준.
 */
export type ThresholdKind =
  | "sovereign-territory"
  | "treaty-territory"
  | "nuclear-infrastructure"
  | "new-capability-class"
  | "third-party-asset"
  | "theater-linkage"
  // ── 2차 문헌 검토(2026-07-31)에서 추가된 8종 ──────────────────────
  // 초기 구현은 "영토·무기·전장" 축만 봤다. 아래는 전부 실제 확전 경로인데
  // 빠져 있었다. 특히 다마스쿠스 영사관 피격(2024-04-01)은 이란–이스라엘
  // 직접 교전을 촉발한 사건인데, 기존 규칙으로는 **한 점도 못 받았다.**
  | "c3i-early-warning"
  | "diplomatic-premises"
  | "nuclear-signaling"
  | "cyber-critical-infrastructure"
  | "undersea-infrastructure"
  | "counterspace"
  | "leadership-targeting"
  | "blockade-declared"
  | "maritime-interdiction";

export const THRESHOLD_WEIGHT: Record<ThresholdKind, number> = {
  /**
   * 비교전국의 주권 영역(영공·영해) 침범.
   * UN 헌장 2조 4항이 명시적으로 다루는 가장 오래된 임계선.
   * 수평 확전의 교과서적 형태다.
   */
  "sovereign-territory": 4,
  /**
   * 안 쓰던 무기 종류의 첫 사용.
   * Morgan et al. 의 **수직 확전 정의 그 자체**다 —
   * "the threat or employment of forces or capabilities not previously used."
   * 정의에 직접 대응하므로 최상위 가중치.
   */
  "new-capability-class": 4,
  /**
   * 원자력 시설.
   * 제네바협약 제1추가의정서 56조가 "위험한 힘을 포함하는 시설"로
   * 별도 보호를 규정하고, IAEA 총회 결의가 이를 재확인한다.
   * 동시에 Morgan et al. 의 수직 확전 정의 후단
   * "expansion of the type ... of targets at risk" 에도 해당한다.
   */
  "nuclear-infrastructure": 4,
  /**
   * 집단방위 조약 대상 영토.
   * NATO 4조(협의)·5조(집단방위), 미일·한미 상호방위조약 등
   * **성문화된 대응 의무**가 걸린다.
   * ⚠️ "그래서 발동된다"는 뜻이 아니다. 협의 절차가 문서로 존재한다는 사실이다.
   */
  "treaty-territory": 3,
  /**
   * 제3국 국적 선박·항공기 — 기국(flag state) 관할권이 걸린다.
   */
  "third-party-asset": 2,
  /**
   * 서로 다른 전장의 행위자가 한 사건에 등장.
   * 문헌의 직접 대응 개념은 없다. 전이(contagion) 문헌의
   * "무기·전투원 유출" 경로를 **관측 가능한 대리지표**로 쓴 것이다.
   * 그래서 가장 낮게 잡는다. 이건 우리 조작화이지 정설이 아니다.
   */
  "theater-linkage": 2,

  // ── 2차 검토 추가분 ────────────────────────────────────────────────

  /**
   * 핵 지휘통제·조기경보(C3I) 자산 공격.
   *
   * **문헌상 가장 위험한 단일 경로다.** Acton 은 재래식 타격이
   * 이중용도 C3I 를 건드리면 "오인된 경보(misinterpreted warning)" 또는
   * "피해제한 창(damage-limitation window)" 을 통해 **비의도적 핵 확전**으로
   * 이어질 수 있다고 본다. 조기경보 레이더·위성은 재래식 표적처럼 보이지만
   * 핵 태세의 눈이다.
   *
   *   — Acton, J. M., "Escalation through Entanglement," *International Security* 43(1), 2018
   *
   * 최고 가중치를 주는 이유: 이 임계선은 **넘은 쪽도 넘은 줄 모를 수 있다.**
   */
  "c3i-early-warning": 5,
  /**
   * 외교공관 피격.
   *
   * 1961 빈 외교관계협약 22조 · 1963 빈 영사관계협약 31조가
   * 공관의 **불가침(inviolability)** 을 절대적으로 규정한다.
   * 규모는 작지만 법적 성격이 특수해 보복의 명분이 즉시 성립한다.
   *
   * 실증: 2024-04-01 다마스쿠스 이란 영사관 피격 → 4-13 이란의 대이스라엘
   * 직접 타격 → 4-19 이스라엘 재보복. **대리전이 직접 교전으로 전환된 지점.**
   * 이 사건은 사상자 16명으로 "작은" 사건이었다.
   */
  "diplomatic-premises": 4,
  /**
   * 핵 신호 — 교리 변경 성명, 핵 연습, 탄두·투발수단 이동, 경계태세 상향.
   * 물리적 교전이 없어도 확전 사다리를 올리는 **의도적 신호**다.
   * Schelling 의 "위험을 조작하는 경쟁" 그 자체.
   */
  "nuclear-signaling": 4,
  /**
   * 핵심 인프라 대상 사이버 공격.
   *
   * NATO 2022 전략개념은 **개별 또는 누적된** 사이버·하이브리드 활동이
   * 5조 임계에 도달할 수 있다고 명시했다(2014 웨일스 정상회의 이래 확인).
   * 다만 NATO 는 임계를 **의도적으로 모호하게** 유지한다 — 그래서 우리도
   * "발동될 것"이라 말하지 않고 임계선 언급 사실만 기록한다.
   */
  "cyber-critical-infrastructure": 3,
  /**
   * 해저 인프라(케이블·파이프라인) 손상.
   *
   * 노르트스트림(2022-09) · 발틱커넥터(2023-10) · 발트해 케이블 연쇄
   * (2024-11, 2024-12, 2025-01). NATO 는 'Baltic Sentry' 로 대응 중.
   *
   * ⚠️ **귀속이 구조적으로 어렵다.** 사고와 사보타주가 섞이고 수사가 길다.
   *    그래서 가중치를 낮게 잡고, 우리는 "손상 보도가 있었다"까지만 말한다.
   */
  "undersea-infrastructure": 3,
  /**
   * 대위성(ASAT)·우주 자산 간섭.
   * 파괴형 ASAT 는 잔해를 남겨 되돌릴 수 없고, GPS 재밍 등 '연성 킬'은
   * 가장 흔하지만 귀속이 가장 어렵다. C3I 와 겹치면 위험이 급증한다.
   */
  "counterspace": 3,
  /**
   * 지도부 표적 타격.
   * 문헌은 "보복의 순환(cycle of violence)"과, 실패 시 **즉각적 대규모 보복**
   * 위험을 지적한다. 참수 시도는 상대의 지휘통제를 흔들어
   * 위임발사·자동대응 압력을 높인다.
   */
  "leadership-targeting": 3,
  /**
   * 봉쇄·해상 차단.
   * 국제법상 **봉쇄는 교전 행위(act of war)** 로 취급되며 선언·실효성·공평성
   * 요건이 따른다. 평시 봉쇄는 원칙적으로 위법이다.
   * 임검·나포는 별개 제도지만 준봉쇄로 비칠 때 무력사용 논란을 부른다.
   */
  "blockade-declared": 4,
  /**
   * 임검·나포.
   * 봉쇄와 **법적 제도가 다르다** — 문헌도 둘을 구분한다.
   * 걸프 유조선 나포는 상시적이라 단독으로는 노출되지 않도록 낮게 잡는다.
   */
  "maritime-interdiction": 2,
};

export const THRESHOLD_LABEL: Record<
  ThresholdKind,
  { ko: string; en: string; basisKo: string }
> = {
  "sovereign-territory": {
    ko: "전쟁에 참여하지 않은 나라의 영공·영해",
    en: "Airspace or waters of a non-belligerent",
    basisKo: "유엔 헌장 — 다른 나라 영토에 무력을 쓰면 안 됩니다",
  },
  "treaty-territory": {
    ko: "동맹 조약이 적용되는 영토",
    en: "Territory covered by a defense treaty",
    basisKo: "NATO·한미·미일 등 — 협의·대응 절차가 문서에 있습니다(발동을 예고하는 것은 아님)",
  },
  "nuclear-infrastructure": {
    ko: "원자력 시설",
    en: "Nuclear facility",
    basisKo: "국제인도법상 특별히 보호하는 대상입니다(원전 등)",
  },
  "new-capability-class": {
    ko: "쓰이지 않던 무기 종류의 첫 사용",
    en: "First use of a previously unused weapon type",
    basisKo: "싸움의 강도가 한 단계 올라가는 전형적인 신호입니다",
  },
  "third-party-asset": {
    ko: "제3국 국적의 선박·항공기",
    en: "Ship or aircraft of a third country",
    basisKo: "그 나라 국적이면 그 나라가 관할권을 가집니다",
  },
  "theater-linkage": {
    ko: "다른 전쟁 세력이 한 사건에 등장",
    en: "Actors from separate wars in one event",
    basisKo: "무기나 전투원이 넘어갈 수 있다는 관측용 표시입니다(확정은 아님)",
  },
  "c3i-early-warning": {
    ko: "핵 경보·지휘 시설",
    en: "Nuclear warning / command facility",
    basisKo: "일반 목표처럼 보여도 핵 태세와 연결될 수 있어 오해가 커질 수 있습니다",
  },
  "diplomatic-premises": {
    ko: "대사관·영사관 피격",
    en: "Embassy or consulate struck",
    basisKo: "국제법상 공관은 손대면 안 됩니다 — 보복의 명분이 바로 생길 수 있습니다",
  },
  "nuclear-signaling": {
    ko: "핵 관련 신호(교리·연습·이동)",
    en: "Nuclear signalling (doctrine, drill, movement)",
    basisKo: "총성이 없어도 긴장을 한 단계 올릴 수 있는 의도적 메시지입니다",
  },
  "cyber-critical-infrastructure": {
    ko: "핵심 시설에 대한 사이버 공격",
    en: "Cyber attack on critical infrastructure",
    basisKo: "전력·통신 등 — 동맹 논의로 이어질 수 있으나 발동을 예고하지는 않습니다",
  },
  "undersea-infrastructure": {
    ko: "해저 케이블·가스관 손상",
    en: "Undersea cable or pipeline damage",
    basisKo: "누가 했는지 밝히기 어렵습니다 — 손상 보도까지만 기록합니다",
  },
  "counterspace": {
    ko: "위성 공격·방해",
    en: "Satellite attack or interference",
    basisKo: "위성을 파괴하면 잔해가 남고, 전파를 방해하면 범인을 추적하기 어렵습니다",
  },
  "leadership-targeting": {
    ko: "지도부·지휘관 표적",
    en: "Leader or commander targeted",
    basisKo: "보복이 이어질 여지가 큽니다 — 여기서 보복을 예측하지는 않습니다",
  },
  "blockade-declared": {
    ko: "봉쇄 선언",
    en: "Declared blockade",
    basisKo: "국제법상 봉쇄는 전쟁 행위로 다룹니다",
  },
  "maritime-interdiction": {
    ko: "해상 검문·나포",
    en: "Ship search or seizure at sea",
    basisKo: "봉쇄와는 다른 제도입니다 — 자주 일어나 단독으로는 덜 부각합니다",
  },
};

/**
 * 전이 경로 — Forsberg / Salehyan & Gleditsch 가 지목한 메커니즘 중
 * **공개 보도에서 문자열로 식별 가능한 것만** 남겼다.
 *
 * 종족·친족 유대는 실증적으로 가장 강한 예측자이지만
 * 기사 텍스트에서 신뢰성 있게 뽑을 수 없어 넣지 않았다.
 * (없는 걸 있다고 하지 않는 게 이 프로젝트 원칙이다)
 */
export type ContagionVector = "arms-transfer" | "refugee-flow" | "combatant-movement";

export const CONTAGION_WEIGHT: Record<ContagionVector, number> = {
  "arms-transfer": 2,
  "combatant-movement": 2,
  "refugee-flow": 1,
};

export const CONTAGION_LABEL: Record<ContagionVector, { ko: string; en: string }> = {
  "arms-transfer": { ko: "무기 이전 경로", en: "Arms transfer route" },
  "combatant-movement": { ko: "전투원 이동", en: "Combatant movement" },
  "refugee-flow": { ko: "난민 이동", en: "Refugee flow" },
};

/** 인용 — UI 「방법론」 패널에 그대로 노출한다. */
export const ESCALATION_CITATIONS = [
  {
    id: "rand-vocabulary",
    cite: "Radin, A., Demus, A., & Evans, A. T. — A Vocabulary of Escalation: A Primer on the Escalation Literature for Military Planners",
    org: "RAND Corporation (RR-A1933-1)",
    url: "https://www.rand.org/pubs/research_reports/RRA1933-1.html",
    usedFor: "확전 정의 · 수직/수평 차원 · 고의/비의도/사고 의도 축",
  },
  {
    id: "rand-thresholds",
    cite: "Morgan, F. E., Mueller, K. P., Medeiros, E. S., Pollpeter, K. L., & Cliff, R. — Dangerous Thresholds: Managing Escalation in the 21st Century",
    org: "RAND Corporation (MG-614, 2008)",
    url: "https://www.rand.org/pubs/monographs/MG614.html",
    usedFor: "임계선(threshold) 개념 · 수직/수평 정의 (pp. 18–20)",
  },
  {
    id: "acton-entanglement",
    cite: "Acton, J. M. — Escalation through Entanglement: How the Vulnerability of Command-and-Control Systems Raises the Risks of an Inadvertent Nuclear War",
    org: "International Security 43(1), 2018",
    url: "https://direct.mit.edu/isec/article/43/1/56/12199/",
    usedFor:
      "C3I·조기경보 자산 공격이 '오인된 경보'·'피해제한 창'을 통해 비의도적 핵 확전으로 이어지는 경로 (최고 가중치 5의 근거)",
  },
  {
    id: "nato-strategic-concept-2022",
    cite: "NATO 2022 Strategic Concept · Wales Summit Declaration (2014) — 사이버·하이브리드 활동의 5조 임계 도달 가능성",
    org: "NATO",
    url: "https://www.nato.int/cps/en/natohq/topics_78170.htm",
    usedFor:
      "사이버 임계선. 개별·누적 사이버가 5조 임계에 도달 가능하되 임계는 **의도적으로 모호**하다 — 그래서 우리도 '발동될 것'이라 말하지 않는다",
  },
  {
    id: "vienna-conventions",
    cite: "Vienna Convention on Diplomatic Relations (1961) Art. 22 · Vienna Convention on Consular Relations (1963) Art. 31",
    org: "United Nations",
    url: "https://legal.un.org/ilc/texts/instruments/english/conventions/9_1_1961.pdf",
    usedFor:
      "외교공관 불가침. 2024-04-01 다마스쿠스 이란 영사관 피격 → 이란–이스라엘 직접 교전 전환 사례",
  },
  {
    id: "geneva-api-56",
    cite: "제네바협약 제1추가의정서(1977) 56조 — 위험한 힘을 포함하는 시설의 보호",
    org: "ICRC",
    url: "https://ihl-databases.icrc.org/en/ihl-treaties/api-1977/article-56",
    usedFor: "원자력 시설 임계선의 법적 근거",
  },
  {
    id: "unclos-blockade",
    cite: "UNCLOS 기국주의 · 관습국제법상 봉쇄 요건(선언·실효성·공평성)",
    org: "United Nations",
    url: "https://www.un.org/depts/los/convention_agreements/texts/unclos/unclos_e.pdf",
    usedFor:
      "제3국 국적 자산 · 봉쇄(교전 행위)와 임검·나포(별개 제도)의 구분",
  },
  {
    id: "forsberg-contagion",
    cite: "Forsberg, E. — Neighbors at Risk: A Quantitative Study of Civil War Contagion",
    org: "Uppsala University",
    url: "https://uu.diva-portal.org/smash/get/diva2:227639/FULLTEXT01.pdf",
    usedFor: "전이 메커니즘 (무기 유출·난민·종족 유대) · 이웃별 위험 차등",
  },
  {
    id: "salehyan-gleditsch",
    cite: "Salehyan, I. & Gleditsch, K. S. — Refugees and the Spread of Civil War",
    org: "International Organization",
    url: "https://www.cambridge.org/core/journals/international-organization",
    usedFor: "난민 이동을 통한 분쟁 확산 경로",
  },
] as const;

/** 방법론 고지 — 신호를 띄울 때 항상 함께 나간다. */
export const ESCALATION_METHOD_NOTE_KO =
  "싸움이 얼마나 커졌는지보다, 넘으면 반응이 커질 수 있는 선이 보도에 나왔는지를 봅니다. " +
  "점수는 사건의 크기나 전쟁 확률이 아닙니다. 그 선이 조약이나 국제법에 얼마나 분명히 적혀 있는지로 매깁니다. " +
  "고의인지 사고인지는 뉴스만으로 알 수 없어 나누지 않습니다. " +
  "(참고 문헌: RAND 확전 연구 등 — 방법론 패널에서 더 볼 수 있습니다)";

export const ESCALATION_METHOD_NOTE_EN =
  "We look for reports that mention lines where a response often gets bigger — not ‘how large’ the fight is, and not a war probability. " +
  "Scores reflect how clearly those lines are written into treaties or international law. " +
  "Intent (deliberate vs accident) is not classified from news alone. " +
  "(Literature: RAND escalation studies and related work — see methodology sources for detail.)";
