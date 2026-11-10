import type { LabelLanguage } from "@/lib/layerPrefs";
import { BRAND_NAME } from "@/lib/brand";

export function pick(lang: LabelLanguage, ko: string, en: string): string {
  return lang === "en" ? en : ko;
}

export function landingCopy(lang: LabelLanguage) {
  const en = lang === "en";
  const t = (ko: string, english: string) => (en ? english : ko);
  return {
    pageTitle: t(
      `${BRAND_NAME.ko} — 정보기관 상황실처럼, 전선과 일정을 한눈에`,
      `${BRAND_NAME.en} — Like an intelligence watch floor, fronts and dates in one view`,
    ),
    navAria: t("주 메뉴", "Main"),
    navAsk: t("무엇을 알려 주나", "What it shows"),
    navWho: t("누가 쓰나", "Who it's for"),
    navTrust: t("믿을 수 있나", "Can you trust it"),
    openGlobe: t("지구본 열기", "Open the globe"),
    sections: [
      { id: "top", label: t("처음", "Top") },
      { id: "ask", label: t("질문 넷", "Four questions") },
      { id: "flow", label: t("경보가 뜨면", "When an alert hits") },
      { id: "front", label: t("1면", "Front page") },
      { id: "read", label: t("화면 읽는 법", "How to read it") },
      { id: "breaking", label: t("속보", "Alerts") },
      { id: "features", label: t("상세 기능", "Features") },
      { id: "devices", label: t("데스크톱·휴대폰", "Desktop and phone") },
      { id: "who", label: t("누가 쓰나", "Who it's for") },
      { id: "name", label: t("이름의 뜻", "The name") },
      { id: "trust", label: t("믿을 수 있나", "Trust") },
      { id: "faq", label: t("자주 묻는 질문", "FAQ") },
    ],
    heroEyebrow: t(
      "지정학 상황실 · 전선 · 선거 · 헌법",
      "Geopolitics desk · fronts · elections · constitutions",
    ),
    heroLine1: t("정보기관 상황실처럼,", "Like an intelligence watch floor,"),
    heroLine2: t("전선과 일정을 한눈에.", "fronts and dates in one view."),
    heroBody: t(
      "어느 전선이 움직였는지, 다음 공식 일정은 언제인지, 그 나라 헌법에는 뭐라고 적혀 있는지. 속보가 뜰 때 찾던 답을 3D 지구본 한 화면에 모았습니다.",
      "Which front moved, when the next official date is, and what that country’s constitution says. The answers you look up when an alert lands, on one 3D globe.",
    ),
    heroRead: t("화면 읽는 법 먼저 보기", "How to read the screen"),
    heroBeta: t("베타 기간에는 가입 없이 바로 볼 수 있어요.", "During beta you can look without signing up."),
    threatEyebrow: t("전선에서 지금 쓰이는 것", "What the fronts are using"),
    threatTitle: t("드론, 미사일, 기뢰가 전선에서 쓰입니다.", "Drones, missiles, and mines are in use on the fronts."),
    stats: [
      { n: 6, s: t("곳", "places"), label: t("지켜보는 길목", "Passages on watch") },
      { n: 8, s: t("종", "sources"), label: t("서로 맞춰 보는 공개 출처", "Public sources checked against each other") },
      { n: 6, s: t("시간", "hours"), label: t("마다 새로 고르는 사진 뉴스", "Between each photo-news pick") },
      { n: 9, s: t("개", "tools"), label: t("핵심 화면 밖 상세 기능", "Tools beyond the main screen") },
    ],
    askEyebrow: t("경보 하나에 질문 넷", "Four questions, one alert"),
    askTitle1: t("속보, 다음 일정, 헌법을 서로 다른 창에서 찾습니다.", "Alerts, the next date, and the constitution usually live in different windows."),
    askTitle2: t("이제 그 답을 지구본 하나에서 봅니다.", "Those answers now sit on one globe."),
    questions: [
      {
        q: t("어느 전선이 움직였나?", "Which front moved?"),
        a: t(
          "떨어진 곳만 지도에 찍고, 그 땅을 누가 쥐고 있는지를 함께 봅니다. 발사했다는 말만으로는 켜지 않습니다.",
          "Only a reported impact is pinned, together with who holds that ground. A claim that something was launched is not enough.",
        ),
      },
      {
        q: t("다음 공식 일정은 언제인가?", "When is the next official date?"),
        a: t(
          "선거와 당대회를 가까운 날부터 보여 줍니다. 투표일이 없으면 법에 적힌 말만 둡니다. 날짜가 지나면 목록에서 빠지고, 우크라이나 대통령 선거만 새 날짜가 나올 때까지 남습니다.",
          "Elections and party congresses, nearest first. If no polling day is set, only the legal wording stays. A passed date leaves the list. Ukraine’s presidential election stays until a new date is set.",
        ),
      },
      {
        q: t("그 나라 헌법에는 뭐라고 적혀 있나?", "What does that country’s constitution say?"),
        a: t(
          "원문은 그 나라 공식 사이트에서 엽니다. 한 권의 헌법전이 없는 나라는 법에 적힌 기본 문서만 엽니다.",
          "The text opens on that country’s official site. Where there is no single constitution, only the basic document named in that country’s law is opened.",
        ),
      },
      {
        q: t("누가 누구를 돕고 있나?", "Who is backing whom?"),
        a: t(
          "무기와 에너지를 주고받는 관계를 곡선으로 잇습니다. 전선에서 움직이는 쪽이 어디서 힘을 얻는지 보게 합니다.",
          "Curves link partners that trade weapons and energy, so you can see where a side on the front draws support.",
        ),
      },
    ],
    flowEyebrow: t("교차검증 과정", "The cross-check"),
    flowTitle: t(
      "속보 하나를 직접 확인하는 과정을, 한 단계씩 보세요.",
      "Watch one alert get checked, one step at a time.",
    ),
    flowNote: t(
      "예시 속보로 보여 드립니다. 단계를 누르면 그 장면으로 가고, 마우스를 올리면 멈춰요. 6·7단계(직접 판정)는 준비 중입니다.",
      "Shown with an example alert. Click a step to jump to it; hover to pause. Steps 6 and 7 (judging it yourself) are in preparation.",
    ),
    frontEyebrow: t("이메일로 받게 될 모양", "What the email will look like"),
    frontTitle: t("오늘의 지정학 1면, 이런 지면으로 옵니다.", "Today’s geopolitics front page. This is the shape it arrives in."),
    frontLead: t(
      "머리기사 한 건에 확인 상태 도장과 출처를 붙이고, 단신 몇 건과 출처끼리 어긋난 곳을 함께 싣습니다. 아래는 과정을 보여 드리려고 만든 가상의 예시 지면이에요. 주 4회 발송은 준비 중입니다.",
      "One lead story with a status stamp and its sources, a few briefs, and the places where sources disagree. Below is an invented example page made to show the shape. The four-times-a-week send is in preparation.",
    ),
    readEyebrow: t("화면 읽는 법", "How to read the screen"),
    readTitle1: t("반짝이는 데는 다 이유가 있어요.", "Everything that glows is there for a reason."),
    readTitle2: t("색과 모양만 알면 30초 만에 읽힙니다.", "Learn the colors and shapes and you can read it in 30 seconds."),
    read: [
      {
        title: t("표시 — 공격이 보고된 자리", "A mark — where an attack was reported"),
        body: t(
          "공격이 보고된 자리에 표시가 뜨고, 그 근처에서 움직이는 군함도 같이 보입니다. 이름이 붙은 큰 배는 항공모함이에요.",
          "A mark appears where an attack was reported, with warships moving nearby. A large named ship is a carrier.",
        ),
      },
      {
        title: t("불꽃 — 드론·미사일이 떨어진 곳", "Flames — where a drone or missile landed"),
        body: t(
          "발사나 요격이 아니라 실제로 맞았다고 보도된 곳만 켭니다. 항구, 정유소, 군 시설이 그 대상입니다.",
          "Only places reported as actually hit, not launches or intercepts. Ports, refineries, and military sites.",
        ),
      },
      {
        title: t("붉은 면 — 전쟁 중인 땅", "Red ground — land at war"),
        body: t(
          "우크라이나 점령 지역, 예멘·레바논의 무장세력 통제 구역처럼 그 땅을 누가 쥐고 있는지 칠합니다.",
          "Who holds the ground: occupied Ukraine, and armed-group control in Yemen and Lebanon.",
        ),
      },
      {
        title: t("비행기 — 지금 떠 있는 군용기", "Aircraft — military planes in the air now"),
        body: t(
          "항공기 위치 신호(ADS-B)로 전선 위를 나는 정찰기·급유기를 보여 줍니다. 신호를 끈 비행기는 보이지 않아요.",
          "ADS-B shows reconnaissance aircraft and tankers over a front. A plane with its signal off is not on the map.",
        ),
      },
      {
        title: t("깜빡이는 점 — 방금 들어온 속보", "A blinking dot — an alert that just arrived"),
        body: t(
          "전선 속보가 가리키는 자리입니다. 테두리 색은 출처가 얼마나 탄탄한지를 뜻해요.",
          "Where a front-line alert points. The ring color is how solid the sourcing is.",
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
      "지구본 위 무엇이든 누르면 설명 창이 열립니다. 위쪽 「묻기」에 \"홍해\", \"호르무즈\", \"대만\"처럼 적으면 그 전선으로 날아가요.",
      "Tap anything on the globe and an explanation opens. Type “Red Sea”, “Hormuz”, or “Taiwan” in Ask and the globe flies to that front.",
    ),
    breakingEyebrow: t("속보 기능", "Alert tools"),
    breakingTitle: t(
      "전선에 닿는 군사·외교 속보를 받습니다.",
      "Military and diplomatic alerts that touch a front.",
    ),
    breakingLead: t(
      "중동, 러시아·우크라이나, 중국·대만, 한반도, 남아시아·동남아의 군사·외교 소식을 매체 수십 곳에서 받습니다. 먼저 묻는 건 하나예요. 이 소식이 어느 전선에 닿고, 다음 일정과 어떻게 겹치는가.",
      "Military and diplomatic reports from the Middle East, Russia and Ukraine, China and Taiwan, the Korean peninsula, and South and Southeast Asia. The first question is which front it touches, and how it sits next to the next official date.",
    ),
    breakingKinds: [
      {
        tag: t("타격 · 군사", "Strikes"),
        title: t("드론·미사일이 실제로 떨어진 소식", "Drones and missiles that actually landed"),
        body: t(
          "발사 경고나 주장이 아니라, 떨어졌다는 보도가 확인된 것만 타격 속보로 올려요. 항구·에너지 시설·군 시설이 맞았는지가 핵심입니다.",
          "Not a launch warning or a claim. A strike alert is a report that something landed. What matters is whether a port, an energy site, or a military site was hit.",
        ),
        flow: t(
          "예) 항구 인근 타격 → 그 전선의 브리프를 엽니다",
          "Example: a hit near a port → open that front’s brief",
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
          "예) 휴전 협상 → 전선이 잦아들 수 있음 · 최후통첩 → 전선이 커질 수 있음",
          "Example: ceasefire talks can mean a quieter front · an ultimatum can mean a wider one",
        ),
      },
      {
        tag: t("길목 소식", "Chokepoints"),
        title: t("길목의 안보와 정치에 닿는 소식", "News that touches a passage’s security and politics"),
        body: t(
          "공격 경보와 그 길목의 안보·정치 보도를 한곳으로 묶어요. 에너지에 닿는 소식도 같이 봅니다.",
          "Attack warnings and the security and political reporting for that passage, in one place. Energy news is included.",
        ),
        flow: t(
          "예) 길목 인근 경보 → 그 전선 브리프 · 다음 공식 일정",
          "Example: a warning near a passage → that front’s brief, and the next official date",
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
        tag: t("전선 경보", "On a front"),
        title: t("공격이 보고되면 \"그 전선으로 갈까요?\" 하고 묻습니다", "When an attack is reported, it asks: fly to that front?"),
        body: t(
          "미사일·군사훈련처럼 그 전선과 직결된 경보가 새로 나오면 물어봐요. 「예」를 누르면 그곳으로 날아가 브리프를 엽니다. 접속 때 이미 있던 옛 경보는 띄우지 않아요.",
          "A new warning tied to missiles or exercises on that front asks first. Yes flies there and opens the brief. Warnings that were already there when you arrived are not popped up.",
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
      "아직 없는 것. 모든 정세 속보에 「어느 전선에 닿는가」 판정이 자동으로 붙는 건 아닙니다. 위치 태그와 전선별 묶음까지가 지금 범위예요. 속보 하나하나를 휴대폰으로 즉시 보내 주는 푸시는 아직 없습니다. 지금은 하루 한 번의 상황 변화 푸시와 하루 한 번의 메일이 전부예요. 화면에 안 보이는 속보가 있으면 「N건 더 있음」으로 표시해, 조용하다고 끝난 것으로 오해하지 않게 합니다.",
      "Not yet. Not every political alert is automatically tagged with the front it touches. Location tags and grouping by front are the current range. There is no instant push for each alert. What exists is one daily “the picture changed” push and one daily email. If alerts are off-screen, the desk says more are waiting, so quiet does not look like over.",
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
        title: t("전선 속보 목록", "Front-line alerts"),
        body: t(
          "그 전선의 공격 보고가 오른쪽에 쌓입니다. 새 소식이 들어오면 큰 창으로 먼저 알려 드려요.",
          "Attack reports for that front stack on the right. A new item opens in a large window first.",
        ),
        where: t("지구본 오른쪽", "Right side of the globe"),
      },
      {
        title: t("국가 중대 일정", "Major national dates"),
        body: t(
          "선거와 당대회를 가까운 날부터 보여 주고, 날짜의 근거가 된 공식 글을 함께 엽니다.",
          "Elections and party congresses, nearest first, with the official text the date comes from.",
        ),
        where: t("지구본 오른쪽", "Right side of the globe"),
      },
      {
        title: t("오늘의 등불", "Today’s lamp"),
        body: t(
          "6시간마다 지금 꼭 봐야 할 사진 뉴스를 골라 펼쳐 드립니다. 「왜 중요?」를 누르면 그 기사가 어느 전선과 닿는지 짧게 풀어 줘요.",
          "Every six hours, one photo story you should see. “Why it matters” says which front it touches.",
        ),
        where: t("지구본을 열면 자동으로", "Opens with the globe"),
      },
      {
        title: t("묻기", "Ask"),
        body: t(
          "\"홍해\", \"호르무즈\", \"대만\"처럼 짧게 적으면 관련 표시가 켜지고 지구본이 그 전선으로 이동합니다.",
          "Type a short name such as “Red Sea”, “Hormuz”, or “Taiwan”. The matching layers turn on and the globe flies to that front.",
        ),
        where: t("지구본 위쪽 검색창 옆", "Next to search, above the globe"),
      },
      {
        title: t("타격 확인", "Strike check"),
        body: t(
          "경보가 뜨면 그 장소와 시각을 지도의 다른 자료와 맞춰, 보도와 맞는 것과 맞지 않는 것을 나눕니다.",
          "When an alert arrives, its place and time are checked against the other layers, and split into what matches and what does not.",
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
          "전선에서 새로 확인된 공격을 매일 한 번 메일로 받습니다. 확인 링크를 눌러야 발송이 시작돼요.",
          "Newly confirmed attacks on the fronts, once a day. Mail starts only after you open the confirmation link.",
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
      t("3D 지구본 위에 전선·비행기·불꽃·경보를 모두 겹쳐 봅니다.", "Fronts, aircraft, flames, and alerts stacked on the 3D globe."),
      t("전선 속보, 국가 중대 일정, 뉴스 창을 옆에 띄워 두고 함께 봅니다.", "Front-line alerts, major dates, and the news pane stay open beside it."),
      t("넓은 화면에서 전선 하나를 끝까지 따라가며 읽는 데 맞춰져 있어요.", "A wide screen is for following one front all the way through."),
    ],
    phoneTitle: t("휴대폰 — 보조 알림창", "Phone — a secondary alert window"),
    phone: [
      t("무거운 3D 지구본 대신 속보·경보를 글 목록으로 가볍게 봅니다.", "Alerts as a text list, instead of the heavy 3D globe."),
      t("알림을 허용하면 새 소식을 푸시로 받을 수 있어요.", "Allow notifications and new items can arrive as a push."),
      t("홈 화면에 추가하면 앱처럼 바로 열립니다. 자세히 볼 일은 데스크톱에서 이어서 보세요.", "Add it to the home screen and it opens like an app. The close reading still happens on the desktop."),
    ],
    whoEyebrow: t("누가 쓰나", "Who it's for"),
    whoTitle1: t("전선이 어디로 움직이는지,", "Where a front is moving,"),
    whoTitle2: t("다음 일정이 언제인지 읽는 분들께", "and when the next date falls — for the people who read that."),
    audiences: [
      {
        who: t("전선을 읽는 사람", "People reading a front"),
        body: t(
          "속보가 뜬 직후, 그 땅을 누가 쥐고 있는지와 공격이 어디에 떨어졌는지를 한 화면에서 봅니다.",
          "Right after an alert: who holds the ground, and where the impact was reported, on one screen.",
        ),
      },
      {
        who: t("다음 선거와 당대회를 보는 사람", "People watching the next election or congress"),
        body: t(
          "가까운 공식 일정부터 보고, 투표일이 없으면 법에 적힌 말만 확인합니다.",
          "The nearest official date first. If no polling day is set, only the legal wording.",
        ),
      },
      {
        who: t("헌법과 공식 글을 대조하는 사람", "People checking a constitution against the official text"),
        body: t(
          "그 나라 공식 사이트의 헌법, 또는 헌법전이 없으면 기본법을 열어 일정 옆에서 읽습니다.",
          "The constitution on that country’s official site, or the basic law where there is no single constitution, read beside the dates.",
        ),
      },
    ],
    straitsEyebrow: t("길목별로 보기", "Passage by passage"),
    straitsTitle: t("전선이 맞닿는 길목, 하나씩 넘겨 보세요.", "The passages where fronts meet. Move through them one by one."),
    straitOpen: t("전선 안내 열기", "Open the front brief"),
    straits: [
      { slug: "strait-of-hormuz", name: t("호르무즈 해협", "Strait of Hormuz"), en: "STRAIT OF HORMUZ", stat: t("이란 앞바다. 다음 선거일은 아직 없음", "Off Iran. The next polling day is not set"), what: t("걸프 전선이 모이는 좁은 바다. 의회·대통령 선거를 2028년에 치른다는 말만 있습니다.", "The narrow water where the Gulf front gathers. Officials have only said the parliamentary and presidential votes fall in 2028.") },
      { slug: "bab-el-mandeb", name: t("바브엘만데브 해협", "Bab el-Mandeb"), en: "BAB EL-MANDEB", stat: t("후티가 홍해 입구를 압박", "The Houthis press the Red Sea gate"), what: t("홍해로 들어가는 입구. 예멘 전선이 이 바다까지 이어집니다.", "The gate into the Red Sea. Yemen’s front reaches this water.") },
      { slug: "suez-canal", name: t("수에즈 운하", "Suez Canal"), en: "SUEZ CANAL", stat: t("홍해 전선이 이어지는 운하", "The canal the Red Sea front runs into"), what: t("아시아와 유럽이 맞닿는 자리. 홍해에서 일어난 일이 그대로 올라옵니다.", "Where Asia and Europe meet. What happens in the Red Sea comes straight up.") },
      { slug: "strait-of-malacca", name: t("말라카 해협", "Strait of Malacca"), en: "STRAIT OF MALACCA", stat: t("동남아시아의 좁은 길목", "The narrow passage of Southeast Asia"), what: t("말레이시아·인도네시아·싱가포르가 맞닿고, 동아시아 전선으로 이어집니다.", "Malaysia, Indonesia, and Singapore meet here, on the way to the East Asian fronts.") },
      { slug: "taiwan-strait", name: t("대만해협", "Taiwan Strait"), en: "TAIWAN STRAIT", stat: t("지방공직 선거 2026년 11월 28일", "Local elections, 28 November 2026"), what: t("대만과 중국이 맞닿은 바다. 다음 공식 일정은 그 지방선거입니다.", "The water between Taiwan and China. The next official date is those local elections.") },
      { slug: "turkish-straits", name: t("튀르키예 해협", "Turkish Straits"), en: "BOSPORUS · DARDANELLES", stat: t("법령상 선거일 2028년 5월 7일", "The statutory election day is 7 May 2028"), what: t("흑해 전쟁과 지중해를 잇는 길. 조기 선거를 정하지 않으면 그 일요일입니다.", "The link between the Black Sea war and the Mediterranean. That Sunday holds unless an early election is called.") },
    ],
    nameEyebrow: t("서비스 소개", "About"),
    nameTitle: t("속보를 근거로 확인합니다.", "Geopolitical alerts, checked against evidence."),
    nameSub: t(`${BRAND_NAME.ko} · 근거로 확인하는 지정학 속보`, `${BRAND_NAME.en} · geopolitical alerts, checked against evidence`),
    name1: t(
      "속보가 들어오면 출처와 위치를 함께 보여 줍니다.",
      "When an alert comes in, we show its source and location.",
    ),
    name2: t(
      "선거 같은 공식 일정과 헌법 원문을 이어서 살펴봅니다.",
      "We connect alerts to official dates, such as elections, and to constitutional texts.",
    ),
    name3: t(
      "무엇이 확인됐고 무엇이 아직 불분명한지 출처와 함께 나란히 둡니다.",
      "We show what is confirmed and what remains unclear, alongside the sources.",
    ),
    trustEyebrow: t("믿을 수 있나", "Can you trust it"),
    trustTitle1: t("비밀 자료는 없습니다.", "There is no secret material."),
    trustTitle2: t("공개 정보를 서로 맞춰 봅니다.", "Public sources are checked against each other."),
    trustBody: t(
      "전선 속보, 비행기 위치 신호, 위성, 각국 공식 글, 언론 보도처럼 공개된 정보를 한곳에 모으고 출처끼리 얼마나 맞는지 따져서 보여 줍니다. 데이터마다 어디서 왔고 어떤 한계가 있는지는 지구본 안 「데이터 출처」에서 확인할 수 있어요.",
      "Front-line alerts, aircraft signals, satellites, official texts, and press reports — public information, gathered in one place and weighed for how well the sources agree. Where each layer came from, and what it cannot say, is under Sources on the globe.",
    ),
    sources: [
      [t("각국 선거 공식 글", "Official election texts"), t("투표일·임기·당대회", "Polling days, terms, party congresses")],
      [t("각국 헌법 원문", "Constitutional texts"), t("그 나라 공식 사이트의 현행본", "The current text on that country’s official site")],
      ["Liveuamap", t("전선 속보·점령 지역", "Front-line alerts and occupied ground")],
      ["ADS-B", t("군용기 위치 신호", "Military aircraft signals")],
      ["NASA FIRMS", t("위성 화재·열 감지", "Satellite fire and heat detection")],
      [t("언론 보도", "Press reports"), t("떨어진 곳과 외교 움직임", "Reported impacts and diplomatic moves")],
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
          "지금은 베타 기간이라 가입 없이 바로 볼 수 있습니다. 정식 출시 후에는 알림 같은 일부 기능이 유료가 될 예정이며, 시작 전에 미리 알려 드립니다.",
          "Beta is open without an account. After launch, some tools such as alerts are expected to be paid. That will be said before it starts.",
        ),
      },
      {
        q: t("정말 정보기관 자료를 쓰나요?", "Does this really use intelligence-agency material?"),
        a: t(
          "아니요. 비밀 자료는 하나도 없습니다. 전선 속보, 비행기 위치 신호, 위성 화재 감지, 각국 공식 글, 언론 보도처럼 누구나 볼 수 있는 공개 정보를 모아 서로 맞춰 보여 줍니다. 정부·정보기관과도 관계가 없습니다.",
          "No. There is no classified material. Front-line alerts, aircraft signals, satellite fire detection, official texts, and press reports — public information, checked against itself. There is no relationship with a government or an intelligence service.",
        ),
      },
      {
        q: t("얼마나 자주 새로 바뀌나요?", "How often does it change?"),
        a: t(
          "출처마다 다릅니다. 비행기 위치와 전선 속보는 몇 분 단위로 바뀌고, 공식 일정은 그 나라 글이 새로 나올 때 고칩니다.",
          "It depends on the source. Aircraft positions and front-line alerts move on a scale of minutes. Official dates change when that country publishes a new text.",
        ),
      },
      {
        q: t("지난 선거는 왜 안 보이나요?", "Why is a past election missing?"),
        a: t(
          "날짜가 지나면 목록에서 빠집니다. 우크라이나 대통령 선거만, 새 날짜가 나오기 전까지 지난 날을 남겨 둡니다.",
          "A passed date leaves the list. Ukraine’s presidential election stays until a new date is set.",
        ),
      },
    ],
    ctaTitle1: t("이 전선,", "This front —"),
    ctaTitle2: t("지금 무엇이 움직이나요?", "what is moving on it now?"),
    ctaBody: t(
      "지구본을 열고 길목을 하나 골라 보세요. 가입도, 설치도 필요 없어요.",
      "Open the globe and pick a passage. No account, no install.",
    ),
    footer: t(
      "공개 정보를 모아 보여 주는 서비스이며, 정부·정보기관과는 관계가 없습니다. 전선과 일정에 관한 최종 판단은 이용자에게 있습니다.",
      "A service that gathers public information. It has no relationship with a government or an intelligence service. The final reading of a front or a date stays with you.",
    ),
    curtainSoonNav: (pct: number) => (en ? `Opening soon ${pct}%` : `곧 열려요 ${pct}%`),
    curtainSoon: (pct: number) => (en ? `Opens as soon as it’s ready · ${pct}%` : `준비되면 바로 열려요 · ${pct}%`),
    curtainPct: (pct: number) => (en ? `Globe ${pct}%` : `지구본 ${pct}%`),
    curtainPrep: (pct: number) => (en ? `Open the globe · preparing ${pct}%` : `지구본 열기 · 준비 중 ${pct}%`),
    curtainAria: t(`${BRAND_NAME.ko} 소개`, `About ${BRAND_NAME.en}`),
  };
}
