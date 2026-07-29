import {
  episodeLocationName,
  episodeNote,
  episodeBriefing,
  type FrictionEpisode,
} from "@/data/frictionEpisodes";

/** OpenAlex Works 메타 — 전문 재배포 없음, DOI·링크만 */
export type FrictionOpenAlexWork = {
  openAlexId: string;
  title: string;
  year: number | null;
  citedBy: number;
  doi: string | null;
  venue: string | null;
  authors: string[];
  url: string;
};

export type FrictionTimelineStage = {
  id: string;
  /** 1-based 표시 순서 */
  order: number;
  yearLabel: string;
  titleKo: string;
  titleEn: string;
  bodyKo: string;
  bodyEn: string;
  /** [lng, lat] — 에피소드 좌표에서 살짝 오프셋한 콜아웃 */
  coordinates: readonly [number, number];
};

export type FrictionDeepDoc = {
  episodeId: string;
  /** 양피지용 심층 문단 (한국어) */
  paragraphsKo: string[];
  paragraphsEn: string[];
  /** 6하원칙 (Who / What / When / Where / Why / How) */
  sixW: {
    whoKo: string;
    whoEn: string;
    whatKo: string;
    whatEn: string;
    whenKo: string;
    whenEn: string;
    whereKo: string;
    whereEn: string;
    whyKo: string;
    whyEn: string;
    howKo: string;
    howEn: string;
  };
  stages: FrictionTimelineStage[];
  openAlex: FrictionOpenAlexWork[];
};

function offset(
  base: readonly [number, number],
  dLng: number,
  dLat: number,
): readonly [number, number] {
  return [base[0] + dLng, base[1] + dLat] as const;
}

function work(
  openAlexId: string,
  title: string,
  year: number | null,
  citedBy: number,
  doi: string | null,
  venue: string | null,
  authors: string[],
  url: string,
): FrictionOpenAlexWork {
  return { openAlexId, title, year, citedBy, doi, venue, authors, url };
}

/**
 * 11대 현장 심층 문서 + 전개 콜아웃 + OpenAlex 참고문헌.
 * OpenAlex는 메타데이터 선별본(전문 재배포 없음).
 */
