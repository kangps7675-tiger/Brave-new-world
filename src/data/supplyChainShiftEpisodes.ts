/**
 * 공급망 재편 아카이브 · 리쇼어링(onshoring)·프렌드쇼어링(friend-shoring)·니어쇼어링(nearshoring) 렌즈 — 역사 에피소드.
 * `territorialDisputeEpisodes.ts`와 동일한 서사 패턴(메커니즘 우선 설명 → 연도·수치가 붙은 구체적 사건 사슬)을 따르되,
 * 영유권 대신 공급망 재배치를 다룬다. 지경학(geoeconomics) 모드에서 `ECON_REGION_KEYWORDS` / `SUPPLY_MANUFACTURING_GROUP`
 * (`econNavRegions.ts`)의 지도 핀과 `linkedEconNavIds`로 연결된다.
 * 문체 규칙(용어 괄호 설명, 추상적 요약 문구 금지, 최신 수치는 웹서치로 검증)은 프로젝트 루트 CLAUDE.md 참고.
 */

export type SupplyChainShiftTheme =
  | "reshoring" // 온쇼어링 — 해외 생산기지를 본국으로 되가져오는 전략
  | "friendshoring" // 프렌드쇼어링 — 동맹·우호국으로 생산기지를 분산하는 전략
  | "nearshoring" // 니어쇼어링 — 지리적으로 가깝고 기존 FTA를 쓸 수 있는 인접국으로 이전
  | "export-control" // 수출통제 — 특정 기술·품목의 수출을 법적으로 제한
  | "resource-nationalism" // 자원 국가주의 — 원자재 채굴·가공·가격결정권을 국가가 직접 통제
  | "capacity-race"; // 증설 경쟁 — 수요 급증을 타고 경쟁사끼리 투자·공사 일정을 서로 앞당기는 경쟁

export type SupplyChainShiftEpisode = {
  id: string;
  title: string;
  titleEn: string;
  locationName: string;
  locationNameEn: string;
  /** [lng, lat] */
  coordinates: readonly [number, number];
  zoom: number;
  startYear: number;
  yearEnd?: number;
  theme: SupplyChainShiftTheme;
  parties: string[];
  briefing: string;
  briefingEn: string;
  presentLinkKo: string;
  presentLinkEn: string;
  /** econNavRegions.ts의 ECON_REGION_KEYWORDS / SUPPLY_MANUFACTURING_GROUP id와 연결. 대응 핀이 없으면 []. */
  linkedEconNavIds: string[];
  /** 수치·정책 현황을 마지막으로 웹서치로 재검증한 시점("YYYY-MM"). 빠르게 바뀌는 투자액·정책 상태 재확인용. */
  lastVerified: string;
};

