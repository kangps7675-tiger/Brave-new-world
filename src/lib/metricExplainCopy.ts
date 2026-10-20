/**
 * 지구본 우상단 지표 — 고객용 줄글 설명 (계산·설계).
 * 전문 용어는 풀어 쓰고, 「무엇을 보는지 / 어떻게 나오는지 / 한계」 순으로 적는다.
 */

export type MetricExplainId =
  | "gts"
  | "gscpi"
  | "freight"
  | "portwatch"
  | "ses"
  | "swpc"
  | "market-session";

export type MetricExplainCopy = {
  titleKo: string;
  titleEn: string;
  /** 짧은 한 줄 훅 */
  hookKo: string;
  hookEn: string;
  /** 본문 단락 (줄글) */
  paragraphsKo: string[];
  paragraphsEn: string[];
};

export const METRIC_EXPLAIN: Record<MetricExplainId, MetricExplainCopy> = {
  gts: {
    titleKo: "DEFCON (긴장 단계)",
    titleEn: "DEFCON (tension stage)",
    hookKo: "오늘은 세계가 어제보다 얼마나 팽팽한지, DEFCON 1~5로 보여 줍니다.",
    hookEn: "DEFCON 1–5 for how tightly wound the world feels versus yesterday.",
    paragraphsKo: [
      "화면에 보이는 DEFCON은 이 서비스의 긴장점수(GTS, 0~100)를 1~5 단계로 읽은 값입니다. 공식 군사 DEFCON 선언·경보가 아닙니다.",
      "점수는 주요 전장(우크라이나·중동·대만·한반도 등)마다 쌓아 둔 긴장 점수를 모은 뒤, 「평균」과 「가장 뜨거운 전장」을 섞어 만듭니다. 평균만 쓰면 한곳이 폭발해도 숫자가 안 움직이고, 최고만 쓰면 작은 불꽃에 전체가 요동치기 때문입니다.",
      "어제 점수와 부드럽게 섞어(완만한 평균) 하루 만에 너무 크게 튀지 않게 합니다. 그래서 칩에 보이는 단계는 「순간 감정」이 아니라 「하루 단위로 다듬은 관측」에 가깝습니다.",
      "DEFCON 5는 상대적으로 고요, 1에 가까울수록 여러 전장에서 소음이 큽니다. 공습 시점·사상자 수를 예측하지 않습니다.",
      "참고: 유명 기관의 「테러 지수(GTI)」나 원유 시세(WTI)와는 이름만 비슷할 뿐 다른 지표입니다.",
    ],
    paragraphsEn: [
      "On-screen DEFCON is a 1–5 staged read of this app’s Global Tension Score (GTS, 0–100). It is not an official military DEFCON declaration.",
      "We blend theater scores with both an average and the hottest theater, so one spike doesn’t vanish into the mean and one spark doesn’t own the whole board.",
      "We also smooth against yesterday so the chip does not jump on every tick. Think of it as a day-scale observation, not a mood swing.",
      "DEFCON 5 is quieter; toward 1 means many theaters are noisy. This is not a raid or casualty forecast.",
      "Note: it is not the IEP terrorism index (GTI) and not oil ticker WTI—similar letters, different meaning.",
    ],
  },
  gscpi: {
    titleKo: "공급망 압력",
    titleEn: "Supply-chain pressure",
    hookKo: "전 세계 공급망이 평소보다 얼마나 빡빡한지, 뉴욕 연준 GSCPI를 1~5로 읽습니다.",
    hookEn: "NY Fed GSCPI remapped to pressure levels 1–5 for how tight global supply chains feel.",
    paragraphsKo: [
      "공급망 압력은 뉴욕 연방준비은행이 공개하는 GSCPI를 1(원활)~5(심각) 단계로 다시 읽은 값입니다. 원래 숫자는 「평소보다 몇 표준편차만큼 막혔는가」입니다.",
      "해상·항공 운임, 공장의 배송 지연, 밀린 주문 같은 여러 신호를 한데 모아 「세계 물류가 얼마나 빡빡한가」를 봅니다. 지도 위 한 항구가 아니라, 지구 전체의 배경 소음에 가깝습니다.",
      "한 달에 한 번 갱신됩니다. 오늘 아침 홍해 뉴스와 즉시 맞춰 움직이지 않을 수 있습니다. 실시간 초크포인트는 PortWatch 칩을 함께 보세요.",
      "단계가 높을수록 운임·지연·재고 압박이 커지기 쉬운 환경이라는 뜻이지, 특정 회사가 망한다는 뜻이 아닙니다. 군사 DEFCON과도 무관합니다.",
    ],
    paragraphsEn: [
      "Supply-chain pressure remaps the NY Fed’s GSCPI into levels 1 (smooth) through 5 (severe). Under the hood it is a z-score versus history.",
      "It blends sea/air freights, delivery delays, and backlogs into one global “how clogged is the pipe?” read—not a single port pin on the map.",
      "It updates monthly, so it may lag this morning’s Red Sea headline. Use PortWatch for live chokepoint friction.",
      "A high level means freight and delays are more stressed than usual—not that a named company will fail. Unrelated to military DEFCON.",
    ],
  },
  freight: {
    titleKo: "해운 프록시 (BDRY)",
    titleEn: "Shipping proxy (BDRY)",
    hookKo: "건화물 시황을 주식처럼 거래하는 상품의 전일 대비 움직임입니다.",
    hookEn: "Day-to-day move of a listed proxy that tracks dry-bulk shipping mood.",
    paragraphsKo: [
      "해운 프록시는 발틱 건화물 지수(BDI) 자체를 직접 보여 주지 않습니다. 대신 그와 비슷한 방향으로 움직이는 상장 상품(BDRY)의 전일 종가 대비 변화율을 보여 줍니다.",
      "배가 바쁘고 운임이 오르면 보통 이 숫자도 위로 기울고, 시황이 식으면 아래로 기울기 쉽습니다. 「오늘 운임표」가 아니라 「시장이 해운을 어떻게 느끼나」의 빠른 온도계입니다.",
      "데이터는 공개 시세를 가져오며, 주말·휴장에는 멈춰 있을 수 있습니다. 실제 항구 혼잡·해협 경보는 PortWatch와 속보를 함께 보세요.",
    ],
    paragraphsEn: [
      "This chip does not print the Baltic Dry Index itself. It shows the day-over-day percent move of BDRY, a listed proxy that often moves with dry-bulk mood.",
      "When ships are busy and freights firm, the figure tends to rise; when the trade cools, it tends to fall. It is a market thermometer—not today’s official rate sheet.",
      "Quotes can freeze on weekends. Pair with PortWatch and flash wires for real chokepoint stress.",
    ],
  },
  portwatch: {
    titleKo: "PortWatch 초크 스트레스",
    titleEn: "PortWatch chokepoint stress",
    hookKo: "좁은 해협·운하 중 「평소보다 붐비거나 막힌」 곳이 몇 곳인지 셉니다.",
    hookEn: "How many narrow straits/canals look busier or tighter than their own normal.",
    paragraphsKo: [
      "IMF PortWatch는 주요 해상 길목의 선박 통과량을 관측합니다. 이 칩은 그중에서 「평소보다 높은(elevated 이상)」 길목 개수를 분자로, 감시 중인 길목 전체를 분모로 보여 줍니다.",
      "밴드(정상·마찰·긴장)는 막힌 곳의 심각도를 한눈에 읽기 위한 표시입니다. 합산 100점 점수가 아니라, 「몇 군데가 빨간불인가」에 가깝습니다.",
      "전쟁·사고·날씨·항만 파업이 겹치면 숫자가 올라갈 수 있습니다. 반대로 우회 항로가 자리를 잡으면 내려가기도 합니다.",
      "한계: 위성·모델 기반 추정이라 현장 CCTV가 아닙니다. 등급 확정용 경보(예: UKMTO)와 교차해 보는 것이 안전합니다.",
    ],
    paragraphsEn: [
      "IMF PortWatch watches vessel throughput at key maritime choke points. This chip shows how many of those points are elevated or worse versus their own baseline, over how many we monitor.",
      "Bands (normal / friction / critical) are a quick read of severity—not a blended 0–100 score. Think “how many red lights,” not one fused grade.",
      "War, accidents, weather, or port strikes can lift the count; settled diversions can lower it.",
      "Limits: model/satellite estimates, not quay CCTV. Cross-check hard security alerts (e.g. UKMTO) when stakes are high.",
    ],
  },
  ses: {
    titleKo: "제재 회피 강도",
    titleEn: "Sanctions evasion intensity",
    hookKo: "제재를 피해 가려는 움직임이 오늘 얼마나 시끄러운지 추정한 점수입니다.",
    hookEn: "An estimate of how loud sanctions-evasion patterns look today.",
    paragraphsKo: [
      "제재 회피 강도는 공개 보도·선박·무역 프록시 등에서 「제재를 우회하려는 흔적」이 얼마나 자주·강하게 잡히는지를 0~100으로 요약합니다.",
      "점수가 오른다고 해서 특정 국가가 「범인」이라고 찍히지는 않습니다. 관측 신호가 늘었다는 뜻에 가깝습니다.",
      "전일 대비 변화는 단기 소음일 수 있으니, 며칠 흐름과 함께 보는 편이 낫습니다. 법적 판단·제재 리스트 등재 여부와는 무관합니다.",
    ],
    paragraphsEn: [
      "Sanctions evasion intensity summarizes how often and how strongly open signals of circumvention show up—on a 0–100 scale.",
      "A rising score does not name a guilty state; it means observed signals got louder.",
      "Day-to-day deltas can be noisy—read the trend. This is not a legal finding or a sanctions-list decision.",
    ],
  },
  swpc: {
    titleKo: "우주기상 (NOAA SWPC)",
    titleEn: "Space weather (NOAA SWPC)",
    hookKo: "태양 폭풍이 GPS·통신·전력에 얼마나 부담을 줄지 보는 기상청 리포트입니다.",
    hookEn: "NOAA’s read of how hard solar storms may lean on GPS, radio, and power.",
    paragraphsKo: [
      "우주기상 칩은 미국 NOAA 우주기상예측센터의 공개 등급(R/S/G)과 행성 Kp 지수를 요약합니다.",
      "G가 높을수록 지자기 폭풍이 강하고, GPS 오차·무선 장애·극지 항공 우회 가능성이 커질 수 있습니다. 지구본의 「군사 레이더」를 직접 끄지는 않습니다.",
      "수 분~수 시간 단위로 갱신됩니다. 한반도 날씨 예보와는 다른 층입니다.",
    ],
    paragraphsEn: [
      "This chip summarizes NOAA SWPC scales (R/S/G) and planetary Kp.",
      "Higher G means stronger geomagnetic storms—more risk of GPS error, radio trouble, or polar flight diversions. It does not switch off radars on the globe.",
      "Updates on minutes-to-hours cadence. Separate from local weather forecasts.",
    ],
  },
  "market-session": {
    titleKo: "시장 세션",
    titleEn: "Market session",
    hookKo: "지금 어느 지역 증시·금융이 「열어 둔 시간」인지 보여 줍니다.",
    hookEn: "Which regional market clocks are open right now.",
    paragraphsKo: [
      "시장 세션은 아시아·유럽·미국 등 주요 거래소가 지금 개장 중인지 표시합니다. 긴장·물류 점수와 별개로, 「돈이 움직이는 창」이 어디인지 알려 줍니다.",
      "서머타임·휴장일은 단순화되어 있을 수 있으니, 실제 주문 전엔 거래소 공지를 확인하세요.",
    ],
    paragraphsEn: [
      "Market session shows which major regional exchanges are in their open window—separate from tension or freight scores.",
      "DST and holidays may be simplified; check the exchange calendar before trading.",
    ],
  },
};