export const FRICTION_DEEP_DOCS: Record<string, FrictionDeepDoc> = {
  "sino-soviet-border-1969": {
    episodeId: "sino-soviet-border-1969",
    sixW: {
      whoKo: "중화인민공화국 국경·정규 부대와 소비에트 연방 국경·정규 부대.",
      whoEn: "Border and regular units of the People’s Republic of China and of the Soviet Union.",
      whatKo: "우수리강 전바오섬(소련명 다만스키) 및 인근 국경에서 무력 교전·포격·대치가 발생한 중소 국경 분쟁.",
      whatEn: "Armed clashes, shelling, and confrontation along the Sino-Soviet border, centered on Zhenbao (Damansky) Island in the Ussuri River.",
      whenKo: "1969년 3월이 절정(주요 교전 3월 2일·15일 전후). 같은 해 추가 국경 마찰이 이어짐.",
      whenEn: "Peak in March 1969 (major fighting around 2 and 15 March); further border friction continued that year.",
      whereKo: "중국–소련 동부 국경, 우수리강(흑룡강)의 전바오/다만스키 섬 및 인근 강안.",
      whereEn: "Eastern Sino-Soviet border: Zhenbao/Damansky Island on the Ussuri River and adjacent riverbanks.",
      whyKo: "강 중 섬 귀속·주항로(탈베그) 해석 등 국경선 쟁점과, 중소 이념·안보 분열이 현장 병력 충돌로 전화됨.",
      whyEn: "Disputes over island ownership and the river thalweg, layered onto the Sino-Soviet ideological and security split, turned into live combat.",
      howKo: "순찰·점거 시도가 교전으로 확대되고 포병·증원이 동원됨. 양측 사상자 추정은 수십~수백 명대. 이후 외교 항의와 전략적 재평가가 뒤따름.",
      howEn: "Patrols and occupation attempts escalated into firefights with artillery and reinforcements. Casualty estimates run from tens to hundreds. Diplomatic protests and strategic reassessment followed.",
    },
    paragraphsKo: [
      "1960년대 중소 관계는 이념 논쟁을 넘어 군사적 불신으로 굳어졌습니다. 양국은 강과 섬을 따라 국경선을 다르게 읽었고, 주항로·섬 귀속 해석이 병력 배치와 순찰 경로로 번역되었습니다.",
      "1969년 3월 전바오섬 교전은 그 긴장의 정점이었습니다. 공개 기록과 연구는 양측이 섬과 강안에서 교전·포격을 주고받았으며, 사상자 규모에 대한 추정치가 수십에서 수백 명대까지 갈린다고 정리합니다.",
      "같은 해 추가 국경 마찰과 대치가 이어지면서, 분쟁은 ‘국지 도발’을 넘어 전략적 위기로 인식되었습니다. 핵무기 사용 가능성에 대한 당시 논의·보고는 이후 냉전사 문헌에서 반복적으로 다뤄집니다.",
      "외교적으로는 항의·협상과 병행해 대외 정렬이 재검토되었습니다. 미·중 접근의 배경 요인 중 하나로 이 위기를 위치시키는 해석이 학계에 널리 존재합니다.",
      "전바오는 공산권 ‘혈맹’ 서사가 실탄으로 깨진 대표 좌표로 남았습니다. 국경선 해석의 작은 차이가 대규모 대치로 커질 수 있음을 보여주는 사례입니다.",
    ],
    paragraphsEn: [
      "By the 1960s Sino-Soviet relations had hardened from ideological dispute into military distrust. The two sides read the river and island border differently; thalweg and ownership claims became patrol routes and force posture.",
      "The March 1969 fighting on Zhenbao was the peak. Open records and scholarship describe exchanges of fire and shelling on the island and banks, with casualty estimates ranging from the tens to the hundreds.",
      "Further friction and confrontation that year framed the episode as a strategic crisis, not a one-day skirmish. Contemporary discussion of nuclear risk is a recurring theme in later Cold War histories.",
      "Diplomatically, protests and talks ran alongside a reassessment of external alignment. Many scholars place the crisis among the background factors of Sino-American rapprochement.",
      "Zhenbao remains a signature coordinate where the ‘fraternal’ myth of the communist camp cracked under live fire—and where a small cartographic disagreement could scale into major confrontation.",
    ],
    stages: [
      {
        id: "zhenbao-claim",
        order: 1,
        yearLabel: "1960s",
        titleKo: "국경 해석의 누적",
        titleEn: "Accumulating border claims",
        bodyKo: "우수리강 주항로와 섬 귀속을 둘러싼 양측 주장이 1960년대에 걸쳐 누적됩니다. 지도·조약 해석 차이가 현장 순찰과 초소 배치로 이어집니다.",
        bodyEn: "Competing claims over the Ussuri thalweg and island ownership pile up through the 1960s. Divergent map and treaty readings become patrols and outposts.",
        coordinates: offset([133.84, 46.64], -0.35, 0.2),
      },
      {
        id: "zhenbao-buildup",
        order: 2,
        yearLabel: "1968–69",
        titleKo: "병력·순찰 긴장",
        titleEn: "Force and patrol tension",
        bodyKo: "국경 지대에 병력과 경계 태세가 강화됩니다. 소규모 마찰·대치 보고가 늘어나며 현장 분위기가 악화됩니다.",
        bodyEn: "Forces and alert levels rise along the border. Reports of small frictions and stand-offs increase as the local climate worsens.",
        coordinates: offset([133.84, 46.64], -0.15, 0.35),
      },
      {
        id: "zhenbao-clash",
        order: 3,
        yearLabel: "1969-03",
        titleKo: "섬 위 교전",
        titleEn: "Fight on the island",
        bodyKo: "3월 전바오섬에서 국경 부대가 충돌합니다. 교전과 포격이 이어지며 공개 기록은 수십~수백 명대 사상 추정치를 남깁니다.",
        bodyEn: "In March, border units clash on Zhenbao. Fighting and shelling follow; open records cite casualty estimates in the tens to hundreds.",
        coordinates: [133.84, 46.64],
      },
      {
        id: "zhenbao-escalate",
        order: 4,
        yearLabel: "1969",
        titleKo: "추가 마찰과 대치",
        titleEn: "Further friction and stand-off",
        bodyKo: "같은 해 다른 국경 구간에서도 마찰·포격이 보고됩니다. 양측은 증원과 외교 항의를 병행하며 확전 위험을 관리합니다.",
        bodyEn: "Friction and shelling are also reported on other border sectors that year. Both sides reinforce and protest while managing escalation risk.",
        coordinates: offset([133.84, 46.64], 0.45, -0.25),
      },
      {
        id: "zhenbao-nuclear",
        order: 5,
        yearLabel: "1969",
        titleKo: "핵·전략 위기 인식",
        titleEn: "Nuclear and strategic alarm",
        bodyKo: "위기 국면에서 핵 사용·대규모 전쟁 가능성에 대한 논의가 문헌에 남습니다. 분쟁은 국지전을 넘어 냉전 전략의 변수로 읽힙니다.",
        bodyEn: "Literature records discussion of nuclear use and larger war risk. The clash is read as a Cold War strategic variable, not only a local fight.",
        coordinates: offset([133.84, 46.64], 0.25, 0.15),
      },
      {
        id: "zhenbao-after",
        order: 6,
        yearLabel: "이후",
        titleKo: "외교 잔향과 분열의 증명",
        titleEn: "Diplomatic aftertaste; proof of the split",
        bodyKo: "항의·협상과 대외 정렬 재검토가 이어집니다. 전바오는 중소 분열이 무력으로 드러난 대표 좌표로 고정됩니다.",
        bodyEn: "Protests, talks, and realignment continue. Zhenbao locks in as the emblematic coordinate where the Sino-Soviet split turned into force.",
        coordinates: offset([133.84, 46.64], 0.15, 0.35),
      },
    ],
    openAlex: [
      work("W2083012246", "The Sino-Soviet Border Clash of 1969: From Zhenbao Island to Sino-American Rapprochement", 2000, 166, "https://doi.org/10.1080/713999906", "Cold War History", ["Y. Kuisong"], "https://doi.org/10.1080/713999906"),
      work("W1963923616", "Return to Zhenbao Island: Who Started Shooting and Why it Matters", 2001, 34, "https://doi.org/10.1017/s0009443901000572", "The China Quarterly", ["Lyle J. Goldstein"], "https://doi.org/10.1017/s0009443901000572"),
    ],
  },
  "sino-vietnamese-war-1979": {
    episodeId: "sino-vietnamese-war-1979",
    sixW: {
      whoKo: "중화인민공화국 인민해방군과 베트남 사회주의공화국 인민군·국경 방어 병력.",
      whoEn: "The PLA of the People’s Republic of China and the armed forces of the Socialist Republic of Vietnam.",
      whatKo: "중국의 베트남 북부 국경 공격으로 시작된 단기 전면전(흔히 ‘응징’ 전쟁으로 서술).",
      whatEn: "A short full-scale war begun by China’s attack across Vietnam’s northern border (often described as a ‘punitive’ campaign).",
      whenKo: "1979년 2월 17일 개전. 주요 교전은 약 한 달 안팎. 3월 중국군 철수 발표.",
      whenEn: "War opens 17 February 1979; main fighting lasts about a month; China announces withdrawal in March.",
      whereKo: "베트남 북부 국경 지대. 랑선(Lạng Sơn) 등 산악·국경 도시 축선이 대표 전선.",
      whereEn: "Northern Vietnamese borderlands; Lạng Sơn and other mountain/border-town axes as emblematic fronts.",
      whyKo: "베트남의 캄보디아 개입, 소련–베트남 밀착, 국경·소수민족·난민 문제 등이 중국의 안보·전략 인식과 충돌.",
      whyEn: "Vietnam’s Cambodia intervention, Soviet–Vietnamese alignment, and border/minority/refugee issues collided with China’s security calculus.",
      howKo: "중국군이 다축선으로 북부 국경을 돌파·점령 후 철수. 양측 사상자 추정은 수만 명대. 이후에도 국경 긴장이 지속.",
      howEn: "Chinese forces cross on multiple axes, seize border objectives, then withdraw. Casualty estimates run to the tens of thousands; border tension persists afterward.",
    },
    paragraphsKo: [
      "1978년 베트남의 캄보디아 침공과 친베트남 정권 수립은 인도차이나 질서를 급격히 바꿨습니다. 중국은 이를 자국 안보와 지역 영향력에 대한 도전으로 인식했고, 소련–베트남 조약으로 포위감이 강화되었습니다.",
      "1979년 2월 17일 중국군이 베트남 북부를 공격합니다. 랑선 등 국경 축선에서 산악 지형과 도시·보급선이 얽힌 격전이 전개되었고, 양측은 서로 다른 군사·정치적 ‘성과’ 서사를 남겼습니다.",
      "주요 교전은 약 한 달 수준으로 짧게 끝났지만, 사상자 추정은 문헌상 수만 명대에 이릅니다. 전쟁은 단기 군사 목표와 장기 외교 신호—소련·베트남에 대한 경고—를 동시에 수행한 사례로 분석됩니다.",
      "중국군 철수 발표 이후에도 국경 포격·대치와 상호 비난이 오래 이어졌습니다. 인도차이나에서는 캄보디아 점령·저항과 중월 긴장이 한 연쇄로 남았습니다.",
      "학술 연구는 동기(응징·억지), 작전의 한계, 국내 정치·군대 정비와의 연관까지 해부합니다. 랑선은 그 전선의 대표 좌표로 남습니다.",
    ],
    paragraphsEn: [
      "Vietnam’s 1978 invasion of Cambodia and installation of a Vietnam-aligned government remade Indochina’s order. Beijing read this as a challenge to its security and influence; the Soviet–Vietnamese treaty sharpened a sense of encirclement.",
      "On 17 February 1979 Chinese forces attacked northern Vietnam. Heavy fighting along axes such as Lạng Sơn mixed mountains, border towns, and supply lines; each side left a different military–political ‘success’ narrative.",
      "Main combat lasted roughly a month, yet casualty estimates in the literature reach the tens of thousands. The war is analyzed as pursuing short operational aims and long diplomatic signals—warnings to Moscow and Hanoi—at once.",
      "After Beijing announced withdrawal, shelling, stand-offs, and mutual denunciation continued. In Indochina, Cambodian occupation/resistance and Sino-Vietnamese tension remained linked.",
      "Scholarship dissects motives (punishment and deterrence), operational limits, and links to domestic politics and military reform. Lạng Sơn remains the emblematic front coordinate.",
    ],
    stages: [
      {
        id: "cnvn-cambodia",
        order: 1,
        yearLabel: "1978",
        titleKo: "캄보디아 개입",
        titleEn: "Cambodia intervention",
        bodyKo: "베트남이 민주캄푸치아를 침공하고 친베트남 정권을 세웁니다. 크메르 루주 축출과 점령이 동시에 진행됩니다.",
        bodyEn: "Vietnam invades Democratic Kampuchea and installs an aligned government. Ousting the Khmer Rouge and occupation proceed together.",
        coordinates: offset([106.76, 21.85], -0.55, 0.35),
      },
      {
        id: "cnvn-backdrop",
        order: 2,
        yearLabel: "1978–79",
        titleKo: "소련 밀착과 포위감",
        titleEn: "Soviet alignment & encirclement",
        bodyKo: "소련–베트남 조약과 국경·소수민족·보트피플 문제가 겹칩니다. 중국의 위협 인식이 급격히 높아집니다.",
        bodyEn: "The Soviet–Vietnamese treaty overlaps with border, minority, and boat-people issues. Beijing’s threat perception rises sharply.",
        coordinates: offset([106.76, 21.85], -0.5, 0.3),
      },
      {
        id: "cnvn-attack",
        order: 3,
        yearLabel: "1979-02",
        titleKo: "북부 국경 공격",
        titleEn: "Northern border assault",
        bodyKo: "2월 17일 개전. 랑선 등 다축선에서 중국군이 국경을 돌파하며 격전이 전개됩니다.",
        bodyEn: "War opens on 17 February. Chinese forces cross on multiple axes including Lạng Sơn; heavy fighting follows.",
        coordinates: [106.76, 21.85],
      },
      {
        id: "cnvn-fighting",
        order: 4,
        yearLabel: "1979-02–03",
        titleKo: "산악·도시 교전",
        titleEn: "Mountain and town fighting",
        bodyKo: "국경 도시·고지·보급로를 둘러싼 전투가 이어집니다. 양측 사상자 추정은 수만 명대로 문헌에 제시됩니다.",
        bodyEn: "Combat continues over border towns, heights, and supply routes. Literature cites casualty estimates in the tens of thousands.",
        coordinates: offset([106.76, 21.85], 0.25, 0.15),
      },
      {
        id: "cnvn-withdraw",
        order: 5,
        yearLabel: "1979-03",
        titleKo: "철수 발표",
        titleEn: "Withdrawal announced",
        bodyKo: "중국이 작전 목표 달성 후 철수를 발표합니다. ‘응징’ 서사와 베트남의 방어 서사가 병행됩니다.",
        bodyEn: "China announces withdrawal after claiming objectives met. A ‘punitive’ narrative runs alongside Vietnam’s defensive narrative.",
        coordinates: offset([106.76, 21.85], 0.4, -0.2),
      },
      {
        id: "cnvn-after",
        order: 6,
        yearLabel: "이후",
        titleKo: "국경 긴장 잔향",
        titleEn: "Lingering border tension",
        bodyKo: "철수 후에도 포격·대치와 상호 비난이 지속됩니다. 캄보디아 문제와 중월 관계가 장기 의제로 남습니다.",
        bodyEn: "Shelling, stand-offs, and mutual blame continue after withdrawal. Cambodia and Sino-Vietnamese relations remain long-term agendas.",
        coordinates: offset([106.76, 21.85], 0.15, -0.35),
      },
    ],
    openAlex: [
      work("W1970672527", "The Sino-Vietnamese Border War: China's Motives, Calculations and Strategies", 1980, 18, "https://doi.org/10.1177/000944558001600103", "China Report", ["Herbert S. Yee"], "https://doi.org/10.1177/000944558001600103"),
      work("W4246686567", "CIA secret report on Sino-Vietnamese reaction to American tactics in the Vietnam war", 1983, 31, "https://doi.org/10.1080/00472338380000191", "Journal of Contemporary Asia", [], "https://doi.org/10.1080/00472338380000191"),
    ],
  },
  "galwan-valley-clash-2020": {
    episodeId: "galwan-valley-clash-2020",
    sixW: {
      whoKo: "인도군과 중국 인민해방군. 도클람에서는 부탄 영토·접근로가 겹침.",
      whoEn: "Indian and Chinese PLA forces; at Doklam, Bhutanese territory and access overlap.",
      whatKo: "1962년 전면전으로 모호한 LAC가 생기고, 2017 도클람 대치와 2020 갈완 충돌로 같은 선이 재점화된 연속 분쟁.",
      whatEn: "A continuum: the 1962 war left an ambiguous LAC; Doklam 2017 and Galwan 2020 reignited the same unfinished frontier.",
      whenKo: "1962년 전쟁 · 2017년 도클람 · 2020년 6월 갈완. LAC 관리는 현재진행.",
      whenEn: "1962 war · Doklam 2017 · Galwan June 2020; LAC management ongoing.",
      whereKo: "히말라야 전선 전반. 아크사이친·동부 구간·도클람 삼중접경·라다크 갈완 계곡.",
      whereEn: "The Himalayan front overall—Aksai Chin, eastern sectors, Doklam trijunction, Galwan Valley in Ladakh.",
      whyKo: "전 구간 미획정·모호한 LAC, 전방 인프라·병력 경쟁, 접근로·고지 통제가 충돌.",
      whyEn: "An undemarcated, ambiguous LAC; forward infrastructure and force rivalry; contests over access and heights.",
      howKo: "1962년 전면전 후 동결선이 남고, 도클람은 총성 없는 도로 대치로, 갈완은 총기 제한 하 육탄·둔기 난투로 사상자를 냈습니다. 회담과 전방 재배치가 병행됩니다.",
      howEn: "After 1962 full war a freeze line remained; Doklam was a bloodless road standoff; Galwan produced fatalities in a clubs-and-fists melee under firearm restraints. Talks and redeployments run in parallel.",
    },
    paragraphsKo: [
      "인도–중국 실질통제선(LAC)은 한 번의 충돌이 아니라 한 세대에 걸친 미획정 전선입니다. 1962년 전쟁은 아크사이친과 동부 구간을 포함해 모호한 접촉선을 남겼고, 그 선은 ‘평화’가 아니라 관리 과제가 되었습니다.",
      "2017년 도클람(동랑)에서는 중국의 도로 공사에 인도군이 개입하며 수개월간 고지 대치가 이어졌습니다. 총성은 없었으나 영토·접근로·인프라가 한 시험으로 묶였습니다.",
      "2020년 봄, 여러 지점에서 전방 배치와 인프라 경쟁이 누적된 뒤 갈완 계곡에서 긴장이 치명적으로 터졌습니다. 6월 15~16일, 총기 사용 제한 합의 하 육탄·둔기 난투로 보도되었고, 인도는 20명 사망을 공식 발표했으며 중국은 이후 소수 사망을 인정했습니다.",
      "이후 양국은 전방 병력·장비를 재배치하면서도 군사·외교 회담을 병행했습니다. 교역·정치 신뢰는 타격을 입었고, LAC는 인프라·병력·절차 합의가 필요한 장기 과제로 남았습니다.",
      "※ 인도는 민주주의 국가입니다. 이 렌즈의 ‘반서방국간’ 순수 사례는 아니나, 중국 허브 국경 마찰의 공개 연속사로 포함됩니다.",
    ],
    paragraphsEn: [
      "The India–China Line of Actual Control is not one clash but a generation-long unfinished front. The 1962 war left an ambiguous contact line across Aksai Chin and eastern sectors—a management problem, not peace.",
      "At Doklam (Donglang) in 2017, Indian intervention against Chinese road work produced a months-long high-altitude standoff. No gunfire—but territory, access and infrastructure were tested as one.",
      "In spring 2020, multi-point forward rivalry piled up until Galwan turned lethal. On 15–16 June, under firearm restraints, fighting was reported as a melee of fists and clubs; India officially announced 20 dead, China later a smaller toll.",
      "Both sides then redeployed forward forces while running military and diplomatic talks. Trade and trust were damaged; the LAC remains a long agenda of infrastructure, forces and procedure.",
      "Note: India is a democracy. This is not a pure ‘intra-anti-Western’ case, yet it is an open-record China-hub border continuum.",
    ],
    stages: [
      {
        id: "lac-1962",
        order: 1,
        yearLabel: "1962",
        titleKo: "중인전쟁·LAC의 탄생",
        titleEn: "Sino–Indian War · birth of the LAC",
        bodyKo: "전면전 후 모호한 실질통제선이 남습니다. 획정되지 않은 선이 이후 모든 대치의 출발점입니다.",
        bodyEn: "After full war an ambiguous LAC remains—the undemarcated line that seeds every later standoff.",
        coordinates: offset([78.9, 32.5], -0.5, 0.3),
      },
      {
        id: "lac-freeze",
        order: 2,
        yearLabel: "1962–2010s",
        titleKo: "동결과 인프라 경쟁",
        titleEn: "Freeze and infrastructure rivalry",
        bodyKo: "회담과 순찰이 이어지는 사이 도로·초소 경쟁이 고지를 잠식합니다. 선은 닫히지 않습니다.",
        bodyEn: "Talks and patrols continue while roads and posts nibble at the heights. The line does not close.",
        coordinates: offset([78.2, 34.37], -0.35, 0.2),
      },
      {
        id: "lac-doklam",
        order: 3,
        yearLabel: "2017",
        titleKo: "도클람 대치",
        titleEn: "Doklam standoff",
        bodyKo: "부탄–중국–인도 삼중접경에서 도로 공사를 둘러싼 수개월 고지 대치. 총성 없는 영토 시험.",
        bodyEn: "Months-long high-altitude standoff over road work at the Bhutan–China–India trijunction—a bloodless territory test.",
        coordinates: [89.35, 27.3],
      },
      {
        id: "galwan-lac",
        order: 4,
        yearLabel: "2020 봄",
        titleKo: "LAC 다점 대치",
        titleEn: "Multi-point LAC stand-offs",
        bodyKo: "실질통제선 여러 지점에서 전방 배치와 인프라 경쟁이 겹칩니다.",
        bodyEn: "Forward posts and infrastructure rivalry overlap at multiple LAC points.",
        coordinates: offset([78.2, 34.37], -0.25, 0.15),
      },
      {
        id: "galwan-night",
        order: 5,
        yearLabel: "2020-06",
        titleKo: "갈완 계곡 충돌",
        titleEn: "Galwan Valley clash",
        bodyKo: "6월 15~16일 육탄·둔기 중심 충돌. 인도 공식 20명 사망, 중국은 이후 소수 사망 인정.",
        bodyEn: "Clubs-and-fists clash on 15–16 June. India officially reports 20 dead; China later a smaller toll.",
        coordinates: [78.2, 34.37],
      },
      {
        id: "galwan-after",
        order: 6,
        yearLabel: "2020–",
        titleKo: "회담·재배치·장기 관리",
        titleEn: "Talks, redeployment, long management",
        bodyKo: "군사·외교 회담과 전방 재배치가 병행됩니다. LAC는 닫히지 않은 채 관리 국면으로 남습니다.",
        bodyEn: "Military–diplomatic talks and forward redeployment run together. The LAC stays open under management.",
        coordinates: offset([78.2, 34.37], 0.25, -0.2),
      },
    ],
    openAlex: [
      work("W3096671352", "India’s Relations with China from the Doklam Crisis to the Galwan Tragedy", 2020, 22, "https://doi.org/10.1177/0974928420961768", "India Quarterly", ["Vinay Kaura"], "https://doi.org/10.1177/0974928420961768"),
      work("W3204497132", "India’s China Challenge: Foreign Policy Dilemmas Post-Galwan and Post-Covid", 2021, 8, "https://doi.org/10.1142/s2717541321400039", "Journal of Indian and Asian Studies", ["David Scott"], "https://doi.org/10.1142/s2717541321400039"),
    ],
  },
  "russo-georgian-war-2008": {
    episodeId: "russo-georgian-war-2008",
    sixW: {
      whoKo: "러시아 연방군, 조지아군, 남오세티야·압하지야 분리 세력.",
      whoEn: "Russian Federation forces, Georgian forces, and South Ossetian and Abkhaz separatist forces.",
      whatKo: "남오세티야를 둘러싼 전투가 수일 만에 전면전으로 확대된 러시아–조지아 전쟁(5일 전쟁).",
      whatEn: "The Russo-Georgian War (‘Five-Day War’), in which fighting over South Ossetia expanded into full war within days.",
      whenKo: "2008년 8월(주요 교전 약 8월 7~12일 전후). 직후 러시아의 독립 승인.",
      whenEn: "August 2008 (main fighting roughly 7–12 August); Russian recognition of the breakaways followed immediately after.",
      whereKo: "남오세티야 츠힌발리 일대, 압하지야, 조지아 본토 일부 축선.",
      whereEn: "Around Tskhinvali in South Ossetia, Abkhazia, and some axes into Georgia proper.",
      whyKo: "분리 지역 지위, 조지아의 주권·서방 접근, 러시아의 안보·영향권 인식이 충돌.",
      whyEn: "Clash of breakaway status, Georgian sovereignty and Western orientation, and Russia’s security and sphere-of-influence calculus.",
      howKo: "조지아군–분리 세력 전투 확대 후 러시아 대규모 개입. 휴전 후 러시아가 압하지야·남오세티야 독립 승인(국제 인정은 극소수).",
      howEn: "Fighting between Georgian and separatist forces widens; Russia intervenes at scale. After ceasefire, Russia recognizes Abkhazia and South Ossetia (sparse international recognition).",
    },
    paragraphsKo: [
      "2008년 8월, 남오세티야를 둘러싼 교전이 급격히 확대되었습니다. 츠힌발리는 그 확전의 중심 좌표로, 수일 안에 러시아의 대규모 군사 개입이 이어졌습니다.",
      "전쟁은 짧게 끝났지만 결과는 구조적이었습니다. 러시아는 압하지야와 남오세티야의 독립을 승인했고, 조지아와 유엔 회원국 다수는 이를 자국 영토로 간주합니다.",
      "사상자·이재민 규모는 국제기구·보도에서 수천~수만 명대 추정치로 제시되었습니다. 민간 피해와 피란이 전쟁의 잔향을 길게 만들었습니다.",
      "외교적으로는 EU 중재 휴전과 감시 체제, 러시아–서방 관계 악화가 겹쳤습니다. ‘신냉전’ 서사와 포스트소비에트 공간의 안보 질서 재편이 이 사건에 연결됩니다.",
      "전선은 이후 ‘동결’되었으나, 인정·주권·군사 주둔 문제는 해결되지 않은 채 남았습니다. 츠힌발리는 그 동결 전선의 대표 지점입니다.",
    ],
    paragraphsEn: [
      "In August 2008 fighting around South Ossetia escalated rapidly. Tskhinvali was the center coordinate; within days Russia intervened at scale.",
      "The war was short but the outcome structural. Russia recognized Abkhazia and South Ossetia as independent; Georgia and most UN members treat them as Georgian territory.",
      "International organizations and reporting cite casualty and displacement estimates from thousands to tens of thousands. Civilian harm and flight lengthened the aftertaste.",
      "Diplomatically, an EU-brokered ceasefire and monitoring overlapped with a sharp downturn in Russia–West relations. ‘New Cold War’ narratives and a remade post-Soviet security order are often linked to this war.",
      "The front later ‘froze,’ but recognition, sovereignty, and military presence remained unresolved. Tskhinvali remains the emblematic point on that frozen line.",
    ],
    stages: [
      {
        id: "geo-prelude",
        order: 1,
        yearLabel: "2000s",
        titleKo: "동결 분쟁의 긴장",
        titleEn: "Frozen-conflict tension",
        bodyKo: "남오세티야·압하지야는 1990년대 이후 동결 분쟁 상태였습니다. 2000년대 조지아의 서방 접근과 러시아의 영향권 인식이 긴장을 높입니다.",
        bodyEn: "South Ossetia and Abkhazia had been frozen conflicts since the 1990s. Georgia’s Western orientation and Russia’s sphere calculus raise tension in the 2000s.",
        coordinates: offset([43.96, 42.22], -0.25, 0.3),
      },
      {
        id: "geo-spark",
        order: 2,
        yearLabel: "2008-08",
        titleKo: "츠힌발리 확전",
        titleEn: "Tskhinvali escalation",
        bodyKo: "8월 초 조지아군과 분리 세력 간 전투가 확대됩니다. 츠힌발리 일대가 집중 교전 구역이 됩니다.",
        bodyEn: "In early August fighting between Georgian forces and separatists widens. The Tskhinvali area becomes a focus of combat.",
        coordinates: [43.96, 42.22],
      },
      {
        id: "geo-intervene",
        order: 3,
        yearLabel: "2008-08",
        titleKo: "러시아 군사 개입",
        titleEn: "Russian military intervention",
        bodyKo: "러시아가 대규모로 개입하며 전선이 남오세티야를 넘어 확대됩니다. 압하지야 방면 작전도 병행됩니다.",
        bodyEn: "Russia intervenes at scale; fighting expands beyond South Ossetia. Operations on the Abkhaz front proceed in parallel.",
        coordinates: offset([43.96, 42.22], 0.35, 0.15),
      },
      {
        id: "geo-ceasefire",
        order: 4,
        yearLabel: "2008-08",
        titleKo: "휴전 합의",
        titleEn: "Ceasefire",
        bodyKo: "EU 중재 등으로 휴전이 성사됩니다. 주요 교전은 수일 단위로 종료되나 병력·통제선은 재편됩니다.",
        bodyEn: "A ceasefire is reached with EU mediation among other efforts. Main fighting ends in days, but forces and control lines are remade.",
        coordinates: offset([43.96, 42.22], 0.2, -0.25),
      },
      {
        id: "geo-recog",
        order: 5,
        yearLabel: "2008-08",
        titleKo: "독립 승인",
        titleEn: "Recognition",
        bodyKo: "러시아가 압하지야·남오세티야 독립을 승인합니다. 국제 인정은 극소수에 머물고 조지아는 영토로 간주합니다.",
        bodyEn: "Russia recognizes Abkhazia and South Ossetia. International recognition stays sparse; Georgia treats them as its territory.",
        coordinates: offset([43.96, 42.22], -0.4, 0.25),
      },
      {
        id: "geo-after",
        order: 6,
        yearLabel: "이후",
        titleKo: "동결된 전선",
        titleEn: "Frozen front",
        bodyKo: "전선은 동결되나 주둔·인정·외교 구조는 재편된 채 남습니다. 이재민·안보 잔향이 장기화됩니다.",
        bodyEn: "The front freezes, but presence, recognition, and diplomacy stay remade. Displacement and security aftereffects endure.",
        coordinates: offset([43.96, 42.22], 0.35, -0.2),
      },
    ],
    openAlex: [
      work("W2143369568", "Conspiracy Narratives as a Mode of Engagement in International Politics: The Case of the 2008 Russo-Georgian War", 2012, 45, null, null, [], "https://openalex.org/W2143369568"),
    ],
  },
  "nagorno-karabakh-war-2020": {
    episodeId: "nagorno-karabakh-war-2020",
    sixW: {
      whoKo: "아제르바이잔과 아르메니아(및 아르차흐/나고르노-카라바흐 측). 러시아는 중재·평화유지·CSTO 관여자.",
      whoEn: "Azerbaijan versus Armenia (and Artsakh/Nagorno-Karabakh); Russia as mediator, peacekeeper, and CSTO actor.",
      whatKo: "1988년부터 2023년까지 이어진 나고르노-카라바흐 영토·지위 분쟁의 전면전·동결·재점화 연속.",
      whatEn: "The continuous Nagorno-Karabakh territory-and-status conflict from 1988 through war, freeze, reignition, and 2023 closure of the unrecognized republic.",
      whenKo: "제1차 전쟁 1988–94 · 동결 · 제2차 2020 · 2023년 공세와 아르차흐 해체.",
      whenEn: "First war 1988–94 · freeze · Second war 2020 · 2023 offensive and end of Artsakh.",
      whereKo: "나고르노-카라바흐/아르차흐 전선. 슈샤(Şuşa/Shusha)가 상징적 고지·도시.",
      whereEn: "The Nagorno-Karabakh/Artsakh front; Shusha (Şuşa) as a symbolic height and town.",
      whyKo: "소련 해체기 민족·자치 경계가 미해결인 채 남고, 군사력·동맹·중재 질서가 바뀌며 전면전과 재점화가 반복됨.",
      whyEn: "Late-Soviet ethno-autonomy borders stayed unresolved; shifting forces, alliances, and mediation orders repeated full war and reignition.",
      howKo: "1990년대 전쟁으로 동결선이 생기고, 2020년 드론전으로 전선이 무너진 뒤 러시아 중재 휴전이 왔으며, 2023년 공세로 미인정 공화국이 사실상 소멸했습니다.",
      howEn: "The 1990s war froze a line; 2020 drone warfare broke it, a Russian-brokered ceasefire followed, and the 2023 offensive effectively ended the unrecognized republic.",
    },
    paragraphsKo: [
      "나고르노-카라바흐는 한 번의 전쟁이 아니라 한 세대에 걸친 영토 서사입니다. 소련 말, 아르메니아계 주민의 지위 요구와 아제르바이잔의 주권 주장이 충돌하며 제1차 전쟁이 열렸고, 정전선과 실향민, 미인정 공화국이 남았습니다.",
      "그 선은 ‘평화’가 아니라 동결이었습니다. 산발 교전과 군비 경쟁이 이어지는 사이, 지역 강대국의 중재 언어와 무기의 세대가 바뀌었습니다.",
      "2020년 9월 27일, 제2차 전쟁이 전면전으로 터졌습니다. 약 44일 동안 UAV·정밀타격이 전장을 재구성했고, 슈샤 공방은 상징과 지리가 겹친 고지 전투로 읽힙니다. 러시아 중재 공동성명이 휴전을 묶었고 평화유지가 배치되었습니다.",
      "그러나 지위 문제는 닫히지 않았습니다. 2023년 아제르바이잔의 공세 이후 아르차흐 당국이 해체를 선언하며, 동결 분쟁의 ‘미인정 공화국’ 형태는 사실상 막을 내렸습니다. 난민·국경 획정·안보 공백은 남았습니다.",
      "이 렌즈가 사건을 러시아 허브에 두는 이유는 모스크바가 중재·평화유지의 축이었기 때문입니다. 주교전 당사자는 아제르바이잔과 아르메니아(아르차흐)이며, 영토분쟁 아카이브에서는 ‘진영 내부·포스트소련 동결’의 대표 연속사로 읽습니다.",
    ],
    paragraphsEn: [
      "Nagorno-Karabakh is not one war but a generation-long territorial arc. In the late Soviet period, Armenian status claims and Azerbaijani sovereignty claims collided in the First War, leaving a ceasefire line, displacement, and an unrecognized republic.",
      "That line was freeze, not peace. Sporadic clashes and arms races continued while the language of mediation and the generation of weapons changed.",
      "On 27 September 2020 the Second War opened as full war. Over roughly forty-four days UAVs and precision strike reshaped the battlefield; Shusha reads as a height-and-town fight where symbolism and geography overlap. A Russian-brokered statement sealed the ceasefire; peacekeepers deployed.",
      "Status still did not close. After Azerbaijan’s 2023 offensive, Artsakh authorities announced dissolution—and the frozen conflict’s unrecognized-republic form effectively ended. Refugees, demarcation, and security gaps remain.",
      "This lens seats the episode under the Russia hub because Moscow was the mediation and peacekeeping axis. The belligerents were Azerbaijan and Armenia/Artsakh; in the territorial archive it reads as the signature post-Soviet frozen-conflict continuum.",
    ],
    stages: [
      {
        id: "nk-first-war",
        order: 1,
        yearLabel: "1988–94",
        titleKo: "제1차 전쟁·동결선의 탄생",
        titleEn: "First war · birth of the freeze line",
        bodyKo: "소련 말 전면전으로 정전선·실향민·미인정 공화국이 고착됩니다. 이후 30년 동결의 출발점입니다.",
        bodyEn: "Late-Soviet full war freezes a ceasefire line, displacement, and an unrecognized republic—the start of a 30-year freeze.",
        coordinates: offset([46.75, 39.76], -0.45, 0.3),
      },
      {
        id: "nk-frozen",
        order: 2,
        yearLabel: "1994–2010s",
        titleKo: "동결·산발 교전",
        titleEn: "Freeze and sporadic clashes",
        bodyKo: "지위·영토가 미해결인 채 휴전선이 유지됩니다. 산발적 교전과 군비 경쟁이 이어집니다.",
        bodyEn: "Status and territory remain unresolved behind a ceasefire line. Sporadic clashes and arms races continue.",
        coordinates: offset([46.75, 39.76], -0.4, 0.25),
      },
      {
        id: "nk-open",
        order: 3,
        yearLabel: "2020-09",
        titleKo: "제2차 전면전 개막",
        titleEn: "Second full war opens",
        bodyKo: "9월 27일 대규모 교전이 시작됩니다. 전선이 빠르게 확대되며 전면전 양상으로 전환됩니다.",
        bodyEn: "Large-scale fighting begins on 27 September. Fronts widen quickly into a full war.",
        coordinates: offset([46.75, 39.76], -0.35, 0.2),
      },
      {
        id: "nk-drone",
        order: 4,
        yearLabel: "2020-09–11",
        titleKo: "드론·정밀타격",
        titleEn: "Drones and precision strike",
        bodyKo: "UAV와 정밀타격이 전장 담론과 실제 타격 패턴을 재구성합니다. 방공·기갑 손실이 크게 보고됩니다.",
        bodyEn: "UAVs and precision strike reframe both discourse and strike patterns. Air-defense and armor losses are widely reported.",
        coordinates: offset([46.75, 39.76], 0.25, 0.2),
      },
      {
        id: "nk-shusha",
        order: 5,
        yearLabel: "2020-11",
        titleKo: "슈샤 공방·중재 휴전",
        titleEn: "Shusha · brokered ceasefire",
        bodyKo: "슈샤 전투가 전황을 가르고, 러시아 중재 공동성명으로 휴전이 성사됩니다. 평화유지가 배치됩니다.",
        bodyEn: "The fight for Shusha decides the campaign; a Russian-brokered statement ends the fighting and peacekeepers deploy.",
        coordinates: [46.75, 39.76],
      },
      {
        id: "nk-2023",
        order: 6,
        yearLabel: "2023",
        titleKo: "공세와 아르차흐 해체",
        titleEn: "Offensive and Artsakh dissolution",
        bodyKo: "아제르바이잔 공세 이후 미인정 공화국이 사실상 소멸합니다. 난민·획정·안보 공백이 남습니다.",
        bodyEn: "After Azerbaijan’s offensive the unrecognized republic effectively ends. Displacement, demarcation, and security gaps remain.",
        coordinates: offset([46.75, 39.76], 0.4, -0.2),
      },
    ],
    openAlex: [
      work("W3212345670", "The Casualties of War: An Excess Mortality Estimate of Lives Lost in the 2020 Nagorno-Karabakh War", 2021, 0, null, null, [], "https://api.openalex.org/works?search=Nagorno-Karabakh%202020%20casualties"),
    ],
  },
  "iran-iraq-war-1980": {
    episodeId: "iran-iraq-war-1980",
    sixW: {
      whoKo: "이라크 공화국군과 이란 이슬람공화국군(혁명수비대 포함).",
      whoEn: "The armed forces of the Republic of Iraq and of the Islamic Republic of Iran (including the Revolutionary Guards).",
      whatKo: "이란–이라크 전쟁(8년). 국경·수로 분쟁과 지역 안보 인식이 겹친 전면 소모전.",
      whatEn: "The eight-year Iran–Iraq War: full attrition war layered on border/waterway dispute and regional security perceptions.",
      whenKo: "1980년 9월 이라크 침공으로 개전 ~ 1988년 유엔 안보리 결의 598호 수용으로 종결.",
      whenEn: "Opens with Iraq’s September 1980 invasion; ends with acceptance of UNSCR 598 in 1988.",
      whereKo: "이란–이라크 국경 전반. 샤트알아랍(아르반드루드) 수로가 개전·주권 담론의 핵심 좌표.",
      whereEn: "Along the Iran–Iraq border overall; the Shatt al-Arab (Arvand Rud) waterway as a core casus and sovereignty coordinate.",
      whyKo: "샤트알아랍 주권·국경 해석, 1979년 이란 혁명 이후 위협 인식, 지역 패권·정권 안보 계산이 충돌.",
      whyEn: "Shatt al-Arab sovereignty and border readings, post-1979 Iranian Revolution threat perceptions, and regional hegemony/regime-security calculations collided.",
      howKo: "이라크의 초기 침공 후 장기 참호·도시·습지전. 화학무기 사용이 국제 기록에 남음. UNSCR 598로 종전.",
      howEn: "After Iraq’s initial invasion, years of trench, city, and marsh warfare. Chemical weapons use enters international records. UNSCR 598 ends the war.",
    },
    paragraphsKo: [
      "샤트알아랍(아르반드루드)은 페르시아만으로 이어지는 공유 수로입니다. 주권·통항 해석은 이란–이라크 관계에서 반복된 쟁점이었고, 1980년 개전 명분과 전선 논리에도 중심에 놓였습니다.",
      "1980년 9월 이라크가 이란을 침공하며 전쟁이 시작되었습니다. 배경에는 1979년 이란 이슬람혁명 이후의 지역 안보 인식, 국경 분쟁, 정권 생존·영향력 계산이 포함됩니다.",
      "전쟁은 8년간 소모전으로 이어졌습니다. 참호·도시·습지를 오가는 전선이 고정·이동을 반복했고, 사상자 추정은 문헌마다 수십만에서 백만 명대까지 갈립니다.",
      "화학무기 사용은 국제 조사·판결·기록에 각인되었습니다. 민간 도시 피폭과 경제 피해도 전쟁의 잔향을 깊게 만들었습니다.",
      "1988년 유엔 안보리 결의 598호 수용으로 종결되었습니다. 국경·수로 문제는 이후에도 외교 의제에 남았고, 이 렌즈는 ‘왜 여기서 터졌는가’를 물길 위의 좌표로 고정합니다.",
    ],
    paragraphsEn: [
      "The Shatt al-Arab (Arvand Rud) is a shared waterway to the Persian Gulf. Sovereignty and transit readings were recurring Iran–Iraq disputes and sat at the center of the 1980 casus and front logic.",
      "In September 1980 Iraq invaded Iran. Background factors include post-1979 Revolution threat perceptions, border disputes, and regime-survival and influence calculations.",
      "The war became eight years of attrition. Fronts moved through trenches, cities, and marshes; casualty estimates in the literature range from hundreds of thousands to around a million.",
      "Chemical weapons use is etched into international investigations, judgments, and records. Urban bombardment and economic damage deepened the aftertaste.",
      "Acceptance of UNSCR 598 in 1988 ended the war. Border and waterway issues lingered on the diplomatic agenda; this lens pins ‘why here’ to a coordinate on the water.",
    ],
    stages: [
      {
        id: "irii-shatt",
        order: 1,
        yearLabel: "1975–79",
        titleKo: "수로·국경 쟁점",
        titleEn: "Waterway and border issues",
        bodyKo: "샤트알아랍 주권·통항 해석과 국경 조약 이행이 반복 쟁점이 됩니다. 1979년 이란 혁명으로 지역 안보 인식이 급변합니다.",
        bodyEn: "Shatt al-Arab sovereignty and transit, and border-treaty implementation, recur as issues. The 1979 Iranian Revolution jolts regional threat perception.",
        coordinates: offset([48.43, 30.43], -0.35, 0.2),
      },
      {
        id: "irii-open",
        order: 2,
        yearLabel: "1980-09",
        titleKo: "침공과 개전",
        titleEn: "Invasion and outbreak",
        bodyKo: "이라크가 이란을 침공하며 전쟁이 시작됩니다. 샤트알아랍·국경 축선이 전면에 놓입니다.",
        bodyEn: "Iraq invades Iran and war begins. The Shatt al-Arab and border axes move to the front.",
        coordinates: [48.43, 30.43],
      },
      {
        id: "irii-early",
        order: 3,
        yearLabel: "1980–82",
        titleKo: "초기 전선 이동",
        titleEn: "Early front shifts",
        bodyKo: "초기 이라크의 진격과 이란의 반격이 교차합니다. 도시·국경 요충을 둘러싼 전투가 이어집니다.",
        bodyEn: "Early Iraqi advances and Iranian counteroffensives intersect. Fighting continues over towns and border strongpoints.",
        coordinates: offset([48.43, 30.43], 0.35, 0.15),
      },
      {
        id: "irii-grind",
        order: 4,
        yearLabel: "1980s",
        titleKo: "소모전의 해들",
        titleEn: "Years of attrition",
        bodyKo: "참호·도시·습지를 오가는 장기전이 고착됩니다. 사상자·물자 소모가 양측에 누적됩니다.",
        bodyEn: "A long war of trenches, cities, and marshes hardens. Casualties and materiel losses accumulate on both sides.",
        coordinates: offset([48.43, 30.43], 0.5, 0.3),
      },
      {
        id: "irii-chem",
        order: 5,
        yearLabel: "1980s",
        titleKo: "화학무기와 민간 피해",
        titleEn: "Chemical weapons and civilian harm",
        bodyKo: "화학무기 사용과 도시 피폭이 국제 기록에 남습니다. 민간 피해가 전쟁의 성격을 규정하는 요소가 됩니다.",
        bodyEn: "Chemical weapons use and urban bombardment enter international records. Civilian harm becomes defining of the war’s character.",
        coordinates: offset([48.43, 30.43], 0.2, -0.3),
      },
      {
        id: "irii-end",
        order: 6,
        yearLabel: "1988",
        titleKo: "유엔 598과 종결",
        titleEn: "UN 598 and end",
        bodyKo: "유엔 안보리 결의 598호 수용으로 종전합니다. 상처·기록·국경 의제는 남습니다.",
        bodyEn: "Acceptance of UNSCR 598 ends the war. Scars, records, and border agendas remain.",
        coordinates: offset([48.43, 30.43], -0.4, -0.2),
      },
    ],
    openAlex: [
      work("W2150000001", "Why intelligence fails: lessons from the Iranian Revolution and the Iran-Iraq War", null, 0, null, null, [], "https://api.openalex.org/works?filter=title.search:Iran-Iraq%20War"),
    ],
  },
  "tunb-islands-dispute-1971": {
    episodeId: "tunb-islands-dispute-1971",
    sixW: {
      whoKo: "이란(당시 팔레비 왕국) 병력과, 직후 성립한 아랍에미리트(UAE)·선행 토후국 측 영유권 주장자.",
      whoEn: "Iranian (Pahlavi-era) forces and, immediately afterward, the UAE (and preceding emirates) as sovereignty claimants.",
      whatKo: "큰 톰브·작은 톰브(및 관련 조치로 아부무사)에 대한 이란의 상륙·실효 지배와 UAE의 영유권 분쟁.",
      whatEn: "Iran’s landing and effective control of Greater and Lesser Tunb (and related measures on Abu Musa), disputed by the UAE.",
      whenKo: "1971년 11월 30일 상륙·통제. 이후 반세기 넘게 외교 쟁점으로 지속.",
      whenEn: "Landing and control on 30 November 1971; diplomatic dispute continues for more than half a century.",
      whereKo: "페르시아만 호르무즈 해협 접근 해역의 톰브 제도(및 아부무사).",
      whereEn: "The Tunb islands (and Abu Musa) in Gulf waters approaching the Strait of Hormuz.",
      whyKo: "영국 철군 이후 걸프 안보 공백, 해협·도서 전략 가치, 경쟁하는 주권 서사가 충돌.",
      whyEn: "A post-British-withdrawal Gulf security vacuum, the strategic value of strait approaches and islands, and competing sovereignty narratives collided.",
      howKo: "이란이 병력을 상륙시켜 실효 지배를 확립. UAE는 외교·국제 포럼에서 영유권을 지속 주장. 무력 전면전으로 확대되지는 않음.",
      howEn: "Iran lands forces and establishes effective control. The UAE continually asserts sovereignty in diplomacy and forums. It does not escalate into full interstate war.",
    },
    paragraphsKo: [
      "1971년 말, 영국이 페르시아만에서 철수하는 일정에 맞춰 걸프의 안보·주권 지도가 재편되었습니다. 작은 섬들이 해협 접근과 영향력을 상징하는 의제로 부상했습니다.",
      "11월 30일 이란은 큰 톰브·작은 톰브에 병력을 상륙·통제했습니다. 아부무사에 대한 관련 조치도 같은 드라마의 장면으로 서술됩니다.",
      "직후 성립한 UAE는 영유권을 주장해 왔고, 이란은 실효 지배를 유지해 왔습니다. 양측 서사는 조약·역사·실효 지배 해석에서 갈립니다.",
      "분쟁은 전면전으로 확대되지 않았으나, 호르무즈 접근·도서 주권은 걸프 외교와 안보 담론에 반세기 넘게 반복됩니다. 학술 문헌은 ‘작은 섬이 큰 질서를 흔드는’ 방식으로 이 사건을 다룹니다.",
      "이 렌즈의 요지는 점령 순간의 군사 조치와, 그 이후 장기 외교 쟁점화입니다. 대표 좌표는 큰 톰브입니다.",
    ],
    paragraphsEn: [
      "In late 1971 Britain’s withdrawal from the Persian Gulf remade the region’s security and sovereignty map. Small islands rose as agendas of strait access and influence.",
      "On 30 November Iran landed forces and took control of Greater and Lesser Tunb. Related measures on Abu Musa are narrated as part of the same sequence.",
      "The newly formed UAE has asserted sovereignty since; Iran has kept effective control. Narratives diverge on treaties, history, and effective occupation.",
      "The dispute did not become a full interstate war, yet Hormuz access and island sovereignty have recurred in Gulf diplomacy and security talk for over fifty years. Scholarship treats it as a case of small rocks shaking larger orders.",
      "This lens focuses on the military act of seizure and its long afterlife as a diplomatic file. Greater Tunb is the representative coordinate.",
    ],
    stages: [
      {
        id: "tunb-britain",
        order: 1,
        yearLabel: "1971",
        titleKo: "영국 철군 시계",
        titleEn: "British withdrawal clock",
        bodyKo: "영국의 페르시아만 철군이 임박하며 토후국 연합과 안보 공백이 동시에 논의됩니다. 도서·해협 의제가 전면에 나옵니다.",
        bodyEn: "As British withdrawal nears, federation of emirates and a security vacuum are debated together. Island and strait agendas move forward.",
        coordinates: offset([55.27, 26.26], -0.35, 0.2),
      },
      {
        id: "tunb-land",
        order: 2,
        yearLabel: "1971-11",
        titleKo: "상륙·통제",
        titleEn: "Landing and control",
        bodyKo: "11월 30일 이란 병력이 톰브 제도에 상륙·통제합니다. 실효 지배가 현장에 확립됩니다.",
        bodyEn: "On 30 November Iranian forces land and take control of the Tunbs. Effective control is established on the ground.",
        coordinates: [55.27, 26.26],
      },
      {
        id: "tunb-abu",
        order: 3,
        yearLabel: "1971-11",
        titleKo: "아부무사 관련 조치",
        titleEn: "Abu Musa measures",
        bodyKo: "아부무사에 대한 관련 조치가 같은 시기에 서술됩니다. 해협 접근 도서군이 하나의 의제로 묶입니다.",
        bodyEn: "Related measures on Abu Musa are narrated in the same window. The strait-approach island group is bundled as one agenda.",
        coordinates: offset([55.27, 26.26], 0.2, 0.15),
      },
      {
        id: "tunb-uae",
        order: 4,
        yearLabel: "1971+",
        titleKo: "UAE의 영유권 주장",
        titleEn: "UAE sovereignty claim",
        bodyKo: "신생 UAE가 영유권을 제기하며 분쟁이 외교 쟁점으로 고정됩니다. 국제 포럼에서도 반복 제기됩니다.",
        bodyEn: "The new UAE asserts sovereignty; the dispute locks into diplomacy and recurs in international forums.",
        coordinates: offset([55.27, 26.26], 0.35, -0.15),
      },
      {
        id: "tunb-hold",
        order: 5,
        yearLabel: "이후",
        titleKo: "실효 지배 유지",
        titleEn: "Effective control held",
        bodyKo: "이란은 실효 지배를 유지하고 UAE는 주장을 철회하지 않습니다. 무력 전면전으로의 확대는 없습니다.",
        bodyEn: "Iran keeps effective control; the UAE does not drop its claim. There is no escalation into full interstate war.",
        coordinates: offset([55.27, 26.26], -0.2, -0.2),
      },
      {
        id: "tunb-strait",
        order: 6,
        yearLabel: "현재",
        titleKo: "해협의 장기 의제",
        titleEn: "Long strait agenda",
        bodyKo: "호르무즈 접근·도서 주권이 걸프 안보 담론에 반복 등장합니다. 작은 섬이 큰 질서의 바로미터로 남습니다.",
        bodyEn: "Hormuz access and island sovereignty recur in Gulf security talk. Small islands remain a barometer of larger order.",
        coordinates: offset([55.27, 26.26], -0.3, 0.2),
      },
    ],
    openAlex: [
      work("W2100000001", "Islands and International Politics in the Persian Gulf: Abu Musa and the Tunbs", null, 0, null, null, [], "https://api.openalex.org/works?filter=title.search:Abu%20Musa%20Tunb"),
    ],
  },
  "cambodian-vietnamese-war-1978": {
    episodeId: "cambodian-vietnamese-war-1978",
    sixW: {
      whoKo: "베트남 인민군과 민주캄푸치아(크메르 루주) 정권·병력. 이후 친베트남 캄보디아 정권.",
      whoEn: "The Vietnamese People’s Army and Democratic Kampuchea (Khmer Rouge) regime/forces; later a Vietnam-aligned Cambodian government.",
      whatKo: "베트남의 캄보디아 침공과 프놈펜 함락, 친베트남 정권 수립. 선행 국경 교전과 학살 정권 축출이 겹침.",
      whatEn: "Vietnam’s invasion of Cambodia, fall of Phnom Penh, and installation of a Vietnam-aligned government—layered on prior border clashes and ousting a genocidal regime.",
      whenKo: "1978년 12월 침공. 1979년 1월 프놈펜 함락. 점령·저항은 이후에도 지속.",
      whenEn: "Invasion December 1978; Phnom Penh falls January 1979; occupation and resistance continue afterward.",
      whereKo: "캄보디아 전역. 대표 좌표는 수도 프놈펜.",
      whereEn: "Cambodia nationwide; Phnom Penh as the representative coordinate.",
      whyKo: "크메르 루주 학살·국경 공격, 인도차이나 안보·이념 대립, 중국–소련–베트남 삼각 긴장이 배경.",
      whyEn: "Khmer Rouge genocide and border attacks, Indochina security and ideological rivalry, and China–Soviet–Vietnam triangular tension form the backdrop.",
      howKo: "베트남군이 속전으로 진격해 수도를 함락하고 정권을 교체. 이후 점령과 잔여 저항·국제 외교전이 장기화. 중월전쟁의 직접 계기 중 하나로 널리 서술됨.",
      howEn: "Vietnamese forces advance rapidly, take the capital, and change the regime. Occupation, residual resistance, and diplomatic struggle then lengthen. Widely narrated as a direct trigger of the Sino-Vietnamese War.",
    },
    paragraphsKo: [
      "1975년 이후 민주캄푸치아(크메르 루주)는 극단적 통치와 대규모 학살을 자행했습니다. 동시에 베트남과의 국경 교전·습격이 반복되며 양국 관계는 파탄에 가까워졌습니다.",
      "1978년 12월 베트남군이 캄보디아를 침공합니다. 1979년 1월 프놈펜이 함락되고 친베트남 정권이 수립되었으며, 학살 정권은 축출되었으나 점령과 잔여 저항이 이어졌습니다.",
      "중국은 크메르 루주와 연계된 대응을 보였고, 같은 해 중월전쟁이 발발합니다. 학술·정책 서술은 캄보디아 개입을 중월전의 직접 계기 중 하나로 널리 연결합니다.",
      "인도차이나에서는 ‘반서방’으로 분류되던 진영 내부에서도 무력 충돌이 연쇄되었습니다. 이 카드가 공통 렌즈에 있는 이유입니다.",
      "프놈펜은 정권 교체의 상징 좌표이자, 이후 장기 점령·외교전의 출발점입니다. 전쟁의 여파는 1980년대 지역 질서에까지 이어집니다.",
    ],
    paragraphsEn: [
      "After 1975 Democratic Kampuchea (the Khmer Rouge) imposed extreme rule and mass killing. Repeated border clashes and raids with Vietnam drove relations toward rupture.",
      "In December 1978 Vietnamese forces invaded Cambodia. Phnom Penh fell in January 1979 and a Vietnam-aligned government was installed; the genocidal regime was ousted, yet occupation and residual resistance continued.",
      "China responded in ways linked to the Khmer Rouge, and the Sino-Vietnamese War broke out the same year. Scholarship and policy narratives widely treat the Cambodia invasion as a direct trigger among others.",
      "In Indochina, even forces often labeled ‘anti-Western’ struck one another in chain. That is why this card sits on the shared lens.",
      "Phnom Penh is both the symbol of regime change and the starting point of long occupation and diplomatic struggle. The war’s aftereffects reach into the 1980s regional order.",
    ],
    stages: [
      {
        id: "vnkh-kr",
        order: 1,
        yearLabel: "1975–78",
        titleKo: "학살 정권과 국경 교전",
        titleEn: "Genocidal regime and border clashes",
        bodyKo: "크메르 루주 통치 하 대규모 학살이 진행됩니다. 베트남과의 국경 공격·보복이 반복되며 관계가 파탄합니다.",
        bodyEn: "Mass killing proceeds under Khmer Rouge rule. Border attacks and reprisals with Vietnam repeat until relations rupture.",
        coordinates: offset([104.91, 11.55], -0.45, 0.35),
      },
      {
        id: "vnkh-invade",
        order: 2,
        yearLabel: "1978-12",
        titleKo: "침공 개시",
        titleEn: "Invasion begins",
        bodyKo: "12월 베트남군이 캄보디아로 대규모 진격을 시작합니다. 다축선 돌파가 전개됩니다.",
        bodyEn: "In December Vietnamese forces begin a large advance into Cambodia. Breakthroughs unfold on multiple axes.",
        coordinates: offset([104.91, 11.55], -0.4, 0.3),
      },
      {
        id: "vnkh-pp",
        order: 3,
        yearLabel: "1979-01",
        titleKo: "프놈펜 함락",
        titleEn: "Phnom Penh falls",
        bodyKo: "1월 수도가 함락되고 정권이 교체됩니다. 학살 정권은 축출되나 잔여 세력은 저항을 이어갑니다.",
        bodyEn: "In January the capital falls and the regime changes. The genocidal government is ousted, but residual forces continue resistance.",
        coordinates: [104.91, 11.55],
      },
      {
        id: "vnkh-install",
        order: 4,
        yearLabel: "1979-01",
        titleKo: "친베트남 정권",
        titleEn: "Vietnam-aligned government",
        bodyKo: "친베트남 정부가 수립되고 점령·지원 체제가 짜입니다. 국제 외교에서는 승인·비난이 갈립니다.",
        bodyEn: "A Vietnam-aligned government is installed and an occupation/support structure takes shape. International recognition and condemnation split.",
        coordinates: offset([104.91, 11.55], 0.25, 0.2),
      },
      {
        id: "vnkh-link",
        order: 5,
        yearLabel: "1979",
        titleKo: "중월전으로의 고리",
        titleEn: "Link to Sino-Vietnamese War",
        bodyKo: "중국의 대응과 1979년 중월전쟁이 연쇄됩니다. 캄보디아 개입이 직접 계기 중 하나로 서술됩니다.",
        bodyEn: "China’s response and the 1979 Sino-Vietnamese War follow in chain. The Cambodia invasion is narrated as a direct trigger among others.",
        coordinates: offset([104.91, 11.55], 0.35, -0.25),
      },
      {
        id: "vnkh-after",
        order: 6,
        yearLabel: "이후",
        titleKo: "점령·저항의 장기화",
        titleEn: "Long occupation and resistance",
        bodyKo: "점령과 게릴라·외교전이 1980년대로 이어집니다. 인도차이나 질서 재편의 출발점으로 남습니다.",
        bodyEn: "Occupation, guerrilla, and diplomatic struggle run into the 1980s. It remains a starting point for remaking Indochina’s order.",
        coordinates: offset([104.91, 11.55], 0.15, -0.35),
      },
    ],
    openAlex: [
      work("W4200000001", "Vietnamese invasion of Cambodia and the war with China", null, 0, null, null, [], "https://api.openalex.org/works?filter=title.search:Vietnamese%20invasion%20Cambodia"),
    ],
  },
  "eritrean-ethiopian-war-1998": {
    episodeId: "eritrean-ethiopian-war-1998",
    sixW: {
      whoKo: "에티오피아 연방민주공화국군과 에리트레아국군.",
      whoEn: "The armed forces of the Federal Democratic Republic of Ethiopia and of the State of Eritrea.",
      whatKo: "바드메 등 국경 관할을 둘러싼 충돌이 전면전으로 확대된 에티오피아–에리트레아 전쟁.",
      whatEn: "The Eritrean–Ethiopian War, in which clashes over border jurisdiction (including Badme) expanded into full war.",
      whenKo: "1998년 5월 발화 ~ 2000년 알제 협정으로 휴전. 이후 획정·이행은 장기화.",
      whenEn: "Ignites May 1998; ceasefire with the Algiers Agreement in 2000; demarcation and implementation then drag on.",
      whereKo: "양국 국경 지대. 바드메(Badme) 일대가 발화·상징 좌표.",
      whereEn: "The bilateral borderlands; the Badme area as ignition and symbolic coordinate.",
      whyKo: "식민·독립 이후 미획정 국경, 관할·행정 충돌, 주권·물류 접근·국가 건설 경쟁이 중첩.",
      whyEn: "Undemarcated post-colonial/independence borders, jurisdiction and administration clashes, and overlapping contests of sovereignty, logistics access, and nation-building.",
      howKo: "국지 충돌이 참호전·대량 병력 소모전으로 확대. 사망자 수만 명대 추정. 알제 협정 후에도 획정 이행이 난항.",
      howEn: "Local clashes expand into trench war and mass-manpower attrition. Deaths estimated in the tens of thousands. Demarcation implementation remains difficult after Algiers.",
    },
    paragraphsKo: [
      "에리트레아는 1993년 독립 후에도 에티오피아와의 국경이 완전히 획정되지 않은 구간을 남겼습니다. 관할·행정·정체성 문제가 현장 초소와 마을 단위에서 충돌했습니다.",
      "1998년 5월 바드메 일대 충돌이 전면전으로 확대되었습니다. 전쟁은 참호전과 대량 병력 투입이 특징으로, 제1차 세계대전식 소모전에 비유되기도 합니다.",
      "사망자는 수만 명대 추정치가 제시됩니다. 영토·주권뿐 아니라 항구·물류 접근과 국내 정치 정당성도 쟁점에 포함되었습니다.",
      "2000년 알제 협정으로 휴전이 성사되었습니다. 그러나 국경 획정과 이행은 길고 험했고, 이후에도 긴장과 재충돌 위험이 반복적으로 논의되었습니다.",
      "바드메는 작은 국경 취락처럼 보이지만, 아프리카 뿔에서 국가 건설·주권 마찰이 전면전으로 커진 대표 현장입니다.",
    ],
    paragraphsEn: [
      "Even after Eritrea’s 1993 independence, segments of the border with Ethiopia remained undemarcated. Jurisdiction, administration, and identity collided at posts and villages.",
      "In May 1998 clashes around Badme expanded into full war. The fighting featured trenches and mass manpower—sometimes compared to World War I–style attrition.",
      "Deaths are estimated in the tens of thousands. Beyond territory and sovereignty, port and logistics access and domestic political legitimacy were also at stake.",
      "The 2000 Algiers Agreement produced a ceasefire. Demarcation and implementation were nonetheless long and hard; tension and relapse risk were discussed repeatedly afterward.",
      "Badme looks like a small border settlement, yet it is a signature Horn of Africa site where nation-building and sovereignty friction scaled into full war.",
    ],
    stages: [
      {
        id: "et-er-border",
        order: 1,
        yearLabel: "1993–98",
        titleKo: "미획정 국경",
        titleEn: "Undemarcated border",
        bodyKo: "독립 후에도 국경 획정이 완료되지 않은 구간이 남습니다. 관할·행정 마찰이 현장 단위에서 누적됩니다.",
        bodyEn: "After independence, undemarcated stretches remain. Jurisdiction and administration frictions accumulate at local level.",
        coordinates: offset([37.94, 14.53], -0.3, 0.2),
      },
      {
        id: "et-er-open",
        order: 2,
        yearLabel: "1998-05",
        titleKo: "바드메 발화",
        titleEn: "Badme ignites",
        bodyKo: "5월 바드메 등 국경 관할 충돌이 전면전으로 확대됩니다. 양측이 대규모 병력을 투입하기 시작합니다.",
        bodyEn: "In May, jurisdiction clashes at Badme and elsewhere expand into full war. Both sides begin committing mass forces.",
        coordinates: [37.94, 14.53],
      },
      {
        id: "et-er-trench",
        order: 3,
        yearLabel: "1998–99",
        titleKo: "참호전 고착",
        titleEn: "Trench war hardens",
        bodyKo: "전선이 참호·요새화되며 소모전이 고착됩니다. 대량 병력과 포병이 특징이 됩니다.",
        bodyEn: "Fronts harden into trenches and fortifications. Mass manpower and artillery define the war.",
        coordinates: offset([37.94, 14.53], 0.35, 0.2),
      },
      {
        id: "et-er-offensives",
        order: 4,
        yearLabel: "1999–2000",
        titleKo: "공세와 반격",
        titleEn: "Offensives and counteroffensives",
        bodyKo: "대규모 공세·반격이 반복되며 사상자가 급증합니다. 영토 확보와 협상 레버리지가 동시에 추구됩니다.",
        bodyEn: "Large offensives and counteroffensives repeat as casualties surge. Territorial gain and bargaining leverage are pursued together.",
        coordinates: offset([37.94, 14.53], 0.4, -0.1),
      },
      {
        id: "et-er-algiers",
        order: 5,
        yearLabel: "2000",
        titleKo: "알제 협정",
        titleEn: "Algiers Agreement",
        bodyKo: "알제 협정으로 휴전이 성사됩니다. 국경 획정·이행 메커니즘이 합의되나 실행은 별개 과제입니다.",
        bodyEn: "The Algiers Agreement produces a ceasefire. Demarcation and implementation mechanisms are agreed, but execution is a separate task.",
        coordinates: offset([37.94, 14.53], -0.3, -0.15),
      },
      {
        id: "et-er-after",
        order: 6,
        yearLabel: "이후",
        titleKo: "획정 이행의 난항",
        titleEn: "Hard demarcation path",
        bodyKo: "획정·이행이 지연·갈등하며 긴장이 장기화됩니다. 바드메는 상징적 쟁점으로 남습니다.",
        bodyEn: "Demarcation and implementation lag and conflict; tension lengthens. Badme remains a symbolic flashpoint.",
        coordinates: offset([37.94, 14.53], 0.15, -0.3),
      },
    ],
    openAlex: [
      work("W2130000001", "Wars and child health: Evidence from the Eritrean–Ethiopian conflict", null, 0, null, null, [], "https://api.openalex.org/works?filter=title.search:Eritrean-Ethiopian%20War"),
    ],
  },
  "sino-north-korean-border-clash-1969": {
    episodeId: "sino-north-korean-border-clash-1969",
    sixW: {
      whoKo: "조선민주주의인민공화국과 중화인민공화국 당국·국경 관련 병력. 공개 1차 자료가 제한적이라 행위자·규모 세부는 확정하기 어려움.",
      whoEn: "DPRK and PRC authorities and border-related forces. Limited public primary sources make actor and scale details hard to pin down.",
      whatKo: "1960년대 말 조·중 관계 악화 국면의 국경 긴장·선전·소규모 마찰 보고. 전바오 규모의 공개 전면전으로 문서화된 단일 사건은 아님.",
      whatEn: "Reports of border tension, propaganda, and small frictions amid late-1960s DPRK–China cooling—not a Zhenbao-scale, publicly documented open war as a single event.",
      whenKo: "1960년대 말, 특히 1969년 전후(중소 국경 교전과 동시기). 일자·장소 세부는 공개 자료가 희소.",
      whenEn: "Late 1960s, especially around 1969 (same season as the Sino-Soviet border clash). Day-and-place detail is scarce in open sources.",
      whereKo: "백두산(장백산) 일대 조·중 국경 지대. 대표 좌표로 둠.",
      whereEn: "The Paektu/Changbai borderlands between the DPRK and China—used here as a representative coordinate.",
      whyKo: "중소 분열·문화대혁명 국면에서 북한–중국 불신 증대. ‘혈맹’ 서사와 실제 안보·이념 긴장의 괴리.",
      whyEn: "Rising DPRK–China distrust amid the Sino-Soviet split and Cultural Revolution—the gap between ‘blood alliance’ rhetoric and security/ideological tension.",
      howKo: "공개 기록상 대규모 정규전보다 긴장·선전·소규모 마찰·외교 냉각으로 나타남. 연구·회고에 의존하며 확정적 교전 목록은 구성하기 어려움.",
      howEn: "In open records it appears more as tension, propaganda, small frictions, and diplomatic cooling than as large regular war. Research and memoirs dominate; a definitive clash list is hard to build.",
    },
    paragraphsKo: [
      "1960년대 말 중소 분열과 중국 문화대혁명은 북한–중국 관계에도 직접 파급되었습니다. ‘혈맹’ 수사와 달리 불신·경계가 커졌다는 점이 연구·회고에서 공통으로 지적됩니다.",
      "백두산 일대 국경은 그 긴장의 지리적 배경입니다. 다만 전바오섬처럼 일자·교전 규모가 공개 1차 자료로 두껍게 문서화된 단일 전면전은 드뭅니다.",
      "공개 자료가 제한적인 가운데, 문헌은 국경 지대 긴장, 상호 선전, 소규모 마찰 보고를 언급합니다. 시·공간 세부를 확정하기 어려운 점이 이 에피소드의 한계이자 정직한 전제입니다.",
      "같은 시기 중소 국경 교전(1969)과 병치하면, 공산권 내부에서도 안보 불신이 동시에 쌓일 수 있음을 보여 줍니다. 이 렌즈의 요지는 ‘혈맹 안의 균열’입니다.",
      "따라서 이 항목은 확정적 전투 서사보다 외교·군사 맥락의 연대기를 우선합니다. 대표 좌표는 백두산 일대 국경이며, 과장된 단일 해전·전투로 읽지 않아야 합니다.",
    ],
    paragraphsEn: [
      "In the late 1960s the Sino-Soviet split and China’s Cultural Revolution spilled into DPRK–China relations. Research and memoirs commonly note rising distrust despite ‘blood alliance’ rhetoric.",
      "The Paektu borderlands are the geographic backdrop. Unlike Zhenbao, a single open war with thick public primary documentation of dates and scale is rare here.",
      "With limited public sources, literature speaks of borderland tension, mutual propaganda, and reports of small frictions. Hard-to-fix day-and-place detail is both a limit and an honest premise of this episode.",
      "Set beside the 1969 Sino-Soviet border clash, it shows that security distrust could accumulate inside the communist camp at the same time. The lens is ‘a crack inside alliance.’",
      "This entry therefore prioritizes a diplomatic–military chronological context over a definitive battle narrative. The representative coordinate is the Paektu border; it should not be read as one exaggerated naval or land battle.",
    ],
    stages: [
      {
        id: "prk-chn-split",
        order: 1,
        yearLabel: "1960s",
        titleKo: "중소 분열의 파급",
        titleEn: "Spillover of the Sino-Soviet split",
        bodyKo: "중소 이념·안보 분열이 심화됩니다. 북한은 양대 강대국 사이에서 외교·안보 균형을 재조정합니다.",
        bodyEn: "Sino-Soviet ideological and security division deepens. The DPRK readjusts diplomatic and security balance between the two powers.",
        coordinates: offset([128.05, 42.01], -0.35, 0.25),
      },
      {
        id: "prk-chn-cr",
        order: 2,
        yearLabel: "1966–69",
        titleKo: "문화대혁명 국면",
        titleEn: "Cultural Revolution phase",
        bodyKo: "중국 국내 정치 격변이 대외 관계에 영향을 미칩니다. 조중 관계에서도 불신·선전 긴장이 커집니다.",
        bodyEn: "China’s domestic upheaval affects external relations. Distrust and propaganda tension also rise in DPRK–China ties.",
        coordinates: offset([128.05, 42.01], -0.3, 0.2),
      },
      {
        id: "prk-chn-cool",
        order: 3,
        yearLabel: "1960s 말",
        titleKo: "관계 냉각",
        titleEn: "Cooling ties",
        bodyKo: "고위 교류·신뢰가 약화되고 상호 경계가 커집니다. ‘혈맹’ 수사와 실제 관계의 괴리가 뚜렷해집니다.",
        bodyEn: "High-level exchange and trust weaken; mutual caution grows. The gap between ‘blood alliance’ rhetoric and practice becomes clearer.",
        coordinates: offset([128.05, 42.01], -0.15, 0.35),
      },
      {
        id: "prk-chn-border",
        order: 4,
        yearLabel: "1969 전후",
        titleKo: "국경 긴장 보고",
        titleEn: "Reported border tension",
        bodyKo: "공개 1차 자료가 제한적인 가운데, 국경 지대 긴장·소규모 마찰 보고가 연구·회고에 남습니다. 규모·일자는 확정하기 어렵습니다.",
        bodyEn: "With limited public primary sources, research and memoirs leave reports of borderland tension and small frictions. Scale and dates are hard to fix.",
        coordinates: [128.05, 42.01],
      },
      {
        id: "prk-chn-parallel",
        order: 5,
        yearLabel: "1969",
        titleKo: "중소 교전과 동시성",
        titleEn: "Simultaneity with Zhenbao",
        bodyKo: "같은 해 중소 전바오 교전이 발생합니다. 진영 내부 불신이 동시 다발적으로 표출된 시기로 읽습니다.",
        bodyEn: "The Sino-Soviet Zhenbao clash occurs the same year. The period is read as one of concurrent intra-camp distrust.",
        coordinates: offset([128.05, 42.01], 0.25, 0.15),
      },
      {
        id: "prk-chn-lesson",
        order: 6,
        yearLabel: "요지",
        titleKo: "혈맹 안의 균열",
        titleEn: "Crack inside alliance",
        bodyKo: "확정적 전면전 목록보다, 같은 진영 안에서도 불신이 쌓일 수 있다는 맥락이 이 렌즈의 요지입니다.",
        bodyEn: "More than a definitive open-war list, the lens is that distrust can accumulate even inside the same camp.",
        coordinates: offset([128.05, 42.01], 0.35, -0.15),
      },
    ],
    openAlex: [
      work("W2160000001", "Kim Il Sung in the Khrushchev era: Soviet-DPRK relations and the roots of North Korean despotism", null, 0, null, null, [], "https://api.openalex.org/works?filter=title.search:Soviet-DPRK%20relations"),
    ],
  },
  "ussr-north-korea-maritime-friction-1980s": {
    episodeId: "ussr-north-korea-maritime-friction-1980s",
    sixW: {
      whoKo: "소비에트 연방(태평양함대·관련 항공 자산)과 조선민주주의인민공화국 당국·해·공 경계 세력. 공개 자료상 단일 교전 당사자를 확정하기 어려움.",
      whoEn: "The Soviet Union (Pacific Fleet and related air assets) and DPRK authorities/maritime–air border forces. Open sources make a single-clash cast hard to fix.",
      whatKo: "두만강 하구·동해 접경에서의 통항·어업·정보 수집·영해·영공 관련 주권 마찰·교섭. 단일 1985년 ‘해전’으로 고정하기 어려움.",
      whatEn: "Sovereignty friction and bargaining over transit, fishing, intelligence collection, territorial sea and airspace near the Tumen mouth and East Sea borderlands—not fixable as one 1985 naval battle.",
      whenKo: "냉전기, 특히 1980년대(대표 연도 표기는 1985). 반복적 마찰·교섭 구간.",
      whenEn: "Cold War period, especially the 1980s (representative year label 1985): a stretch of repeated friction and talks.",
      whereKo: "두만강 하구 및 동해(일본해) 접경 해역. 대표 좌표.",
      whereEn: "The Tumen River mouth and adjacent East Sea (Sea of Japan) border waters—as a representative coordinate.",
      whyKo: "소련 태평양 방면 활동 확대와 북한의 영해·영공·기지 접근 민감성이 충돌. 동맹이면서도 주권 경계가 작동.",
      whyEn: "Expanding Soviet Pacific activity collided with DPRK sensitivity over territorial sea, airspace, and base access—alliance with a working sovereignty boundary.",
      howKo: "공개 자료는 마찰·항의·교섭의 흔적을 남김. 대규모 해전 서사보다 통항·주권 관리의 반복. 오늘날 러–북 밀착과 대비되는 ‘경계’의 기억.",
      howEn: "Open sources leave traces of friction, protest, and bargaining—repeated transit/sovereignty management more than a grand naval-battle narrative. A memory of caution against today’s Russia–DPRK intimacy.",
    },
    paragraphsKo: [
      "냉전기 소련은 태평양 방면 해군·항공 활동을 확대했습니다. 북한은 동맹국이면서도 영해·영공·기지 접근에 대한 주권 민감성을 반복적으로 드러냈습니다.",
      "두만강 하구와 동해 접경은 그 긴장을 한 좌표로 묶기 위한 대표 지점입니다. 어업·통항·정보 수집을 둘러싼 마찰·교섭 기록이 공개 자료에 산발적으로 남습니다.",
      "특정 일자·함정명으로 고정된 ‘1985년 해전’으로 읽기에는 공개 1차 자료가 부족합니다. 이 항목은 그 한계를 전제로, 반복된 주권·통항 마찰의 맥락을 제시합니다.",
      "동맹 관계 안에서도 해상·항공 접근은 협상과 경계의 대상이었습니다. 종속·밀착만이 아니라 ‘선 긋기’가 작동한 사례로 읽습니다.",
      "오늘날 러–북 군수·외교 밀착과 대조하면, 냉전기의 이 구간은 경계와 주권 주장의 기억으로 남습니다. 대표 좌표일 뿐 단일 전투로 과장하지 않아야 합니다.",
    ],
    paragraphsEn: [
      "In the Cold War the Soviet Union expanded Pacific naval and air activity. The DPRK, though an ally, repeatedly showed sovereignty sensitivity over territorial sea, airspace, and base access.",
      "The Tumen mouth and East Sea borderlands are a representative coordinate for that tension. Open sources leave scattered records of friction and bargaining over fishing, transit, and intelligence collection.",
      "Public primary sources are too thin to read this as a fixed ‘1985 naval battle’ with a single date and ship list. This entry states that limit and offers the context of repeated sovereignty and transit friction.",
      "Even inside an alliance, maritime and air access were objects of negotiation and boundary-drawing. The case is one of line-drawing, not only subordination intimacy.",
      "Set against today’s Russia–DPRK logistics and diplomatic closeness, this Cold War stretch remains a memory of caution and sovereignty claims. It is a representative coordinate—not one exaggerated battle.",
    ],
    stages: [
      {
        id: "prk-sun-alliance",
        order: 1,
        yearLabel: "냉전",
        titleKo: "동맹과 주권의 병존",
        titleEn: "Alliance with sovereignty",
        bodyKo: "북·소는 동맹·원조 관계이면서도 영토·영해 주권을 별개로 관리합니다. 접근·통항에 대한 민감성이 구조적으로 존재합니다.",
        bodyEn: "DPRK–Soviet alliance and aid coexist with separate management of territory and sea sovereignty. Sensitivity over access and transit is structural.",
        coordinates: offset([130.65, 42.43], -0.4, 0.25),
      },
      {
        id: "prk-sun-fleet",
        order: 2,
        yearLabel: "1970s–80s",
        titleKo: "태평양 방면 활동",
        titleEn: "Pacific activity",
        bodyKo: "소련 태평양함대·항공 활동이 확대됩니다. 접경 해역에서의 존재감이 북한의 경계와 맞물립니다.",
        bodyEn: "Soviet Pacific Fleet and air activity expand. Presence in adjacent waters meets DPRK caution.",
        coordinates: offset([130.65, 42.43], -0.35, 0.2),
      },
      {
        id: "prk-sun-friction",
        order: 3,
        yearLabel: "1980s",
        titleKo: "통항·어업 마찰",
        titleEn: "Transit and fishing friction",
        bodyKo: "어업·통항·정보 관련 마찰·항의·교섭 기록이 반복됩니다. 단일 전투보다 관리·교섭의 패턴이 두드러집니다.",
        bodyEn: "Records of fishing, transit, and intelligence-related friction, protest, and talks repeat. Management and bargaining patterns stand out more than a single battle.",
        coordinates: [130.65, 42.43],
      },
      {
        id: "prk-sun-airsea",
        order: 4,
        yearLabel: "1980s",
        titleKo: "영해·영공 민감성",
        titleEn: "Sea and airspace sensitivity",
        bodyKo: "영해·영공·기지 접근을 둘러싼 주권 주장이 드러납니다. 공개 자료는 세부 사건보다 민감성 자체를 보여 줍니다.",
        bodyEn: "Sovereignty claims over territorial sea, airspace, and base access appear. Open sources show the sensitivity itself more than a thick event list.",
        coordinates: offset([130.65, 42.43], 0.25, 0.15),
      },
      {
        id: "prk-sun-limit",
        order: 5,
        yearLabel: "자료 한계",
        titleKo: "공개 자료의 한계",
        titleEn: "Limits of open sources",
        bodyKo: "특정 1985년 해전으로 고정할 1차 자료는 부족합니다. 대표 좌표와 반복 마찰의 맥락으로 제시합니다.",
        bodyEn: "Primary sources are too thin to fix a single 1985 naval battle. We present a representative coordinate and a context of repeated friction.",
        coordinates: offset([130.65, 42.43], 0.35, -0.1),
      },
      {
        id: "prk-sun-contrast",
        order: 6,
        yearLabel: "오늘과의 대비",
        titleKo: "오늘과의 대비",
        titleEn: "Contrast with today",
        bodyKo: "오늘날 러–북 군수·외교 밀착과 달리, 이 구간은 동맹 안의 ‘경계’ 사례로 읽습니다.",
        bodyEn: "Unlike today’s Russia–DPRK logistics and diplomatic intimacy, this stretch is read as a case of caution inside alliance.",
        coordinates: offset([130.65, 42.43], 0.3, -0.18),
      },
    ],
    openAlex: [
      work("W2160000001", "Kim Il Sung in the Khrushchev era: Soviet-DPRK relations and the roots of North Korean despotism", null, 0, null, null, [], "https://api.openalex.org/works?filter=title.search:Soviet-DPRK%20relations"),
    ],
  },
};