export const SUPPLY_CHAIN_SHIFT_EPISODES: readonly SupplyChainShiftEpisode[] = [
  {
    id: "tsmc-arizona-onshoring-2020",
    title: "TSMC 애리조나 온쇼어링 (2020–)",
    titleEn: "TSMC Arizona Onshoring (2020–)",
    locationName: "피닉스 · TSMC 애리조나",
    locationNameEn: "Phoenix · TSMC Arizona",
    coordinates: [-112.081, 33.6295],
    zoom: 7.5,
    startYear: 2020,
    theme: "reshoring",
    parties: ["Taiwan", "United States"],
    briefing:
      "2020년 TSMC가 피닉스 인근에 5나노 팹(파운드리 생산동) 건설을 발표하며 120억 달러를 약속한 뒤, 투자 규모는 발표할 때마다 불어났습니다. 2022년 2·3나노 공정을 더해 400억 달러로, 2024년 미 상무부의 반도체법(CHIPS Act) 보조금 최대 66억 달러를 받으며 세 번째 팹 계획으로, 2025년 3월 백악관 행사에서 1650억 달러 총투자로 각각 재조정됐습니다. 2026년 7월 16일 대만 실적발표에서 CC 웨이 CEO가 추가로 1000억 달러를 더 얹어 총 2650억 달러, 최종 팹 10개와 첨단패키징(반도체를 하나의 모듈로 묶는 후공정) 시설 2개 규모로 키우겠다고 밝혔는데, 이는 대만산 제품 관세를 15%로 낮춰주는 대신 대만이 미국에 2500억 달러를 투자하기로 한 미·대만 무역합의와 함께 나온 발표였습니다.",
    briefingEn:
      "TSMC announced its first Phoenix-area 5nm fab (a foundry production line) in 2020 with a $12 billion pledge, and the number has grown at every subsequent announcement: $40 billion in 2022 when 2nm and 3nm nodes were added, then a third-fab plan tied to up to $6.6 billion in CHIPS Act subsidies in 2024, then $165 billion in total commitments at a March 2025 White House event. On July 16, 2026, at TSMC's Taipei earnings call, CEO C.C. Wei added another $100 billion, pushing the total to $265 billion across a planned 10 fabs and two advanced-packaging facilities (back-end plants that bundle chips into finished modules) — announced alongside a US–Taiwan trade deal cutting Taiwanese tariffs to 15% in exchange for $250 billion in Taiwanese investment in the US.",
    presentLinkKo:
      "온쇼어링(onshoring, 해외 생산기지를 본국으로 되가져오는 전략)의 실제 동력은 시장 논리보다 관세·보조금 협상 결과에 가깝습니다 — 발표 금액이 무역합의 타결 시점마다 뛰어오르는 패턴이 이를 보여줍니다.",
    presentLinkEn:
      "The real driver of this onshoring isn't market logic so much as tariff and subsidy negotiations — the pledged figure jumps at each trade-deal milestone rather than tracking demand alone.",
    linkedEconNavIds: ["arizona-fab"],
    lastVerified: "2026-09",
  },
  {
    id: "tsmc-kumamoto-jasm-friendshoring-2021",
    title: "TSMC 구마모토(JASM) 반도체 르네상스 (2021–)",
    titleEn: "TSMC Kumamoto (JASM) Chip Renaissance (2021–)",
    locationName: "기쿠요초 · 구마모토 JASM",
    locationNameEn: "Kikuyo · Kumamoto JASM",
    coordinates: [130.8203, 32.8228],
    zoom: 8.5,
    startYear: 2021,
    theme: "friendshoring",
    parties: ["Taiwan", "Japan"],
    briefing:
      "2021년 TSMC는 소니·덴소를 소수 지분 파트너로 앉히고 일본 정부가 건설비 약 1조엔(팹1 기준)의 절반가량을 직접 보조하는 합작사 JASM(Japan Advanced Semiconductor Manufacturing)을 세웠습니다 — 자국 반도체 산업이 1990년대 이후 위축된 일본이 최첨단이 아닌 12~28나노 성숙 공정(자동차·산업용 칩에 주로 쓰이는 공정)부터 자국에 다시 심는 방식이었습니다. 2024년 2월 팹1이 준공해 그해 12월 양산에 들어갔고, 팹2는 2024년 착공 당시 6~7나노를 목표로 했다가 AI 수요를 타고 2026년 2월 트렌드포스 보도에 따르면 3나노로 상향 조정되면서 일본 정부의 추가 보조금까지 따라붙었습니다. 2026년 7월 구마모토 일대 지진에서도 팹1은 구조적 피해가 없었고 TSMC 전체 생산능력의 3% 미만 노출에 그쳐, 3나노를 목표로 한 팹2는 여전히 2028년 말 가동을 겨냥하고 있습니다.",
    briefingEn:
      "In 2021 TSMC set up JASM (Japan Advanced Semiconductor Manufacturing) with Sony and Denso as minority partners, with the Japanese government directly funding roughly half of Fab 1's ~¥1 trillion cost — Japan's way of rebuilding a chip industry that had shrunk since the 1990s, starting not with leading-edge nodes but with mature 12–28nm processes (the workhorse nodes for automotive and industrial chips). Fab 1 was completed in February 2024 and began mass production that December; Fab 2, which broke ground in 2024 targeting 6–7nm, was upgraded to a 3nm target per a February 2026 TrendForce report as AI demand grew, bringing further Japanese government subsidies with it. A July 2026 earthquake near Kumamoto caused no structural damage to Fab 1 and exposed under 3% of TSMC's global capacity; Fab 2's 3nm line still targets a late-2028 start.",
    presentLinkKo:
      "미국이 관세로 온쇼어링을 당기는 것과 달리, 일본은 건설비를 직접 대신 내주는 보조금으로 TSMC를 붙잡아 두는 프렌드쇼어링(friend-shoring, 동맹·우호국으로 생산기지를 분산하는 전략) 모델을 씁니다.",
    presentLinkEn:
      "Where the US pulls onshoring with tariffs, Japan practices friend-shoring by simply paying for much of the construction itself — a subsidy-first model rather than a tariff-first one.",
    linkedEconNavIds: ["kumamoto-fab"],
    lastVerified: "2026-09",
  },
  {
    id: "google-pixel-vietnam-china-exit-2023",
    title: "구글 픽셀 생산기지 베트남 이전 (2023–2027)",
    titleEn: "Google Pixel Production Shift to Vietnam (2023–2027)",
    locationName: "박닌 · 베트남 전자 제조벨트",
    locationNameEn: "Bac Ninh · Vietnam Electronics Belt",
    coordinates: [106.0763, 21.1861],
    zoom: 8,
    startYear: 2023,
    yearEnd: 2027,
    theme: "friendshoring",
    parties: ["United States", "Vietnam", "China"],
    briefing:
      "구글은 그동안 픽셀 스마트폰을 사실상 전량 중국에서 설계검증부터 양산까지 진행해 왔는데, 2023년부터 고가 모델 일부를 베트남에서 시험 생산하기 시작하며 기존에 삼성전자가 박닌·타이응우옌에 깔아놓은 전자기기 조립 생태계(삼성의 베트남 수출액이 연 600억 달러대에 이를 만큼 큰 공급망) 위에 올라탔습니다. 2026년 1월 처음으로 픽셀11의 NPI(New Product Introduction, 설계검증·부품통합·생산라인 셋업을 포함하는 양산 직전 최종 검증 단계로 제조 공정 중 가장 까다로운 구간)를 중국을 거치지 않고 베트남에서만 완료했고, 이 성공이 8월 12일 픽셀11 공개, 8월 18일 니혼게이자이 보도로 확인된 '2027년부터 픽셀 스마트폰·워치·이어버드 전량을 중국 생산에서 철수'라는 결정의 근거가 됐습니다. 다만 저가형 픽셀A 시리즈는 당분간 중국 생산을 유지한다고 알려져 있어 완전한 탈중국은 아직 고가 라인에 국한됩니다.",
    briefingEn:
      "Google had previously run Pixel design validation through mass production almost entirely in China, but starting in 2023 it began trial production of premium models in Vietnam, building on the electronics-assembly ecosystem Samsung had already laid down in Bac Ninh and Thai Nguyen (a supply base large enough that Samsung's Vietnam exports alone run in the tens of billions of dollars a year). In January 2026, the Pixel 11's NPI (New Product Introduction — the most technically demanding pre-mass-production phase, covering design validation, component integration and production-line setup) was completed entirely in Vietnam for the first time, without routing through China; that success underpinned the decision — confirmed by the August 12, 2026 Pixel 11 launch and an August 18 Nikkei Asia report — to withdraw all Pixel phones, watches and earbuds from Chinese manufacturing starting in 2027. The budget Pixel A line is reportedly staying in China for now, so the China exit remains confined to the premium lineup.",
    presentLinkKo:
      "NPI를 중국 밖에서 처음으로 통과했다는 사실 자체가 '이전할 수 있다'는 기술적 증거였고, 그래서 전면 철수 발표로 이어졌습니다 — 단순 조립 이전이 아니라 가장 어려운 공정부터 옮긴 순서가 핵심입니다.",
    presentLinkEn:
      "Clearing NPI outside China for the first time was the technical proof that the move was feasible — the sequence matters: Google moved the hardest step first, not just final assembly.",
    linkedEconNavIds: ["vietnam-mfg"],
    lastVerified: "2026-09",
  },
  {
    id: "indonesia-nickel-downstreaming-resource-nationalism-2020",
    title: "인도네시아 니켈 다운스트리밍·자원 국가주의 (2020–)",
    titleEn: "Indonesia Nickel Downstreaming and Resource Nationalism (2020–)",
    locationName: "술라웨시·할마헤라 · 니켈벨트",
    locationNameEn: "Sulawesi · Halmahera Nickel Belt",
    coordinates: [118.0, -2.5],
    zoom: 5.2,
    startYear: 2020,
    theme: "resource-nationalism",
    parties: ["Indonesia", "China"],
    briefing:
      "세계 니켈 공급의 절반 이상을 캐내는 인도네시아는 2014년 한 차례 시도했다 철회한 원광 수출 금지를 2020년부터 확정 시행했습니다 — 원광을 그대로 팔지 않고 국내에서 제련해 부가가치를 남기는 다운스트리밍(downstreaming) 정책으로, 이를 계기로 중국계 자본(칭산 등)이 술라웨시 모로왈리와 할마헤라 웨다베이에 RKEF(로터리킬른-전기로, 니켈선철을 만드는 제련 방식)·HPAL(고압산침출, 배터리급 니켈을 뽑아내는 공정) 제련소를 대거 지었습니다. 2026년 인도네시아는 이번엔 반대편 밸브를 잠갔습니다 — 채굴 자체를 옥죄는 연간 채굴쿼터(RKAB)를 2025년 약 3억7900만 톤에서 2026년 2억6000만~2억7000만 톤으로 약 30% 줄였고, 웨다베이니켈 한 곳만 봐도 배정량이 4200만 톤에서 1200만 톤으로 71% 깎여 2026년 5월 가동을 멈췄습니다. 그 결과 전국 RKEF 가동률이 84%에서 76%로 떨어지고 남·중부 술라웨시 다수 라인이 가동률 50% 밑으로 내려갔는데, 목표는 물량 확대가 아니라 톤당 1만8000~2만 달러 가격대를 떠받치는 가격 결정력 확보라고 정부는 설명합니다.",
    briefingEn:
      "Indonesia, which mines over half the world's nickel, made permanent from 2020 an ore-export ban it had first tried and reversed in 2014 — a downstreaming policy requiring ore to be smelted domestically rather than exported raw, which triggered a wave of Chinese-financed (Tsingshan and others) RKEF (Rotary Kiln–Electric Furnace, a smelting process that makes nickel pig iron) and HPAL (High-Pressure Acid Leach, a process that extracts battery-grade nickel) smelters at Morowali in Sulawesi and Weda Bay in Halmahera. In 2026 Indonesia turned the other valve: it cut the annual mining quota (RKAB) itself, from roughly 379 million tonnes in 2025 to 260–270 million tonnes in 2026 — about 30% — and Weda Bay Nickel alone had its allocation slashed 71%, from 42 million to 12 million tonnes, halting production there by May 2026. National RKEF utilization fell from 84% to 76%, with many lines in South and Central Sulawesi running below 50%; the government frames the goal not as expanding volume but as securing pricing power to hold nickel around $18,000–20,000 per tonne.",
    presentLinkKo:
      "제련까지는 강제로 자국화했지만 그 제련소 자본의 상당수는 여전히 중국계입니다 — 2026년의 채굴량 감산은 '가공은 우리 땅에서, 가격은 우리가 정한다'는 다음 단계 자원 국가주의로 읽힙니다.",
    presentLinkEn:
      "Indonesia forced smelting onshore, but much of that smelter capital is still Chinese — the 2026 mining cuts read as the next stage of resource nationalism: processing stays local, but now Jakarta tries to set the price too.",
    linkedEconNavIds: ["battery-nickel"],
    lastVerified: "2026-09",
  },
  {
    id: "us-bis-affiliates-rule-export-control-2025",
    title: "미 상무부 '50% 계열사 규정' 대중 수출통제 (2025–)",
    titleEn: "US Commerce's '50% Affiliates Rule' China Export Control (2025–)",
    locationName: "워싱턴 D.C. · 미 상무부 산업안보국(BIS)",
    locationNameEn: "Washington, D.C. · US Bureau of Industry and Security",
    coordinates: [-77.04, 38.8938],
    zoom: 10,
    startYear: 2025,
    theme: "export-control",
    parties: ["United States", "China"],
    briefing:
      "미 상무부 산업안보국(BIS)의 수출통제 명단(Entity List, 첨단기술 수출이 금지되는 기업 목록)에는 그동안 허점이 있었습니다 — 명단에 오른 A사가 지분 100%짜리 자회사 B사를 새로 만들어도 B사 자체가 명단에 없으면 B사는 여전히 미국산 첨단칩·장비를 합법적으로 살 수 있었습니다. 2025년 9월 29일 BIS는 이 허점을 막는 '50% 규정(Affiliates Rule)'을 즉시 발효시켰습니다 — 명단 기업이 지분 50% 이상을 보유한 해외 계열사는 그 계열사가 명단에 따로 오르지 않아도 자동으로 같은 통제를 받도록 한 것으로, 우방국 기업의 거래 정리를 위한 60일짜리 임시일반허가만 예외로 뒀습니다. 그런데 두 달여 뒤인 2025년 11월 10일, 베선트 재무장관 주도의 미·중 무역 해빙 국면에서 백악관은 이 규정의 '집행'을 2026년 11월 9일까지 1년간 유예한다고 발표했습니다 — 이 기간에는 원래부터 명단에 올라 있던 기업과 그 기업과 법적으로 분리되지 않은 지점(branch)만 통제 대상이고, 유령·위장회사를 통한 우회 거래 단속 등 다른 수출통제 의무는 그대로 살아 있습니다.",
    briefingEn:
      "There was a real loophole in the US Bureau of Industry and Security's Entity List (the roster of firms barred from receiving advanced US technology): if a listed company spun off a wholly owned subsidiary that itself wasn't named on the list, the subsidiary could still legally buy controlled US chips and equipment. On September 29, 2025, BIS closed that loophole with the immediately effective '50% Affiliates Rule' — any foreign entity 50%-or-more owned by a listed company automatically inherits the same restrictions, even without being individually listed, with only a 60-day temporary general license carved out for allied-country firms to wind down transactions. Then, on November 10, 2025, as part of a US–China trade thaw led by Treasury Secretary Bessent, the White House announced a one-year suspension of the rule's enforcement, through November 9, 2026 — during which only originally listed entities and their legally-indistinct branches remain restricted, though other obligations (like bans on using shell or front companies to evade controls) stay in force.",
    presentLinkKo:
      "2026년 9월 현재 이 규정은 폐지가 아니라 '집행 유예' 상태이고 2026년 11월 9일 자동으로 되살아나도록 예정돼 있습니다 — 기업들이 이 유예 기간을 컴플라이언스 정비 시간으로 쓰라는 경고가 붙어 있는 만큼, 스냅백 시점이 다가올수록 대만·베트남 등으로의 프렌드쇼어링 결정이 다시 앞당겨질 수 있습니다.",
    presentLinkEn:
      "As of September 2026 the rule isn't repealed, only unenforced, and is scheduled to snap back automatically on November 9, 2026 — law firms have told clients to use the pause to shore up compliance, so friend-shoring decisions toward Taiwan, Vietnam and elsewhere could accelerate again as that date approaches.",
    linkedEconNavIds: [],
    lastVerified: "2026-09",
  },
  {
    id: "mexico-nuevo-leon-usmca-nearshoring-2023",
    title: "멕시코 누에보레온 니어쇼어링과 USMCA 재검토 (2023–)",
    titleEn: "Mexico's Nuevo León Nearshoring and the USMCA Review (2023–)",
    locationName: "몬테레이 · 누에보레온",
    locationNameEn: "Monterrey · Nuevo León",
    coordinates: [-100.3161, 25.6866],
    zoom: 8,
    startYear: 2023,
    theme: "nearshoring",
    parties: ["Mexico", "United States"],
    briefing:
      "코로나19 이후 공급망 충격과 미·중 갈등을 겪은 기업들이 지리적으로 가깝고 기존 자유무역협정(USMCA, 미국이 부르는 이름이고 멕시코에서는 T-MEC)을 그대로 쓸 수 있는 인접국으로 생산기지를 옮기는 니어쇼어링(nearshoring)이 2023년 무렵부터 멕시코 북부, 특히 자동차·전자 산업이 몰린 누에보레온주(몬테레이)에 집중됐습니다. 2026년 1분기에만 누에보레온은 자동차 부문에 1억8650만 달러(12개 프로젝트, 고용 1500명)를 유치했는데 — 적시생산(JIT) 조립·부품 서열화를 하는 에모티브모빌리티(1억5000만 달러)와 EV 충전·배터리저장을 하는 VEMO(4660만 달러)가 대표적이며, 이는 멕시코 전체 자동차 투자의 16.8%로 멕시코주·케레타로에 이은 3위 규모입니다. 하지만 이 흐름은 2026년 7월로 예정된 USMCA 정기 재검토 앞에서 조건부입니다 — 재검토에서 자동차·부품의 원산지 규정(역내부가가치 비율 등 무관세 혜택을 받기 위한 최소 요건)이 다시 짜일 수 있어, 누에보레온 투자유치위원회가 관리하는 188건·466억 달러 규모 파이프라인도 협정 조건이 확정되기 전까지는 최종 승인이 미뤄지는 사업이 섞여 있습니다.",
    briefingEn:
      "Nearshoring — moving production to a nearby country that shares an existing free-trade agreement (USMCA in the US, T-MEC in Mexico) — has concentrated since around 2023 in northern Mexico, especially auto- and electronics-heavy Nuevo León state around Monterrey, as firms reacted to COVID-era supply shocks and US–China tension. In Q1 2026 alone, Nuevo León drew $186.5 million in automotive investment across 12 projects and 1,500 jobs — led by Emotiv Mobility ($150 million for just-in-time assembly and parts sequencing) and VEMO ($46.6 million for EV charging and battery storage) — good for 16.8% of Mexico's national auto investment, third behind the State of Mexico and Querétaro. But the trend is conditional on the USMCA's mandated joint review, scheduled for July 2026, which could rewrite automotive rules of origin (the minimum regional-content thresholds required for tariff-free access); Nuevo León's own investment-promotion pipeline of 188 projects worth $46.6 billion includes deals whose final sign-off is being held for the review's outcome.",
    presentLinkKo:
      "니어쇼어링은 지도상으로는 '중국에서 멕시코로 옮겨오는 그림'처럼 보이지만, 실제 투자 확정 속도를 쥐고 있는 건 기업이 아니라 2026년 7월 재검토에서 정해질 원산지 규정입니다.",
    presentLinkEn:
      "On a map, nearshoring looks like production simply migrating from China to Mexico — but the pace of actual capital commitment is being set less by companies than by whatever rules of origin the July 2026 USMCA review locks in.",
    linkedEconNavIds: [],
    lastVerified: "2026-09",
  },
  {
    id: "samsung-sk-hynix-korea-ai-memory-capacity-race-2019",
    title: "삼성·SK하이닉스 한국 AI 메모리 증설 경쟁 (2019–)",
    titleEn: "Samsung–SK Hynix Korea AI Memory Capacity Race (2019–)",
    locationName: "평택·용인 반도체 클러스터",
    locationNameEn: "Pyeongtaek–Yongin Semiconductor Cluster",
    coordinates: [127.2, 37.12],
    zoom: 8.5,
    startYear: 2019,
    theme: "capacity-race",
    parties: ["South Korea", "United States"],
    briefing:
      "2019년 정부가 용인에 반도체 클러스터 부지를 지정한 이래 이어져 온 삼성전자·SK하이닉스의 경기 남부 증설 경쟁이 2025~2026년 AI 메모리 수요를 타고 두 회사가 서로의 공사 일정을 앞당기는 양상으로 격화됐습니다. 삼성은 평택 P4 라인을 준공 전 조기 가동을 허가하는 '임시사용승인' 제도로 원래보다 6개월 당겨, 상층부(Ph4)는 2026년 7월, 하층부(Ph2)는 11월 가동을 목표로 잡았고(총 투자 50조원), 엔비디아의 차세대 AI칩 '베라 루빈'이 2026년 하반기 본격 양산에 들어가는 시점에 맞춰 P4에서 HBM4(고대역폭메모리, AI 가속기에 필수적인 다층 적층 메모리)를 양산하겠다는 목표를 세웠습니다 — P5는 2025년 11월 착공해 2026년 4월 본공사에 들어갔고 투자액은 P5 단독 80조원 이상, 동일 설계를 복제해 검증 절차를 건너뛰는 쌍둥이팹 P5-2까지 합치면 160조원 규모로 커집니다. SK하이닉스는 2026년 8월 7일 이사회에서 용인 Y2(D램, 35.2조원)·청주 M17(낸드·기업용 SSD, 19.1조원) 합계 54.3조원 투자를 확정했는데(Y2는 2027년 7월 착공해 2029년 6월 첫 클린룸을 열고 2031년 10월까지 투자 지속, M17은 2027년 2월 착공해 2028년 12월 첫 클린룸), 더 엘렉 등 일부 매체가 보도한 '용인·청주·서남권 합계 1100조원' 규모 장기 계획은 이번에 확정된 54.3조원과는 별개의, 훨씬 긴 시계의 구상이라는 점에 유의해야 합니다.",
    briefingEn:
      "Samsung and SK Hynix's expansion race in southern Gyeonggi province, running since the government designated the Yongin cluster site in 2019, sharpened in 2025–2026 into each company openly accelerating construction to beat the other, driven by AI memory demand. Samsung is using Korea's 'temporary-use approval' system (which allows a facility to start running before full completion sign-off) to bring Pyeongtaek's P4 line online six months early — its upper floor (Ph4) targeting July 2026 and lower floor (Ph2) targeting November 2026, on a total P4 investment of 50 trillion won — timed to mass-produce HBM4 (High Bandwidth Memory, the stacked memory AI accelerators require) just as Nvidia's next-generation Vera Rubin AI chip enters full production in the second half of 2026; P5 broke ground in November 2025 and began main construction in April 2026, with investment exceeding 80 trillion won for P5 alone, rising to about 160 trillion won once its identical 'twin fab' P5-2 (built to the same design specifically to skip re-verification) is included. SK Hynix's board approved 54.3 trillion won on August 7, 2026, split between Yongin Y2 (DRAM, 35.2 trillion won; groundbreaking July 2027, first cleanroom June 2029, investment running through October 2031) and Cheongju M17 (NAND/enterprise SSD, 19.1 trillion won; groundbreaking February 2027, first cleanroom December 2028) — worth noting that a separately reported, much larger 1,100 trillion won figure for the wider Yongin–Cheongju–southwest Korea cluster (per The Elec) describes a longer-horizon plan distinct from this specific 54.3 trillion won approval, not the same number restated.",
    presentLinkKo:
      "'AI 수요 증가로 투자 확대'라는 요약 대신 봐야 할 건, 두 회사가 엔비디아라는 한 고객사의 칩 양산 일정에 맞춰 자기 공사 일정을 앞당기는 경쟁을 벌이고 있다는 구체적 사실입니다.",
    presentLinkEn:
      "The useful fact isn't a generic 'AI demand is driving investment' — it's that both companies are racing to sync their own construction timelines to one customer's chip schedule: Nvidia's.",
    linkedEconNavIds: ["korea-fab"],
    lastVerified: "2026-09",
  },
];

export function supplyChainShiftEpisodeById(
  id: string,
): SupplyChainShiftEpisode | undefined {
  return SUPPLY_CHAIN_SHIFT_EPISODES.find((e) => e.id === id);
}

export function supplyChainShiftEpisodesLinkedToEconNav(
  navId: string,
): SupplyChainShiftEpisode[] {
  return SUPPLY_CHAIN_SHIFT_EPISODES.filter((e) =>
    e.linkedEconNavIds.includes(navId),
  );
}
