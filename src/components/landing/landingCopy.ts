import type { LabelLanguage } from "@/lib/layerPrefs";

export function pick(lang: LabelLanguage, ko: string, en: string): string {
  return lang === "en" ? en : ko;
}

export function landingCopy(lang: LabelLanguage) {
  const en = lang === "en";
  const t = (ko: string, english: string) => (en ? english : ko);
  return {
    pageTitle: t(
      "Strait Desk — 정보기관 상황실처럼, 바다의 위험을 한눈에",
      "Strait Desk — Like an intelligence watch floor, sea risk in one view",
    ),
    navAria: t("주 메뉴", "Main"),
    navAsk: t("무엇을 알려 주나", "What it shows"),
    navWho: t("누가 쓰나", "Who it's for"),
    navTrust: t("믿을 수 있나", "Can you trust it"),
    openGlobe: t("지구본 열기", "Open the globe"),
    sections: [
      { id: "top", label: t("처음", "Top") },
      { id: "threat", label: t("위협", "Threats") },
      { id: "ask", label: t("질문 넷", "Four questions") },
      { id: "flow", label: t("경보가 뜨면", "When an alert hits") },
      { id: "read", label: t("화면 읽는 법", "How to read it") },
      { id: "extra", label: t("호외", "Extra") },
      { id: "breaking", label: t("속보", "Alerts") },
      { id: "features", label: t("상세 기능", "Features") },
      { id: "devices", label: t("데스크톱·휴대폰", "Desktop and phone") },
      { id: "who", label: t("누가 쓰나", "Who it's for") },
      { id: "name", label: t("이름의 뜻", "The name") },
      { id: "trust", label: t("믿을 수 있나", "Trust") },
      { id: "faq", label: t("자주 묻는 질문", "FAQ") },
    ],
    heroEyebrow: t(
      "해운 위험 상황실 · 홍해 · 호르무즈 · 흑해 · 말라카",
      "Shipping-risk desk · Red Sea · Hormuz · Black Sea · Malacca",
    ),
    heroLine1: t("정보기관 상황실처럼,", "Like an intelligence watch floor,"),
    heroLine2: t("바다의 위험을 한눈에.", "sea risk in one view."),
    heroBody: t(
      "어느 배가 맞았는지, 그 바다가 지금 얼마나 위험한지, 전쟁위험 보험료는 얼마나 올랐는지. 피격 경보가 뜰 때 운항 담당자가 한꺼번에 찾던 답을 3D 지구본 한 화면에 모았습니다.",
      "Which ship was hit, how dangerous that sea is right now, and how far war-risk premiums have moved. The answers an operator hunts for when a strike alert lands, on one 3D globe.",
    ),
    heroRead: t("화면 읽는 법 먼저 보기", "How to read the screen"),
    heroBeta: t("베타 기간에는 가입 없이 바로 볼 수 있어요.", "During beta you can look without signing up."),
    threatEyebrow: t("바다에서 지금 벌어지는 일", "What is happening at sea"),
    threatTitle: t("상선은 드론, 미사일, 기뢰에 맞고 있습니다.", "Merchant ships are being hit by drones, missiles, and mines."),
    stats: [
      { n: 6, s: t("곳", "straits"), label: t("지켜보는 해운 길목", "Shipping chokepoints on watch") },
      { n: 8, s: t("종", "sources"), label: t("서로 맞춰 보는 공개 출처", "Public sources checked against each other") },
      { n: 6, s: t("시간", "hours"), label: t("마다 새로 고르는 사진 뉴스", "Between each photo-news pick") },
      { n: 9, s: t("개", "tools"), label: t("핵심 화면 밖 상세 기능", "Tools beyond the main screen") },
    ],
    askEyebrow: t("경보 하나에 질문 넷", "Four questions, one alert"),
    askTitle1: t("대형 선사는 비싼 해사 정보 서비스로 답을 얻습니다.", "Large lines buy expensive maritime intelligence for the answers."),
    askTitle2: t("이제 뉴스 창 열 개 대신 지구본 하나면 됩니다.", "One globe now stands in for a row of news tabs."),
    questions: [
      {
        q: t("어느 배가 맞았나?", "Which ship was hit?"),
        a: t(
          "영국 해군 해상무역작전본부(UKMTO)와 미국 국가지리정보국(NGA)의 해상 경보를 지도에 찍고, 그 시각 주변을 지나던 배의 위치 신호(AIS)를 함께 띄웁니다.",
          "UKMTO and U.S. NGA maritime warnings are pinned on the map, with the AIS of ships that were nearby at that time.",
        ),
      },
      {
        q: t("그 바다는 지금 얼마나 위험한가?", "How dangerous is that sea right now?"),
        a: t(
          "최근 공격받은 배, 항구·정유소에 떨어진 드론·미사일, 국제 항행경보(NAVAREA)를 한 화면에 겹쳐 봅니다.",
          "Recently attacked ships, drones and missiles that hit ports and refineries, and NAVAREA warnings, stacked on one screen.",
        ),
      },
      {
        q: t("전쟁위험 보험료는 얼마나 올랐나?", "How far have war-risk premiums moved?"),
        a: t(
          "공개 시세가 없는 보험료를 해운·보험 매체 기사에서 찾아 날짜순으로 보여 줍니다. 어느 기사의 어떤 문장에서 나온 숫자인지도 함께 적어요. 해협별 페이지에서 볼 수 있습니다.",
          "There is no public quote, so the figures come from shipping and insurance reports, in date order, with the sentence they came from. See them on each strait page.",
        ),
      },
      {
        q: t("그대로 지나가도 될까?", "Can we still sail through?"),
        a: t(
          "주변 군함·항공모함과 군용기 움직임, 그 바다에 영향을 주는 군사·외교 속보, 해역 날씨(파고·바람, 앞으로 72시간)까지 보고 판단할 수 있게 합니다.",
          "Warships, carriers, and military aircraft nearby, the military and diplomatic alerts that touch that sea, and the weather — waves and wind, out to 72 hours.",
        ),
      },
    ],
    flowEyebrow: t("경보가 뜨면", "When an alert hits"),
    flowTitle: t(
      "피격 경보 한 건이 지구본에서 어떻게 펼쳐지는지, 내려 가며 보세요.",
      "Scroll to see how one strike alert unfolds on the globe.",
    ),
    readEyebrow: t("화면 읽는 법", "How to read the screen"),
    readTitle1: t("반짝이는 데는 다 이유가 있어요.", "Everything that glows is there for a reason."),
    readTitle2: t("색과 모양만 알면 30초 만에 읽힙니다.", "Learn the colors and shapes and you can read it in 30 seconds."),
    read: [
      {
        title: t("배 — 공격받은 배와 항공모함", "Ships — attacked vessels and carriers"),
        body: t(
          "해상 피습 경보가 난 자리에 배 표시가 뜨고, 주변 배들의 위치 신호도 같이 보입니다. 이름이 붙은 큰 배는 항공모함이에요.",
          "A ship mark appears where a maritime attack was reported, with nearby AIS. A large named ship is a carrier.",
        ),
      },
      {
        title: t("불꽃 — 드론·미사일이 떨어진 곳", "Flames — where a drone or missile landed"),
        body: t(
          "발사나 요격이 아니라 실제로 맞았다고 보도된 곳만 켭니다. 항구, 정유소, 바다 위 유조선처럼 해운과 닿은 타격도 함께 보여요.",
          "Only places reported as actually hit, not launches or intercepts. Ports, refineries, and tankers at sea are included when shipping is involved.",
        ),
      },
      {
        title: t("붉은 면 — 전쟁 중인 땅", "Red ground — land at war"),
        body: t(
          "우크라이나 점령 지역, 예멘·레바논의 무장세력 통제 구역처럼 해안을 누가 쥐고 있는지 칠합니다. 그 앞바다가 왜 위험한지 바로 보여요.",
          "Who holds the coast: occupied Ukraine, and armed-group control in Yemen and Lebanon. That is why the water in front of it is dangerous.",
        ),
      },
      {
        title: t("비행기 — 지금 떠 있는 군용기", "Aircraft — military planes in the air now"),
        body: t(
          "항공기 위치 신호(ADS-B)로 해협 위를 나는 정찰기·급유기 같은 군용기를 보여 줍니다. 신호를 끈 비행기는 보이지 않아요.",
          "ADS-B shows reconnaissance aircraft and tankers over the straits. A plane with its signal off is not on the map.",
        ),
      },
      {
        title: t("깜빡이는 점 — 방금 들어온 속보", "A blinking dot — an alert that just arrived"),
        body: t(
          "해상·전선 속보가 가리키는 자리입니다. 테두리 색은 출처가 얼마나 탄탄한지를 뜻해요.",
          "Where a maritime or front-line alert points. The ring color is how solid the sourcing is.",
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
    breakingEyebrow: t("속보 기능", "Alert tools"),
    breakingTitle: t(
      "보험료만이 아니라, 항로에 닿는 정세 속보를 받습니다.",
      "Not only premiums. Political and military alerts that touch a route.",
    ),
    breakingLead: t(
      "중동, 러시아·우크라이나, 중국·대만, 한반도, 남아시아·동남아 같은 권역의 군사·외교 소식을 매체 수십 곳에서 받습니다. 우리가 먼저 묻는 건 하나예요. 이 소식이 어느 길목에 닿고, 배와 보험료에 무슨 뜻일까.",
      "Military and diplomatic reports from the Middle East, Russia and Ukraine, China and Taiwan, the Korean peninsula, and South and Southeast Asia. The first question is which chokepoint it touches, and what it means for ships and premiums.",
    ),
    breakingKinds: [
      {
        tag: t("타격 · 군사", "Strikes"),
        title: t("드론·미사일이 실제로 떨어진 소식", "Drones and missiles that actually landed"),
        body: t(
          "발사 경고나 주장이 아니라, 떨어졌다는 보도가 확인된 것만 타격 속보로 올려요. 항구·에너지 시설·선박이 맞았는지가 핵심입니다.",
          "Not a launch warning or a claim. A strike alert is a report that something landed. What matters is whether a port, energy site, or ship was hit.",
        ),
        flow: t(
          "예) 항만 인근 타격 → 그 길목 통항·보험료에 압력",
          "Example: a hit near a port → pressure on transit and premiums at that chokepoint",
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
          "예) 휴전 협상 진전 → 통항 재개 신호일 수 있음 · 최후통첩 → 위험 상승 신호일 수 있음",
          "Example: ceasefire progress can signal a return to transit · an ultimatum can signal rising risk",
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
      "아직 없는 것. 모든 정세 속보에 「어느 길목에 닿는가」 판정이 자동으로 붙는 건 아닙니다. 위치 태그와 길목별 묶음까지가 지금 범위예요. 속보 하나하나를 휴대폰으로 즉시 보내 주는 푸시는 아직 없습니다. 지금은 하루 한 번의 상황 변화 푸시와 하루 한 번의 메일이 전부예요. 화면에 안 보이는 속보가 있으면 「N건 더 있음」으로 표시해, 조용하다고 안전한 것으로 오해하지 않게 합니다.",
      "Not yet. Not every political alert is automatically tagged with the chokepoint it touches. Location tags and grouping by strait are the current range. There is no instant push for each alert. What exists is one daily “the picture changed” push and one daily email. If alerts are off-screen, the desk says more are waiting, so quiet does not look like safe.",
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
          "해상 피습 경보와 해역 안 선박 속보가 오른쪽에 쌓입니다. 새 사건이 들어오면 큰 창으로 먼저 알려 드려요.",
          "Attack warnings and ship alerts for that sea stack on the right. A new incident opens in a large window first.",
        ),
        where: t("지구본 오른쪽", "Right side of the globe"),
      },
      {
        title: t("전쟁위험 보험료 줄", "War-risk premium line"),
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
        title: t("하루 한 번 메일", "One email a day"),
        body: t(
          "새로 공격받은 배와 보도된 보험료를 매일 한 번 메일로 받습니다. 확인 링크를 눌러야 발송이 시작돼요.",
          "Newly attacked ships and reported premiums, once a day. Mail starts only after you open the confirmation link.",
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
    devicesTitle1: t("상황실은 데스크톱에서,", "The watch floor is the desktop."),
    devicesTitle2: t("휴대폰은 주머니 속 알림창으로.", "The phone is an alert window in your pocket."),
    deskTitle: t("데스크톱 — 주로 쓰는 상황실", "Desktop — the desk you actually use"),
    desk: [
      t("3D 지구본 위에 배·비행기·불꽃·경보를 모두 겹쳐 봅니다.", "Ships, aircraft, flames, and alerts stacked on the 3D globe."),
      t("선박 사건 목록, 보험료 줄, 뉴스 창을 옆에 띄워 두고 함께 봅니다.", "The incident list, the premium line, and the news pane stay open beside it."),
      t("넓은 화면에서 해역 하나를 끝까지 따라가며 판단하는 데 맞춰져 있어요.", "A wide screen is for following one sea all the way through a decision."),
    ],
    phoneTitle: t("휴대폰 — 보조 알림창", "Phone — a secondary alert window"),
    phone: [
      t("무거운 3D 지구본 대신 속보·경보를 글 목록으로 가볍게 봅니다.", "Alerts as a text list, instead of the heavy 3D globe."),
      t("알림을 허용하면 새 소식을 푸시로 받을 수 있어요.", "Allow notifications and new items can arrive as a push."),
      t("홈 화면에 추가하면 앱처럼 바로 열립니다. 자세히 볼 일은 데스크톱에서 이어서 보세요.", "Add it to the home screen and it opens like an app. The close reading still happens on the desktop."),
    ],
    whoEyebrow: t("누가 쓰나", "Who it's for"),
    whoTitle1: t("그대로 지나갈지, 희망봉으로 돌아갈지,", "Sail through, go around the Cape,"),
    whoTitle2: t("출항을 미룰지 정해야 하는 분들께", "or delay sailing — for the people who have to decide."),
    audiences: [
      {
        who: t("해운사 운항·안전 담당", "Operations and security at a shipping line"),
        body: t(
          "피격 경보가 뜬 직후, 우리 배가 그 해역에 있는지와 계속 지나가도 될지를 판단합니다.",
          "Right after a strike alert: is one of our ships in that sea, and can it keep going.",
        ),
      },
      {
        who: t("중소 해운기업·화주", "Smaller lines and cargo owners"),
        body: t(
          "배가 희망봉으로 돌아가거나 출항이 밀리면 선적 일정과 납기가 얼마나 늦어질지 미리 가늠합니다.",
          "If ships divert via the Cape or sailings slip, how late the cargo and the delivery get.",
        ),
      },
      {
        who: t("해상보험 실무자", "Marine insurance desks"),
        body: t(
          "해역별 피격 기록과 보도된 전쟁위험 보험료 흐름을 위험 평가와 요율 판단의 참고 자료로 씁니다.",
          "Strike history by sea, and the reported path of war-risk premiums, as reference for risk and rating.",
        ),
      },
    ],
    straitsEyebrow: t("해협별로 보기", "Strait by strait"),
    straitsTitle: t("배가 꼭 지나야 하는 길목, 하나씩 넘겨 보세요.", "The passages ships cannot avoid. Move through them one by one."),
    straitOpen: t("해협 안내 열기", "Open the strait brief"),
    straits: [
      { slug: "strait-of-hormuz", name: t("호르무즈 해협", "Strait of Hormuz"), en: "STRAIT OF HORMUZ", stat: t("세계 원유 소비량의 약 5분의 1", "About a fifth of the world’s oil consumption"), what: t("페르시아만 원유·LNG가 바다로 나가는 사실상 유일한 출구.", "Effectively the only sea exit for Gulf oil and LNG.") },
      { slug: "bab-el-mandeb", name: t("바브엘만데브 해협", "Bab el-Mandeb"), en: "BAB EL-MANDEB", stat: t("막히면 희망봉 우회, 1~2주 더", "If it closes, the Cape adds one to two weeks"), what: t("홍해와 수에즈 항로의 입구. 후티 공격이 이어지는 바다.", "The entrance to the Red Sea and the Suez route. The water where Houthi attacks continue.") },
      { slug: "suez-canal", name: t("수에즈 운하", "Suez Canal"), en: "SUEZ CANAL", stat: t("아시아↔유럽 가장 짧은 바닷길", "The shortest sea lane between Asia and Europe"), what: t("홍해 쪽 위험이 그대로 이어지는 운하.", "The canal that inherits the risk on the Red Sea side.") },
      { slug: "strait-of-malacca", name: t("말라카 해협", "Strait of Malacca"), en: "STRAIT OF MALACCA", stat: t("중동 원유가 동아시아로 오는 길", "How Middle East oil reaches East Asia"), what: t("한국·중국·일본으로 오는 유조선이 지나는 가장 짧은 길.", "The shortest route for tankers bound for Korea, China, and Japan.") },
      { slug: "taiwan-strait", name: t("대만해협", "Taiwan Strait"), en: "TAIWAN STRAIT", stat: t("동아시아 컨테이너선의 길목", "A lane for East Asian container ships"), what: t("첨단 반도체 생산이 몰린 대만을 끼고 있는 바다.", "The water beside Taiwan, where advanced chipmaking is concentrated.") },
      { slug: "turkish-straits", name: t("튀르키예 해협", "Turkish Straits"), en: "BOSPORUS · DARDANELLES", stat: t("흑해와 지중해를 잇는 유일한 길", "The only link between the Black Sea and the Mediterranean"), what: t("우크라이나·러시아 곡물과 원유가 나가는 통로.", "The passage for Ukrainian and Russian grain and oil.") },
    ],
    nameEyebrow: t("이름의 뜻", "The name"),
    nameTitle: t("왜 ‘Strait Desk’인가요?", "Why “Strait Desk”?"),
    nameSub: t("Strait Desk · 해협을 지켜보는 상황실", "Strait Desk · a watch floor for the straits"),
    name1: t(
      "Strait는 해협입니다. 바브엘만데브(홍해 입구)·호르무즈·말라카처럼, 세계 물동량의 큰 몫이 좁은 길목 몇 곳으로 몰려 지나갑니다.",
      "A strait is a narrow passage. Bab el-Mandeb, Hormuz, Malacca: a large share of world trade is forced through a few of them.",
    ),
    name2: t(
      "Desk는 상황실의 데스크입니다. 홍해의 미사일 한 발이 항로를 바꾸고 해협 하나가 막히면 보험료와 운임이 함께 뛰어오르는데, 경보가 뜬 순간 운항·선적·보험 담당자가 한 책상 위에서 확인해야 할 것들을 모아 둔 곳이에요.",
      "Desk is the watch desk. One missile in the Red Sea reroutes ships, and one closed strait lifts premiums and freight together. This is the table where operations, cargo, and insurance check what they need the moment an alert lands.",
    ),
    name3: t(
      "Strait Desk는 그 길목의 상황을 지구본 위에 한 화면으로 펼쳐 놓습니다. 어느 배가 맞았는지, 그 바다가 얼마나 위험한지를 근거와 한계까지 함께요.",
      "Strait Desk lays that picture on one globe. Which ship was hit, and how dangerous the sea is, with the evidence and the limits.",
    ),
    trustEyebrow: t("믿을 수 있나", "Can you trust it"),
    trustTitle1: t("비밀 자료는 없습니다.", "There is no secret material."),
    trustTitle2: t("공개 정보를 서로 맞춰 봅니다.", "Public sources are checked against each other."),
    trustBody: t(
      "해군 경보, 배와 비행기의 위치 신호, 위성, 언론 보도처럼 공개된 정보(OSINT, 공개 출처 정보)를 한곳에 모으고 출처끼리 얼마나 맞는지 따져서 보여 줍니다. 데이터마다 어디서 왔고 어떤 한계가 있는지는 지구본 안 「데이터 출처」에서 확인할 수 있어요.",
      "Naval warnings, ship and aircraft position signals, satellites, and press reports — public information, gathered in one place and weighed for how well the sources agree. Where each layer came from, and what it cannot say, is under Sources on the globe.",
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
          "지금은 베타 기간이라 가입 없이 바로 볼 수 있습니다. 정식 출시 후에는 알림·해역 판단 같은 일부 기능이 유료가 될 예정이며, 시작 전에 미리 알려 드립니다.",
          "Beta is open without an account. After launch, some tools such as alerts and the sea call are expected to be paid. That will be said before it starts.",
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
          "출처마다 다릅니다. 배·비행기 위치와 전선 속보는 몇 분 단위로, 해상 경보와 보험료 보도는 새 소식이 나올 때마다 반영됩니다.",
          "It depends on the source. Ship and aircraft positions and front-line alerts move on a scale of minutes. Maritime warnings and premium reports update when a new report appears.",
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
    ctaTitle1: t("이 바다,", "This sea —"),
    ctaTitle2: t("지금 지나가도 될까요?", "can we sail through it now?"),
    ctaBody: t(
      "지구본을 열고 해역을 하나 골라 보세요. 가입도, 설치도 필요 없어요.",
      "Open the globe and pick a sea. No account, no install.",
    ),
    footer: t(
      "공개 정보를 모아 보여 주는 서비스이며, 정부·정보기관과는 관계가 없습니다. 항행·보험에 관한 최종 판단은 이용자에게 있습니다.",
      "A service that gathers public information. It has no relationship with a government or an intelligence service. The final call on navigation and insurance stays with you.",
    ),
    curtainSoonNav: (pct: number) => (en ? `Opening soon ${pct}%` : `곧 열려요 ${pct}%`),
    curtainSoon: (pct: number) => (en ? `Opens as soon as it’s ready · ${pct}%` : `준비되면 바로 열려요 · ${pct}%`),
    curtainPct: (pct: number) => (en ? `Globe ${pct}%` : `지구본 ${pct}%`),
    curtainPrep: (pct: number) => (en ? `Open the globe · preparing ${pct}%` : `지구본 열기 · 준비 중 ${pct}%`),
    curtainAria: t("Strait Desk 소개", "About Strait Desk"),
  };
}