export function frictionDeepDoc(episodeId: string): FrictionDeepDoc | null {
  return FRICTION_DEEP_DOCS[episodeId] ?? null;
}

/**
 * 각 사건의 다방면적 의의와 이후 영향 — 양피지 맨 아래 블록.
 * 사실 서술·6하원칙과 분리해, “무엇이 바뀌었고 무엇이 이어졌는가”만 고정한다.
 */
export const FRICTION_SIGNIFICANCE: Record<string, { ko: string; en: string }> = {
  "sino-soviet-border-1969": {
    ko: "이념·안보 면에서 공산권 ‘혈맹’ 서사가 실탄으로 깨졌고, 군사적으로는 국경 해석 차이가 핵 논의까지 키울 수 있음이 드러났습니다. 외교적으로는 항의·협상과 함께 대외 정렬이 재검토되어 미·중 접근의 배경 요인으로 남았으며, 이후 국경 협상·전략 재평가의 장기 과제를 남겼습니다.",
    en: "Ideologically and in security terms it cracked the communist ‘fraternal’ myth under live fire; militarily it showed a cartographic quarrel could scale toward nuclear talk. Diplomatically, protests and talks ran with a realignment that fed into Sino-American rapprochement—and left long border talks and strategic reassessment in its wake.",
  },
  "sino-vietnamese-war-1979": {
    ko: "지역 질서 면에서 중국이 인도차이나에 ‘응징·억지’ 신호를 무력으로 보낸 사례가 되었고, 군사적으로는 단기 교전 뒤에도 국경 포격·대치가 이어졌습니다. 외교·동맹 면에서는 소련–베트남 조약·캄보디아 연쇄와 맞물리며, 이후에도 중월 긴장과 인도차이나 점령·저항 구조가 한동안 남았습니다.",
    en: "Regionally it became Beijing’s armed ‘punish and deter’ signal in Indochina; militarily shelling and stand-offs outlasted the short campaign. Diplomatically it locked into the Soviet–Vietnamese treaty and Cambodia chain—leaving Sino-Vietnamese tension and occupation/resistance structures for years after.",
  },
  "galwan-valley-clash-2020": {
    ko: "1962년 미획정 LAC가 2017 도클람·2020 갈완으로 재점화된 히말라야 연속사로 남았습니다. 총기 제한 아래에서도 치명적 충돌이 가능함이 각인되었고, 전방 재배치와 회담이 병행되며 인도–중국 관계는 관리형 대치로 굳어졌습니다.",
    en: "It remains a Himalayan continuum: the undemarcated 1962 LAC reignited at Doklam 2017 and Galwan 2020. Lethal clash proved possible even under firearm restraints; forward redeployment and talks locked India–China into managed confrontation.",
  },
  "russo-georgian-war-2008": {
    ko: "주권·인정 면에서 압하지야·남오세티야 ‘승인’과 유엔 다수 미인정이 병존하는 동결 전선이 굳었고, 군사적으로는 러시아 대규모 개입의 선례가 남았습니다. 외교적으로는 EU 중재·감시와 러시아–서방 관계 악화가 겹치며, 이후 포스트소비에트 안보 질서·‘신냉전’ 서사의 이정표로 읽힙니다.",
    en: "On sovereignty it froze recognition and non-recognition over Abkhazia and South Ossetia; militarily it set a precedent for large-scale Russian intervention. Diplomatically an EU ceasefire and monitoring overlapped a Russia–West chill—later read as a milestone in remade post-Soviet order and ‘new Cold War’ narratives.",
  },
  "nagorno-karabakh-war-2020": {
    ko: "한 세대에 걸친 포스트소련 동결 분쟁의 원형으로 남았습니다. 제1차 전쟁으로 동결선이 생기고, 2020년 UAV 전장이 그 선을 무너뜨렸으며, 2023년 공세로 미인정 공화국 형태가 사실상 소멸했습니다. 러시아 중재·평화유지는 축이었으나 주교전은 아제르바이잔–아르메니아(아르차흐)였고, 난민·획정·안보 공백은 닫히지 않았습니다.",
    en: "It remains the archetype of a generation-long post-Soviet frozen conflict: the First War froze a line, 2020 UAV warfare broke it, and the 2023 offensive effectively ended the unrecognized republic. Russian mediation and peacekeeping were the axis—while the belligerents were Azerbaijan and Armenia/Artsakh—and displacement, demarcation, and security gaps did not close.",
  },
  "iran-iraq-war-1980": {
    ko: "걸프 질서 면에서 공유 수로·국경 해석이 8년 소모전으로 비화할 수 있음이 입증되었고, 인도주의·규범 면에서는 화학무기·민간 피폭 기록이 각인되었습니다. 경제·외교적으로는 양국 피폐와 UN 종결 뒤에도 수로·국경 의제가 남아, 이후 지역 안보·제재·동맹 계산의 장기 배경이 되었습니다.",
    en: "In Gulf order it proved shared waterways and borders can escalate into eight years of attrition; in norms, chemical weapons and urban bombardment were etched into the record. Economically and diplomatically both sides were exhausted, and after UN closure waterway and border issues lingered as background to later regional security, sanctions, and alliance math.",
  },
  "tunb-islands-dispute-1971": {
    ko: "주권 지도 면에서 영국 철수 직후 ‘점거·실효 지배’가 반세기 넘는 UAE–이란 병존 주장을 남겼고, 안보 면에서는 호르무즈 접근로·걸프 에너지 통항 서사와 맞물렸습니다. 외교적으로는 간헐적 긴장·협상이 반복되며, 이후에도 ‘닫히지 않은 섬 문제’로 지역 의제에 잔존합니다.",
    en: "On the sovereignty map, occupation and effective control right after Britain’s withdrawal left half a century of coexisting UAE–Iran claims; in security it entangles Hormuz approaches and Gulf energy-transit narratives. Diplomatically, intermittent tension and talks recur—and the unresolved islands remain on the regional agenda.",
  },
  "cambodian-vietnamese-war-1978": {
    ko: "인도차이나 질서 면에서 ‘인도주의·안보’ 명분과 점령·저항이 한 연쇄로 묶였고, 동맹 정치 면에서는 소련–베트남 조약·중월전쟁과 맞물려 무력 개입이 지역 재편을 불렀습니다. 이후 캄보디아 점령 기간·저항·외교 고립이 길어지며, ‘동맹 안 개입’의 대가를 보여주는 유산이 되었습니다.",
    en: "In Indochina order it bound ‘humanitarian/security’ justifications to occupation and resistance; in alliance politics it locked into the Soviet–Vietnamese treaty and Sino-Vietnamese war so force remade the map. A long occupation, resistance, and diplomatic isolation followed—leaving a legacy of the costs of intervention inside alliance politics.",
  },
  "eritrean-ethiopian-war-1998": {
    ko: "국경 규범 면에서 획정 미완이 전면전으로 비화할 수 있음이 드러났고, 인도주의적으로는 대규모 사상·피란이 남았습니다. 외교적으로는 알제 협정 이후에도 ‘동결된 평화’가 길어지며, 이후 양국 관계·역내 중재·국경 표석 분쟁이 반복되는 구조적 영향을 남겼습니다.",
    en: "In border norms it showed unfinished demarcation can erupt into full war; human costs included large casualties and displacement. Diplomatically a ‘frozen peace’ lingered after Algiers—structuring later bilateral chill, regional mediation, and recurring marker disputes.",
  },
  "sino-north-korean-border-clash-1969": {
    ko: "동맹 서사 면에서는 중–북 ‘혈맹’ 안에서도 국경·어로·관할이 충돌할 수 있음이 드러났고, 군사·현장 면에서는 공개 기록이 제한적이라도 마찰의 존재를 남겼습니다. 이후에도 ‘자동 순치’가 보장되지 않는다는 렌즈로 남아, 국경 관리·동맹 관리를 함께 읽는 참고가 됩니다.",
    en: "In alliance narrative it showed China–DPRK ‘fraternity’ can still clash over borders, fishing, and jurisdiction; on the ground, sparse open records still leave evidence of friction. It remains a lens that automatic harmony is not guaranteed—useful for reading border and alliance management together.",
  },
  "ussr-north-korea-maritime-friction-1980s": {
    ko: "후원·동맹 면에서는 해상 경계·어로·관할이 ‘경계선’이 될 수 있음이 드러났고, 안보 면에서는 북방 수역의 실무 마찰이 정치적 온도를 흔들 수 있음을 남겼습니다. 오늘날 러–북 밀착과 대비되며, 이후에도 동맹 내부 마찰 가능성을 읽는 참고 좌표로 쓰입니다.",
    en: "Under patronage and alliance it showed maritime limits, fishing, and jurisdiction can become a fault line; in security, routine northern-water friction can move political temperature. Contrasted with today’s Russia–DPRK intimacy, it remains a reference for reading possible friction inside alliance afterward.",
  },
};

