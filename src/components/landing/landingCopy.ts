import type { LabelLanguage } from "@/lib/layerPrefs";

export function pick(lang: LabelLanguage, ko: string, en: string): string {
  return lang === "en" ? en : ko;
}

export function landingCopy(lang: LabelLanguage) {
  const en = lang === "en";
  const t = (ko: string, english: string) => (en ? english : ko);
  return {
    pageTitle: t(
      "conflict-view — 지정학 속보를 근거와 함께, 지구본 위에서",
      "conflict-view — Geopolitical alerts with their evidence, on a globe",
    ),
    navAria: t("주 메뉴", "Main"),
    navAsk: t("묻게 되는 것", "Questions"),
    navWho: t("누가 쓰나", "Who it's for"),
    navTrust: t("믿을 수 있나", "Can you trust it"),
    openGlobe: t("지구본 열기", "Open the globe"),
    sections: [
      { id: "top", label: t("처음", "Top") },
      { id: "ask", label: t("묻게 되는 것", "Questions") },
      { id: "flow", label: t("확인하는 과정", "How it is checked") },
      { id: "read", label: t("화면 읽는 법", "How to read it") },
      { id: "extra", label: t("호외", "Extra") },
      { id: "breaking", label: t("속보", "Alerts") },
      { id: "soon", label: t("준비 중", "Coming") },
      { id: "features", label: t("상세 기능", "Features") },
      { id: "devices", label: t("데스크톱·휴대폰", "Desktop and phone") },
      { id: "who", label: t("누가 쓰나", "Who it's for") },
      { id: "trust", label: t("믿을 수 있나", "Trust") },
      { id: "faq", label: t("자주 묻는 질문", "FAQ") },
    ],
    heroEyebrow: t(
      "지정학 속보 · 출처와 확인 상태 · 3D 지구본",
      "Geopolitical alerts · sources and check status · 3D globe",
    ),
    heroLine1: t("속보는 빠르게,", "Alerts, fast."),
    heroLine2: t("근거는 직접 확인하세요.", "Evidence, yours to check."),
    heroBody: t(
      "전쟁·외교·선거 소식이 어디서 벌어지는지 지구본 위에 찍고, 소식마다 출처와 확인 상태를 붙입니다. 믿을지는 근거를 보고 직접 정하세요.",
      "War, diplomacy, and election news are pinned where they happen, each with its sources and a check status. Whether to believe it is your call, with the evidence in front of you.",
    ),
    heroRead: t("화면 읽는 법 먼저 보기", "How to read the screen"),
    heroBeta: t("베타 기간에는 가입 없이 바로 볼 수 있어요.", "During beta you can look without signing up."),
    stats: [
      { n: 3, s: t("단계", "levels"), label: t("확인 · 유력 · 자료 없음으로 가르는 판정", "Confirmed, likely, no data: the check levels") },
      { n: 6, s: t("곳", "straits"), label: t("먼저 깊게 다룬 해운 길목", "Shipping chokepoints covered first") },
      { n: 8, s: t("종", "sources"), label: t("서로 맞춰 보는 공개 출처", "Public sources checked against each other") },
      { n: 9, s: t("개", "tools"), label: t("핵심 화면 밖 상세 기능", "Tools beyond the main screen") },
    ],
    askEyebrow: t("속보를 읽다 보면", "Reading the news"),
    askTitle1: t("소식은 쏟아지는데, 어디서 벌어진 일인지,", "The news pours in, but where it happened,"),
    askTitle2: t("믿어도 되는지는 알기 어렵습니다.", "and whether to believe it, is hard to tell."),
    questions: [
      {
        q: t("어디서 벌어진 일인가?", "Where did it happen?"),
        a: t(
          "소식마다 위치를 찾아 지구본 위에 점으로 찍습니다. 같은 지역의 소식은 겹쳐 보여서, 무슨 일이 어디에 몰리는지 한눈에 들어와요.",
          "Each item is located and pinned on the globe. Items from one region stack up, so you can see where events cluster.",
        ),
      },
      {
        q: t("정말 확인된 일인가?", "Is it actually confirmed?"),
        a: t(
          "소식마다 출처와 확인 상태를 붙입니다. 여러 출처가 맞으면 ‘확인’, 정황이 한쪽으로 좁혀지면 ‘유력’, 자료가 없으면 ‘자료 없음’이에요. 못 확인한 건 못 했다고 적습니다.",
          "Every item carries its sources and a status. Several sources agree: confirmed. Circumstances point one way: likely. Nothing to check against: no data. What could not be checked says so.",
        ),
      },
      {
        q: t("내가 직접 확인해 볼 수 있나?", "Can I check it myself?"),
        a: t(
          "점을 누르면 근거가 열리고 원문까지 갈 수 있어요. 근거를 보고 직접 판정해 보는 기능은 준비 중입니다.",
          "Tap a pin and the evidence opens, with a link to the original. Judging it yourself before seeing ours is on the way.",
        ),
      },
      {
        q: t("그래서 앞으로 어떻게 되나?", "So where does it go from here?"),
        a: t(
          "지금은 사건과 근거까지예요. 각국이 공식 문서로 밝힌 전략 목표, 선거·당대회 같은 분기점, 갈래별 시나리오는 준비 중입니다.",
          "For now: events and their evidence. National aims stated in official documents, turning points such as elections and party congresses, and scenarios by branch are in preparation.",
        ),
      },
    ],
    flowEyebrow: t("확인하는 과정", "How one is checked"),
    flowTitle: t(
      "속보 하나가 근거로 확인되는 과정을, 내려 가며 보세요.",
      "Scroll to see how one alert is checked against evidence.",
    ),
    flowNote: t(
      "해운 피격 경보를 사례로 보여 드려요. 같은 방식을 지정학 전반으로 넓히고 있습니다.",
      "The example is a maritime strike alert. The same method is being widened to geopolitics in general.",
    ),
    readEyebrow: t("화면 읽는 법", "How to read the screen"),
    readTitle1: t("반짝이는 데는 다 이유가 있어요.", "Everything that glows is there for a reason."),
    readTitle2: t("색과 모양만 알면 30초 만에 읽힙니다.", "Learn the colors and shapes and you can read it in 30 seconds."),
    read: [
      {
        title: t("배 — 공격받은 배와 항공모함", "Ships — attacked vessels and carriers"),
        body: t(
          "해상 피습 경보가 난 자리에 배 표시가 뜨고, 주변 배들의 위치 신호도 같이 보입니다. 이름이 붙은 큰 배는 항공모함이에요. 해운 연재의 핵심 표시입니다.",
          "A ship mark appears where a maritime attack was reported, with nearby AIS. A large named ship is a carrier. This is the core mark of the shipping series.",
        ),
      },
      {
        title: t("불꽃 — 드론·미사일이 떨어진 곳", "Flames — where a drone or missile landed"),
        body: t(
          "발사나 요격이 아니라 실제로 맞았다고 보도된 곳만 켭니다. 도시, 발전소, 정유소, 항구, 바다 위 유조선까지 무엇이 맞았는지 눌러서 확인하세요.",
          "Only places reported as actually hit, not launches or intercepts. Cities, power plants, refineries, ports, tankers at sea. Tap to see what was hit.",
        ),
      },
      {
        title: t("붉은 면 — 전쟁 중인 땅", "Red ground — land at war"),
        body: t(
          "우크라이나 점령 지역, 예멘·레바논의 무장세력 통제 구역처럼 지금 누가 어디를 쥐고 있는지 칠합니다. 속보가 어느 전선에서 나왔는지 바로 보여요.",
          "Who holds what right now: occupied Ukraine, and armed-group control in Yemen and Lebanon. You see at once which front an alert came from.",
        ),
      },
      {
        title: t("비행기 — 지금 떠 있는 군용기", "Aircraft — military planes in the air now"),
        body: t(
          "항공기 위치 신호(ADS-B)로 정찰기·급유기 같은 군용기를 보여 줍니다. 신호를 끈 비행기는 보이지 않아요.",
          "ADS-B shows reconnaissance aircraft and tankers. A plane with its signal off is not on the map.",
        ),
      },
      {
        title: t("깜빡이는 점 — 방금 들어온 속보", "A blinking dot — an alert that just arrived"),
        body: t(
          "방금 들어온 속보가 가리키는 자리입니다. 테두리 색은 출처가 얼마나 탄탄한지, 즉 확인 상태를 뜻해요.",
          "Where a fresh alert points. The ring color is how solid the sourcing is: its check status.",
        ),
      },
      {
        title: t("빛나는 선 — 누가 누구를 돕나", "A glowing line — who is backing whom"),
        body: t(
          "이란·러시아처럼 같은 편끼리 무기와 에너지를 주고받는 관계를 곡선으로 잇습니다. 공격하는 쪽이 어디서 힘을 얻는지 보여요.",
          "Curves link partners such as Iran and Russia that trade weapons and energy. They show where an attacker draws support.",
        ),
      },
    ],
    readFoot: t(
      "지구본 위 무엇이든 누르면 설명 창이 열립니다. 위쪽 「묻기」에 \"홍해\", \"호르무즈\"처럼 적으면 그 바다로 날아가요.",
      "Tap anything on the globe and an explanation opens. Type “Red Sea” or “Hormuz” in Ask and the globe flies there.",
    ),
    breakingEyebrow: t("속보", "Alerts"),
    breakingTitle: t(
      "지정학 속보를 받아, 근거와 함께 보여 드립니다.",
      "Geopolitical alerts, shown with their evidence.",
    ),
    breakingLead: t(
      "중동, 러시아·우크라이나, 중국·대만, 한반도, 남아시아·동남아 같은 권역의 군사·외교 소식을 매체 수십 곳에서 받습니다. 소식마다 위치와 출처, 확인 상태를 붙이고, 해운에 닿는 소식은 길목별로 따로 묶어요.",
      "Military and diplomatic reports from the Middle East, Russia and Ukraine, China and Taiwan, the Korean peninsula, and South and Southeast Asia, from dozens of outlets. Each carries a location, its sources, and a check status. Items that touch shipping are grouped by chokepoint.",
    ),
    breakingKinds: [
      {
        tag: t("타격 · 군사", "Strikes"),
        title: t("드론·미사일이 실제로 떨어진 소식", "Drones and missiles that actually landed"),
        body: t(
          "발사 경고나 주장이 아니라, 떨어졌다는 보도가 확인된 것만 타격 속보로 올려요. 무엇이 맞았는지가 핵심입니다.",
          "Not a launch warning or a claim. A strike alert is a report that something landed. What matters is what was hit.",
        ),
        flow: t(
          "예) 에너지 시설 타격 → 그 지역 공급과 가격에 압력",
          "Example: a hit on an energy site → pressure on supply and prices in that region",
        ),
      },
      {
        tag: t("정세 변화", "Politics"),
        title: t("협상·휴전·제재, 그리고 위협 발언", "Talks, ceasefires, sanctions, and threats"),
        body: t(
          "정상회담, 휴전·정전 협상, 제재, 대사 소환 같은 외교 움직임과 최후통첩·보복 선언 같은 강한 말을 따로 모아요. 좋은 쪽이든 나쁜 쪽이든 방향은 가리지 않습니다.",
          "Summits, ceasefire talks, sanctions, recalled ambassadors, ultimatums, and threats of retaliation. The direction does not matter. Both easing and worsening are collected.",
        ),
        flow: t(
          "예) 휴전 협상 진전 → 긴장 완화 신호일 수 있음 · 최후통첩 → 위험 상승 신호일 수 있음",
          "Example: ceasefire progress can signal easing · an ultimatum can signal rising risk",
        ),
      },
      {
        tag: t("길목 소식", "Chokepoints"),
        title: t("해협을 지나는 배와 돈에 직접 닿는 소식", "News that hits ships and money in a strait"),
        body: t(
          "UKMTO 피습·승선·나포 경보와 항행 경보, 해협의 안보·경제 보도를 길목별로 묶어요. 에너지 공급망에 닿는 소식도 같이 봅니다.",
          "UKMTO attack, boarding, and hijack warnings, navigation warnings, and security and economic reporting, grouped by strait. Energy-supply news is included.",
        ),
        flow: t(
          "예) 해협 인근 경보 → 그 해역 브리프 · 근처 선박 항적 대조",
          "Example: a warning near a strait → that sea’s brief, checked against nearby ship tracks",
        ),
      },
    ],
    breakingNote: t(
      "속보가 많을수록 정말 급한 것이 묻히기 쉬워요. 그래서 많이 띄우기보다, 한 번만 · 근거와 함께 · 급한 것만 알리는 쪽으로 만들었습니다.",
      "A flood of alerts hides the urgent ones. So the desk shows something once, with its sourcing, and only when it is urgent.",
    ),
    breaking: [
      {
        tag: t("새 속보", "New"),
        title: t("중요한 새 속보는 양피지로 펼쳐집니다", "An important new alert opens as a parchment"),
        body: t(
          "접속한 뒤에 새로 나온 중요 속보(또는 10분 안에 나온 것)만 한 번씩 띄워요. 같은 속보가 계속 뜨지 않고, 20초 뒤엔 저절로 넘어갑니다. 다른 안내가 떠 있으면 끝날 때까지 기다렸다 나와요.",
          "Only an important alert that arrives after you open the desk, or within the last 10 minutes, is shown once. It does not repeat, and it steps aside after 20 seconds. If another notice is up, it waits.",
        ),
      },
      {
        tag: t("걸러내기", "Filtered"),
        title: t("반증이 나온 소문은 띄우지 않습니다", "A rumor with a contradicting report is not shown"),
        body: t(
          "속보를 내보내기 전에 최근 72시간 보도와 맞춰 보고, 반대되는 보도가 있으면 발행하지 않아요. 그래도 뉴스 창의 속보 칸에는 「미검증 속보 · 참고용」이라고 붙여 둡니다.",
          "Before an alert is issued it is checked against the last 72 hours. A contradicting report blocks it. The news pane still marks unverified items as unverified, for reference.",
        ),
      },
      {
        tag: t("해상 경보", "At sea"),
        title: t("배가 공격받으면 \"그 바다로 갈까요?\" 하고 묻습니다", "When a ship is attacked, it asks: fly to that sea?"),
        body: t(
          "영국 해군 해상무역작전본부(UKMTO)에 피습·승선·나포 경보가 새로 올라오거나, 미사일·군사훈련처럼 안전과 직결된 항행 경보가 나오면 물어봐요. 「예」를 누르면 그 해역으로 날아가 브리프를 열고, 근처 선박 항적을 맞춰 본 내용도 함께 보여 줍니다. 접속 때 이미 있던 옛 경보는 띄우지 않아요.",
          "A new UKMTO attack, boarding, or hijack warning, or a navigation warning tied to missiles or exercises, asks first. Yes flies to that sea, opens the brief, and shows the nearby-ship check. Warnings that were already there when you arrived are not popped up.",
        ),
      },
      {
        tag: t("속보함", "The tray"),
        title: t("읽은 속보와 안 읽은 속보가 구분됩니다", "Read and unread alerts stay distinct"),
        body: t(
          "지도 화면의 속보 서랍에 쌓이고, 읽은 건 표시되며 「안 연 속보 N」으로 남은 개수가 보여요. 하나씩 넘겨 볼 땐 「3 / 12」처럼 위치가 나오고, 속보 근처의 송유관·가스관이 잠깐 같이 표시됩니다.",
          "They stack in the alert tray. Read ones are marked, and the count of unopened alerts stays visible. Stepping through them shows a position such as 3 / 12, and nearby oil and gas lines appear briefly.",
        ),
      },
      {
        tag: t("소리", "Sound"),
        title: t("가장 급한 것만 소리가 납니다", "Only the most urgent item makes a sound"),
        body: t(
          "S급 속보에만 짧은 SOS 신호음이 울리고, A급은 소리 없이 배너로만 알려요. 사이렌처럼 계속 울리는 소리는 없습니다.",
          "Only an S-level alert plays a short SOS tone. A-level alerts are a silent banner. Nothing keeps wailing like a siren.",
        ),
      },
      {
        tag: t("휴대폰 · 알림", "Phone"),
        title: t("휴대폰은 지구본 없이 알림 목록으로", "On a phone, a list of alerts instead of the globe"),
        body: t(
          "작은 화면에서는 전장별로 묶은 알림·속보 목록이 열립니다. 하루 한 번 \"상황이 바뀌었다\"는 푸시를 받을 수 있고, 변화가 없는 날은 보내지 않아요.",
          "A small screen opens alerts grouped by theater. You can get one push a day when the picture has changed. Quiet days send nothing.",
        ),
      },
    ],
    breakingLimit: t(
      "아직 없는 것. 모든 정세 속보에 「어느 길목에 닿는가」 판정이 자동으로 붙는 건 아닙니다. 위치 태그와 길목별 묶음까지가 지금 범위예요. 속보 하나하나를 휴대폰으로 즉시 보내 주는 푸시도 아직 없습니다. 지금은 하루 한 번의 상황 변화 푸시와 하루 한 번의 해운 요약 메일이 전부이고, 주 4회 지정학 브리핑 메일로 바꾸는 중입니다. 화면에 안 보이는 속보가 있으면 「N건 더 있음」으로 표시해, 조용하다고 안전한 것으로 오해하지 않게 합니다.",
      "Not yet. Not every political alert is automatically tagged with the chokepoint it touches. Location tags and grouping by strait are the current range. There is no instant push for each alert. What exists is one daily “the picture changed” push and one daily shipping email, being changed into a four-times-a-week geopolitics briefing. If alerts are off-screen, the desk says more are waiting, so quiet does not look like safe.",
    ),
    soonEyebrow: t("준비 중", "In preparation"),
    soonTitle: t("다음에 붙일 것들. 아직 화면에는 없습니다.", "What comes next. None of this is on screen yet."),
    soon: [
      {
        tag: t("국가 이니셔티브", "National aims"),
        title: t("각국이 공식 문서로 밝힌 목표를 국가 카드에", "Stated aims on each country card"),
        body: t(
          "미국·중국·러시아·NATO·한국 같은 세력이 안보전략, 국방백서, 당대회 보고서에 직접 적은 목표를 붙이고, 선언과 실제 행동을 나란히 놓아 맞는지 보여 드립니다.",
          "Aims that powers such as the U.S., China, Russia, NATO, and Korea wrote into their own strategies, white papers, and congress reports, with stated words set next to actual behavior.",
        ),
      },
      {
        tag: t("분기점", "Turning points"),
        title: t("한 번의 결과가 몇 해를 정하는 일정", "Dates that set a direction for years"),
        body: t(
          "미국 중간선거, 중국·북한 당대회, 러시아 두마 선거처럼 일정은 미리 알려져 있어요. 다음 분기점까지 남은 날을 세고, 결과가 나오면 무엇이 바뀌는지 이어서 따라갑니다.",
          "U.S. midterms, Chinese and North Korean party congresses, Russian Duma elections. The dates are known ahead. Count down to the next one, then follow what changes after.",
        ),
      },
      {
        tag: t("시나리오", "Scenarios"),
        title: t("점 예측이 아니라 갈래와 관찰 지표", "Branches and signals, not a point forecast"),
        body: t(
          "‘A가 일어난다’가 아니라 ‘A·B·C 중 지금은 B 쪽 근거가 더 쌓였다’로 보여 드립니다. 틀릴 수 있는 전제도 숨기지 않고 적습니다.",
          "Not “A will happen” but “of A, B, and C, the evidence for B is stacking up.” The assumptions that could break it are written out.",
        ),
      },
      {
        tag: t("직접 판정", "Judge it yourself"),
        title: t("근거를 보고 먼저 골라 보기", "Pick before you see ours"),
        body: t(
          "근거를 보고 ‘확인·유력·자료 없음’을 먼저 골라 본 뒤 서비스의 판정과 맞춰 봅니다. 점수나 순위는 없고, 왜 같고 왜 다른지만 보여 줍니다.",
          "Look at the evidence, pick confirmed, likely, or no data, then compare with ours. No points or rankings. Only why they match or differ.",
        ),
      },
      {
        tag: t("아침 메일", "Morning email"),
        title: t("주 4회, 읽는 데 3분이 안 걸리는 브리핑", "Four times a week, under three minutes"),
        body: t(
          "오늘의 큰 그림 한 줄, 핵심 사건 두세 개와 출처, 시나리오 한 컷, 원문 링크를 보내 드립니다. 가입이나 설치 없이 메일만으로 시작합니다.",
          "One line of the big picture, two or three key events with sources, one scenario cut, and links to the originals. It starts with email only. No account, no install.",
        ),
      },
    ],
    soonNote: t(
      "순서와 시기는 바뀔 수 있습니다. 준비되는 대로 이 페이지에 올립니다.",
      "Order and timing may change. Each will be added here as it is ready.",
    ),
    featuresEyebrow: t("상세 기능", "More tools"),
    featuresTitle: t("핵심 화면 말고도, 이런 기능이 있어요.", "Beyond the main screen, these tools are there."),
    features: [
      {
        title: t("뉴스 창", "News"),
        body: t(
          "검증된 보도, 전장별 뉴스, 텔레그램 현지 채널을 한 창에서 봅니다. 기사마다 붙은 지도 버튼을 누르면 그 현장으로 바로 날아가요.",
          "Checked reporting, news by theater, and local Telegram channels in one pane. The map button on an item flies you to the place.",
        ),
        where: t("지구본 아래 「뉴스」 버튼", "News button under the globe"),
      },
      {
        title: t("선박 사건 목록", "Vessel incidents"),
        body: t(
          "해운 연재: 해상 피습 경보와 해역 안 선박 속보가 오른쪽에 쌓입니다. 새 사건이 들어오면 큰 창으로 먼저 알려 드려요.",
          "Shipping series: attack warnings and ship alerts for that sea stack on the right. A new incident opens in a large window first.",
        ),
        where: t("지구본 오른쪽", "Right side of the globe"),
      },
      {
        title: t("전쟁위험 보험료 줄 (해운 연재)", "War-risk premium line (shipping series)"),
        body: t(
          "해역별로 기사에 보도된 보험료를 이전 값과 나란히 보여 주고, 어느 매체의 언제 기사인지 함께 적습니다.",
          "Reported premiums for each sea, next to the previous figure, with the outlet and the date.",
        ),
        where: t("지구본 오른쪽", "Right side of the globe"),
      },
      {
        title: t("오늘의 등불", "Today’s lamp"),
        body: t(
          "6시간마다 지금 꼭 봐야 할 사진 뉴스를 골라 펼쳐 드립니다. 「왜 중요?」를 누르면 그 기사가 바다와 에너지에 왜 중요한지 짧게 풀어 줘요.",
          "Every six hours, one photo story you should see. “Why it matters” says what it means for the sea and for energy.",
        ),
        where: t("지구본을 열면 자동으로", "Opens with the globe"),
      },
      {
        title: t("묻기", "Ask"),
        body: t(
          "\"홍해\", \"호르무즈\"처럼 짧게 적으면 관련 표시가 켜지고 지구본이 그 바다로 이동합니다.",
          "Type a short name such as “Red Sea” or “Hormuz”. The matching layers turn on and the globe flies there.",
        ),
        where: t("지구본 위쪽 검색창 옆", "Next to search, above the globe"),
      },
      {
        title: t("피격 확인", "Strike check"),
        body: t(
          "경보가 뜰 때마다 그 시각 주변을 지나던 배의 항적으로 실제 맞은 배의 후보를 좁혀 봅니다.",
          "When an alert arrives, tracks of ships that were nearby at that time narrow the candidates for the vessel that was hit.",
        ),
        where: t("따로 열리는 페이지", "A separate page"),
        href: "/strikes",
      },
      {
        title: t("기사 확인", "Article check"),
        body: t(
          "속보 기사를 붙여 넣으면 장소와 시각을 뽑아, 지도로 확인되는 것과 확인되지 않는 것을 나눠 보여 줍니다.",
          "Paste an alert story. Place and time are pulled out, then split into what the map can confirm and what it cannot.",
        ),
        where: t("따로 열리는 페이지", "A separate page"),
        href: "/investigate",
      },
      {
        title: t("이메일 요약", "Email digest"),
        body: t(
          "지금 실제로 발송되는 것은 새로 공격받은 배와 보도된 보험료를 담은 해운 요약 메일입니다. 주 4회 지정학 브리핑으로 바꾸는 중이며, 확인 링크를 눌러야 발송이 시작돼요.",
          "What is actually sent today is a shipping digest of newly attacked ships and reported premiums. It is being changed into a four-times-a-week geopolitics briefing. Mail starts only after you open the confirmation link.",
        ),
        where: t("이 페이지 맨 아래", "Bottom of this page"),
      },
      {
        title: t("데이터 출처", "Sources"),
        body: t(
          "표시마다 어디서 온 자료인지, 얼마나 자주 바뀌는지, 무엇을 알 수 없는지를 정리해 두었습니다.",
          "For each layer: where it came from, how often it changes, and what it cannot tell you.",
        ),
        where: t("지구본 왼쪽 메뉴", "Menu on the left of the globe"),
      },
    ],
    devicesEyebrow: t("데스크톱 · 휴대폰", "Desktop and phone"),
    devicesTitle1: t("근거 확인은 데스크톱에서,", "Checking evidence is a desktop job."),
    devicesTitle2: t("휴대폰은 주머니 속 알림창으로.", "The phone is an alert window in your pocket."),
    deskTitle: t("데스크톱 — 근거를 따져 보는 화면", "Desktop — where evidence gets weighed"),
    desk: [
      t("3D 지구본 위에 배·비행기·불꽃·경보를 모두 겹쳐 봅니다.", "Ships, aircraft, flames, and alerts stacked on the 3D globe."),
      t("선박 사건 목록, 보험료 줄, 뉴스 창을 옆에 띄워 두고 함께 봅니다.", "The incident list, the premium line, and the news pane stay open beside it."),
      t("넓은 화면에서 사건 하나의 근거를 끝까지 따라가며 판단하는 데 맞춰져 있어요.", "A wide screen is for following one event\u2019s evidence all the way through."),
    ],
    phoneTitle: t("휴대폰 — 보조 알림창", "Phone — a secondary alert window"),
    phone: [
      t("무거운 3D 지구본 대신 속보·경보를 글 목록으로 가볍게 봅니다.", "Alerts as a text list, instead of the heavy 3D globe."),
      t("알림을 허용하면 새 소식을 푸시로 받을 수 있어요.", "Allow notifications and new items can arrive as a push."),
      t("홈 화면에 추가하면 앱처럼 바로 열립니다. 자세히 볼 일은 데스크톱에서 이어서 보세요.", "Add it to the home screen and it opens like an app. The close reading still happens on the desktop."),
    ],
    whoEyebrow: t("누가 쓰나", "Who it's for"),
    whoTitle1: t("소식은 많고 시간은 없는데,", "Plenty of news, little time,"),
    whoTitle2: t("무엇을 믿을지는 스스로 정하고 싶은 분들께", "and you still want to decide what to believe."),
    audiences: [
      {
        who: t("국제 정세를 따라가는 일반 독자", "Readers who follow world affairs"),
        body: t(
          "뉴스 앱 알림만으로는 어디서 무슨 일이 벌어지는지 그려지지 않을 때, 지구본 위에서 위치와 출처를 함께 확인합니다.",
          "When app alerts do not tell you where things are happening, check location and sources together on the globe.",
        ),
      },
      {
        who: t("지정학을 공부하는 학생·연구자", "Students and researchers of geopolitics"),
        body: t(
          "사건마다 붙은 출처와 확인 상태를 따라가 원문까지 가 보고, 근거가 얇은 소식은 단서로만 다룹니다.",
          "Follow each event to its sources and the original text, and treat thin claims as leads only.",
        ),
      },
      {
        who: t("해운·무역·보험 실무자", "Shipping, trade, and insurance practitioners"),
        body: t(
          "첫 연재 주제인 해운에서는 피격 선박 판정, 해역별 위험, 보도된 전쟁위험 보험료까지 한 흐름으로 볼 수 있습니다.",
          "In the first series, shipping: ship-strike calls, risk by sea, and reported war-risk premiums in one flow.",
        ),
      },
    ],
    straitsEyebrow: t("해운 연재 — 해협별로 보기", "Shipping series — strait by strait"),
    straitsTitle: t("가장 먼저 깊게 다룬 주제, 배가 꼭 지나야 하는 길목입니다.", "The first topic covered in depth: passages ships cannot avoid."),
    straitOpen: t("해협 안내 열기", "Open the strait brief"),
    straits: [
      { slug: "strait-of-hormuz", name: t("호르무즈 해협", "Strait of Hormuz"), en: "STRAIT OF HORMUZ", stat: t("세계 원유 소비량의 약 5분의 1", "About a fifth of the world’s oil consumption"), what: t("페르시아만 원유·LNG가 바다로 나가는 사실상 유일한 출구.", "Effectively the only sea exit for Gulf oil and LNG.") },
      { slug: "bab-el-mandeb", name: t("바브엘만데브 해협", "Bab el-Mandeb"), en: "BAB EL-MANDEB", stat: t("막히면 희망봉 우회, 1~2주 더", "If it closes, the Cape adds one to two weeks"), what: t("홍해와 수에즈 항로의 입구. 후티 공격이 이어지는 바다.", "The entrance to the Red Sea and the Suez route. The water where Houthi attacks continue.") },
      { slug: "suez-canal", name: t("수에즈 운하", "Suez Canal"), en: "SUEZ CANAL", stat: t("아시아↔유럽 가장 짧은 바닷길", "The shortest sea lane between Asia and Europe"), what: t("홍해 쪽 위험이 그대로 이어지는 운하.", "The canal that inherits the risk on the Red Sea side.") },
      { slug: "strait-of-malacca", name: t("말라카 해협", "Strait of Malacca"), en: "STRAIT OF MALACCA", stat: t("중동 원유가 동아시아로 오는 길", "How Middle East oil reaches East Asia"), what: t("한국·중국·일본으로 오는 유조선이 지나는 가장 짧은 길.", "The shortest route for tankers bound for Korea, China, and Japan.") },
      { slug: "taiwan-strait", name: t("대만해협", "Taiwan Strait"), en: "TAIWAN STRAIT", stat: t("동아시아 컨테이너선의 길목", "A lane for East Asian container ships"), what: t("첨단 반도체 생산이 몰린 대만을 끼고 있는 바다.", "The water beside Taiwan, where advanced chipmaking is concentrated.") },
      { slug: "turkish-straits", name: t("튀르키예 해협", "Turkish Straits"), en: "BOSPORUS · DARDANELLES", stat: t("흑해와 지중해를 잇는 유일한 길", "The only link between the Black Sea and the Mediterranean"), what: t("우크라이나·러시아 곡물과 원유가 나가는 통로.", "The passage for Ukrainian and Russian grain and oil.") },
    ],
    trustEyebrow: t("믿을 수 있나", "Can you trust it"),
    trustTitle1: t("비밀 자료는 없습니다.", "There is no secret material."),
    trustTitle2: t("공개 정보를 서로 맞춰 봅니다.", "Public sources are checked against each other."),
    trustBody: t(
      "해군 경보, 배와 비행기의 위치 신호, 위성, 언론 보도처럼 공개된 정보(OSINT, 공개 출처 정보)를 한곳에 모으고 출처끼리 얼마나 맞는지 따져서 보여 줍니다. 근거를 보여 줄 수 없는 판정은 내놓지 않습니다. 데이터마다 어디서 왔고 어떤 한계가 있는지는 지구본 안 「데이터 출처」에서 확인할 수 있어요.",
      "Naval warnings, ship and aircraft position signals, satellites, and press reports — public information, gathered in one place and weighed for how well the sources agree. A call with no evidence to show is not made. Where each layer came from, and what it cannot say, is under Sources on the globe.",
    ),
    sources: [
      ["UKMTO", t("영국 해군 해상 피습 경보", "UK naval warnings of attacks at sea")],
      ["NGA", t("미국 국가지리정보국 해상 경보", "U.S. maritime security warnings")],
      ["NAVAREA", t("국제 항행경보", "International navigation warnings")],
      ["AIS", t("선박 위치 신호", "Ship position signals")],
      ["ADS-B", t("항공기 위치 신호", "Aircraft position signals")],
      ["NASA FIRMS", t("위성 화재·열 감지", "Satellite fire and heat detection")],
      ["Liveuamap", t("전선 속보·점령 지역", "Front-line alerts and occupied ground")],
      [t("해운·보험 매체", "Shipping and insurance press"), t("전쟁위험 보험료 보도", "Reported war-risk premiums")],
    ] as Array<[string, string]>,
    badgeTitle: t("소식마다 붙는 근거 배지", "A sourcing badge on each item"),
    badges: [
      { tag: t("탄탄함", "Solid"), cls: "bg-[#0f766e] text-white", body: t("여러 종류의 공개 출처가 같은 이야기를 해요. 시간이 없으면 여기부터 보세요.", "Several kinds of public sources say the same thing. If you are short on time, start here.") },
      { tag: t("교차확인", "Cross-checked"), cls: "bg-[#1d4ed8] text-white", body: t("서로 다른 출처가 한쪽으로 맞춰졌어요. 천천히 볼 만해요.", "Different sources have lined up. Worth a slower look.") },
      { tag: t("얇음", "Thin"), cls: "bg-[#a16207] text-white", body: t("아직 근거가 적어요. 단서로만 보고 사실처럼 믿지는 마세요.", "The evidence is still thin. Treat it as a lead, not as fact.") },
      { tag: t("모으는 중", "Gathering"), cls: "border border-dashed border-[#a3b3bf] text-[#d7e0e6]", body: t("확인할 자료를 아직 모으고 있어요.", "The material to check is still being gathered.") },
    ],
    badgeFoot: t(
      "근거가 얇은 속보는 크게 띄우지 않습니다. 사라진 게 아니라, 읽기 전에 한 번 걸러 둔 거예요.",
      "Thin alerts are not put up large. They are not gone. They were filtered before you had to read them.",
    ),
    faqEyebrow: t("자주 묻는 질문", "FAQ"),
    faq: [
      {
        q: t("돈을 내야 하나요?", "Do I have to pay?"),
        a: t(
          "지금은 베타 기간이라 가입 없이 바로 볼 수 있습니다. 무엇을 무료로 두고 무엇을 유료로 할지는 아직 정하지 않았어요. 정해지면 시작 전에 이 페이지에서 먼저 알려 드립니다.",
          "Beta is open without an account. What stays free and what becomes paid is not decided yet. It will be announced on this page before anything changes.",
        ),
      },
      {
        q: t("정말 정보기관 자료를 쓰나요?", "Does this really use intelligence-agency material?"),
        a: t(
          "아니요. 비밀 자료는 하나도 없습니다. 해군 경보, 배와 비행기의 위치 신호, 위성 화재 감지, 언론 보도처럼 누구나 볼 수 있는 공개 정보를 모아 서로 맞춰 보여 줍니다. 정부·정보기관과도 관계가 없습니다.",
          "No. There is no classified material. Naval warnings, ship and aircraft signals, satellite fire detection, and press reports — public information, checked against itself. There is no relationship with a government or an intelligence service.",
        ),
      },
      {
        q: t("얼마나 자주 새로 바뀌나요?", "How often does it change?"),
        a: t(
          "출처마다 다릅니다. 배·비행기 위치와 전선 속보는 몇 분 단위로, 해상 경보와 보험료 보도는 새 소식이 나올 때마다 반영됩니다. 이메일 브리핑은 주 4회로 바꾸는 중이에요.",
          "It depends on the source. Ship and aircraft positions and front-line alerts move on a scale of minutes. Maritime warnings and premium reports update when a new report appears. The email briefing is being moved to four times a week.",
        ),
      },
      {
        q: t("우리 배가 지도에 안 보여요.", "Our ship is not on the map."),
        a: t(
          "배가 위치 신호(AIS)를 끄거나, 그 바다에 신호를 받는 곳이 없으면 보이지 않습니다. 그 구간은 '배가 없었다'가 아니라 '자료가 없다'로 봐 주세요.",
          "A ship disappears when it turns AIS off, or when nothing in that sea is receiving the signal. Read that stretch as “no data”, not “no ship was there”.",
        ),
      },
    ],
    ctaTitle1: t("오늘 세계에서", "What happened in the world"),
    ctaTitle2: t("무슨 일이 있었는지, 근거와 함께.", "today, with the evidence."),
    ctaBody: t(
      "지구본을 열고 궁금한 지역을 눌러 보세요. 가입도, 설치도 필요 없어요.",
      "Open the globe and tap a region you are curious about. No account, no install.",
    ),
    footer: t(
      "공개 정보를 모아 보여 주는 서비스이며, 정부·정보기관과는 관계가 없습니다. 판단과 그에 따른 결정은 이용자에게 있습니다.",
      "A service that gathers public information. It has no relationship with a government or an intelligence service. The judgment, and any decision that follows, stays with you.",
    ),
    curtainSoonNav: (pct: number) => (en ? `Opening soon ${pct}%` : `곧 열려요 ${pct}%`),
    curtainSoon: (pct: number) => (en ? `Opens as soon as it’s ready · ${pct}%` : `준비되면 바로 열려요 · ${pct}%`),
    curtainPct: (pct: number) => (en ? `Globe ${pct}%` : `지구본 ${pct}%`),
    curtainPrep: (pct: number) => (en ? `Open the globe · preparing ${pct}%` : `지구본 열기 · 준비 중 ${pct}%`),
    curtainAria: t("conflict-view 소개", "About conflict-view"),
  };
}