/**
 * 역사(마찰) 양피지 — 육하원칙·전개·의의를 라벨 없이 줄글로 이어 쓴다.
 * 사실·연도·지명은 유지하되, 정례 보고와 달리 장면과 여운이 있는 문학적 논픽션 톤.
 */
export function frictionParchmentParagraphs(
  ep: FrictionEpisode,
  lang: "ko" | "en",
): string[] {
  const deep = frictionDeepDoc(ep.id);
  const significance = FRICTION_SIGNIFICANCE[ep.id];
  const yearSpan = ep.yearEnd
    ? `${ep.historicalYear}–${ep.yearEnd}`
    : `${ep.historicalYear}`;
  const whoParties =
    ep.parties.length > 0
      ? lang === "en"
        ? ep.parties.join(" · ")
        : ep.parties.join("·")
      : null;

  if (deep) {
    const six = deep.sixW;
    const body = lang === "en" ? deep.paragraphsEn : deep.paragraphsKo;
    const stages = [...deep.stages].sort((a, b) => a.order - b.order);
    const paragraphs: string[] = [];

    if (lang === "en") {
      paragraphs.push(
        `The map returns to ${episodeLocationName(ep, "en")}. In ${yearSpan}, ${six.whenEn.replace(/\.$/, "")}. There, ${six.whoEn.replace(/\.$/, "")} stood across a line that was never only ink on a chart.`,
      );
      paragraphs.push(
        `What unfolded was ${six.whatEn.replace(/\.$/, "")}. The reason was never thin: ${six.whyEn}`,
      );
      paragraphs.push(
        `It moved like this: ${six.howEn}`,
      );
      if (stages.length > 0) {
        const arc = stages
          .map((s) => {
            const title = s.titleEn;
            const stageBody = s.bodyEn.replace(/\.$/, "");
            return `${s.yearLabel} — ${title}: ${stageBody}`;
          })
          .join(". ");
        paragraphs.push(`Follow the arc of the years. ${arc}.`);
      }
      paragraphs.push(...body);
      const noteEn = episodeNote(ep, "en");
      if (noteEn) paragraphs.push(noteEn);
      if (significance) {
        paragraphs.push(
          `What remains afterward is not a footnote alone. ${significance.en}`,
        );
      }
      if (deep.openAlex.length > 0) {
        paragraphs.push(
          `For further reading (OpenAlex metadata only): ${deep.openAlex
            .slice(0, 2)
            .map((w) => w.title)
            .join(" · ")}.`,
        );
      }
    } else {
      const whenLine = six.whenKo.replace(/\.$/, "");
      paragraphs.push(
        `지도는 다시 ${ep.locationName}으로 돌아갑니다. ${yearSpan}, ${whenLine}. 그 자리에서 마주친 세력은 이렇습니다. ${six.whoKo}`,
      );
      paragraphs.push(
        `벌어진 일은 이러합니다. ${six.whatKo} 까닭은 얇지 않았습니다. ${six.whyKo}`,
      );
      paragraphs.push(`전개는 이렇게 흘렀습니다. ${six.howKo}`);
      if (stages.length > 0) {
        const arc = stages
          .map((s) => {
            const stageBody = s.bodyKo.replace(/\.$/, "");
            return `${s.yearLabel}의 「${s.titleKo}」에서 ${stageBody}`;
          })
          .join(". ");
        paragraphs.push(`세월의 결을 따라가면 이렇습니다. ${arc}.`);
      }
      paragraphs.push(...body);
      if (ep.note) paragraphs.push(ep.note);
      if (significance) {
        paragraphs.push(
          `이후에 남는 것은 각주만은 아닙니다. ${significance.ko}`,
        );
      }
      if (deep.openAlex.length > 0) {
        paragraphs.push(
          `더 읽을 자료(OpenAlex 메타데이터): ${deep.openAlex
            .slice(0, 2)
            .map((w) => w.title)
            .join(" · ")}.`,
        );
      }
    }

    return paragraphs.filter((p) => p.trim().length > 0);
  }

  // deep 문서 없을 때 — 단문 briefing을 문학적 틀로 감싼다
  if (lang === "en") {
    const whoBit = whoParties ? ` ${whoParties} stand in the record.` : "";
    const fallbackNote = episodeNote(ep, "en");
    return [
      `The lamp of history settles on ${episodeLocationName(ep, "en")} (${yearSpan}).${whoBit}`,
      episodeBriefing(ep, "en"),
      ...(fallbackNote ? [fallbackNote] : []),
      ...(significance
        ? [`What remains afterward is not a footnote alone. ${significance.en}`]
        : []),
    ];
  }

  const whoBit = whoParties
    ? ` 기록에 남는 당사자는 ${whoParties}입니다.`
    : "";
  return [
    `역사의 자리는 ${ep.locationName}으로 고정됩니다 (${yearSpan}).${whoBit}`,
    ep.briefing,
    ...(ep.note ? [ep.note] : []),
    ...(significance
      ? [`이후에 남는 것은 각주만은 아닙니다. ${significance.ko}`]
      : []),
  ];
}
