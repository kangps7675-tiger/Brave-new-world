/**
 * 허브 nav 항목별 양피지 브리프 — 논픽션·공개 기록에 근거.
 * 추정·선전·과장 없이, 인정/주장/조약/관측을 구분하여 서술.
 */

import type { NavSelection } from "@/data/navRegions";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { SIPRI_ARMS_LENS_ENABLED } from "@/lib/licensing/sipriPolicy";
import { edgesForHub, AXIS_NODES, type AxisHubId } from "@/data/axisNetwork";
import { hubById } from "@/data/hubNav";
import { BRAND_NAME } from "@/lib/brand";

export type HubBriefDoc = {
  title: string;
  paragraphs: string[];
  signOff: string;
  /** 주장·분쟁 외교사: A급 속보 타전음 */
  playBreakingDispatch: boolean;
};

const SIGN_KO = `${BRAND_NAME.ko}\n지구본 관측대 · 참고 브리프`;
const SIGN_EN = `${BRAND_NAME.en}\nGlobe Observatory · reference brief`;

function doc(
  title: string,
  paragraphs: string[],
  playBreakingDispatch: boolean,
  lang: LabelLanguage,
): HubBriefDoc {
  return {
    title,
    paragraphs,
    signOff: lang === "en" ? SIGN_EN : SIGN_KO,
    playBreakingDispatch,
  };
}

const NETWORK: Record<AxisHubId, { ko: HubBriefDoc; en: HubBriefDoc }> = {
  CHN: {
    ko: doc(
      "중국 · 국경 · 우군 관계망",
      [
        "중국은 유엔 안전보장이사회 상임이사국이며, 동아시아·인도태평양·유라시아를 잇는 광역 행위자입니다. 지도에 잠시 나타나는 국경선과 호(弧)는 동맹 조약의 목록이 아니며, 공개된 외교·에너지·안보 연계의 뼈대를 보여 줍니다.",
        "베이징은 대만 문제에 ‘하나의 중국’ 원칙을 적용한다고 밝히며, 남중국해에서 구단선(nine-dash line)에 기초한 해양 주장을 유지합니다. 센카쿠(중국명 댜오위다오) 영유권은 일본과 충돌하고, 아루나찰프라데시(중국명 짱난) 관할 주장은 인도와 충돌합니다. 이 주장들은 국제법적으로 합의된 최종 경계가 아니며, 분쟁 당사국의 공식 입장입니다.",
        "중국은 파키스탄과 CPEC(중국–파키스탄 경제회랑)를 추진하고, 중앙아시아와는 가스·벨트앤드로드로 연결됩니다. 사우디·UAE와는 에너지·금융 협력을 이어 가고, 미얀마와는 국경·자원 루트가 공개되어 있으며, 러시아와는 ‘무제한’에 가까운 전략적 파트너십이 기록되어 있습니다. 중·이란 사이에는 원유 구매와 장기 협력 틀이 보도되었습니다.",
        "화면의 관계는 우호·의존·거래가 섞인 네트워크입니다. 이를 단일 군사 동맹으로 단정하지는 않습니다.",
      ],
      false,
      "ko",
    ),
    en: doc(
      "China · Borders · Partner network",
      [
        "China is a UN Security Council permanent member and a continental actor spanning East Asia, the Indo-Pacific, and Eurasia. The borders and arcs briefly shown on the map are not a treaty checklist; they outline publicly recorded diplomatic, energy, and security linkages.",
        "Beijing applies its One China principle to Taiwan and maintains maritime claims in the South China Sea based on the nine-dash line. Disputes also cover the Senkaku/Diaoyu Islands with Japan and Arunachal Pradesh (Zangnan in Chinese usage) with India. These are official claims—not settled final borders under a single agreed international settlement.",
        "On the partner side, public records include CPEC with Pakistan, Central Asian gas and Belt-and-Road links, energy and finance ties with Saudi Arabia and the UAE, Myanmar border and resource corridors, and a deep strategic partnership with Russia. China–Iran relations include reported oil purchases and longer-term cooperation frameworks.",
        "What you see is a mixed network of friendship, dependence, and trade—not a single formal military alliance.",
      ],
      false,
      "en",
    ),
  },
  RUS: {
    ko: doc(
      "러시아 · 국경 · 우군 관계망",
      [
        "러시아는 유라시아 최대 영토 국가이자 유엔 안보리 상임이사국입니다. 2014년 이후 러시아는 크림 병합을 자국 영토 편입으로 주장해 왔고, 2022년 2월 이후 우크라이나 전면전에 들어갔습니다. 국제사회 다수는 이 병합과 점령을 인정하지 않습니다.",
        "지도에 이어진 호는 CSTO·에너지·군사 주둔으로 연결된 축을 보여 줍니다. 벨라루스와는 동맹국가(Union State) 수준의 안보 결합이 있으며, 카자흐·키르기스·타지키스탄과는 CSTO·기지·가스 관계가 공개되어 있습니다. 시리아에는 장기간 군사 주둔이 이어져 왔습니다.",
        "우크라이나 전쟁 이후 이란과의 군수·드론 협력이 반복적으로 보도되었고, 북한과의 군수·조약·노동·사이버 연계도 제기되었습니다. 중국과는 전략적 파트너십이 이어지며, 이중용도·결제 우회 논의가 병행됩니다. 개별 링크의 성격을 일반화하기보다, 공개 자료의 시점을 함께 확인하는 편이 안전합니다.",
      ],
      false,
      "ko",
    ),
    en: doc(
      "Russia · Borders · Partner network",
      [
        "Russia is Eurasia’s largest territorial state and a UN Security Council permanent member. Since 2014 it has treated Crimea as annexed territory; since February 2022 it has waged a full-scale war in Ukraine. Most of the international community does not recognize the annexation or occupations.",
        "The arcs on the map trace CSTO, energy, and basing ties: a Union State-level security bond with Belarus; CSTO, bases, and gas links across Kazakhstan, Kyrgyzstan, and Tajikistan; and long-standing military presence in Syria.",
        "Since the Ukraine war, reporting has repeatedly highlighted arms and drone cooperation with Iran and arms, treaty, labor, and cyber linkages with North Korea. With China, strategic partnership sits alongside dual-use and payment-bypass concerns. Do not flatten every link into one category—check public timelines.",
      ],
      false,
      "en",
    ),
  },
  PRK: {
    ko: doc(
      "북한 · 국경 · 우군 관계망",
      [
        "조선민주주의인민공화국(북한)은 한반도 북부에 위치하며, 핵·미사일 프로그램을 국가 안보의 핵심으로 공표해 왔습니다. 유엔 안전보장이사회는 핵·미사일 관련 제재를 장기간 유지해 왔습니다.",
        "중국과는 국경·후원 관계가 구조적으로 두껍고, 러시아와는 전시·전후 군수·조약 협력이 보도되어 왔습니다. 이란과는 미사일·군수·하이브리드 연계 의혹이 국제기구·정보기관 보고에 자주 등장합니다. 시리아·예멘·벨라루스·쿠바·베네수엘라와는 외교·군수 성격의 연결이 단편적으로 기록되어 있습니다.",
        "2023년 말 노동당 전원회의 등에서 김정은은 ‘통일’을 국가 과제로 두지 않겠다는 취지를 공식화하고, 대한민국을 화해·통일의 상대가 아닌 적대적 국가로 규정하는 방향으로 노선을 전환했습니다. 이후 통일 관련 기구·상징물 철거와 헌법 서술 변경 등 후속 조치가 보도되었습니다. 과거 ‘조국 통일’ 선전과는 결이 다릅니다.",
        "이 네트워크는 NATO식 집단방위 조약과 같지 않습니다. 제재 환경 속에서 북한은 생존·기술·외화 확보를 위해 선택적으로 연대하며, 그 겹침이 관계망으로 나타납니다.",
      ],
      false,
      "ko",
    ),
    en: doc(
      "DPRK · Borders · Partner network",
      [
        "The Democratic People’s Republic of Korea sits in the northern half of the Korean Peninsula and has declared nuclear and missile programs central to its security. The UN Security Council has maintained related sanctions for years.",
        "Ties with China remain structurally thick along the border and patronage axis; cooperation with Russia in arms and treaty terms has been widely reported in wartime and after. Links with Iran—missiles, arms, hybrid channels—recur in IGO and intelligence public reporting. Fragmentary diplomatic and arms-related ties appear with Syria, Yemen, Belarus, Cuba, and Venezuela.",
        "In late 2023, Kim Jong Un formally moved away from reunification as a state task and framed the Republic of Korea as a hostile state rather than a partner for reconciliation—followed by reported dismantling of unification organs/symbols and constitutional wording changes. This diverges from earlier ‘reunification’ propaganda.",
        "This is not a NATO-style collective-defense web. Read it as selective solidarities under sanctions pressure—survival, technology, and hard-currency needs overlapping.",
      ],
      false,
      "en",
    ),
  },
  IRN: {
    ko: doc(
      "이란 · 국경 · 우군 관계망",
      [
        "이란이슬람공화국은 페르시아만·호르무즈 해협과 맞닿은 중동 강국입니다. 1979년 이후 이슬람 공화 체제를 유지하며, 핵 프로그램·미사일·지역 대리 세력 지원을 둘러싼 국제 제재와 협상이 반복되어 왔습니다.",
        "시리아·이라크에서 영향력을 행사한다는 평가가 있고, 레바논 헤즈볼라와의 연계와 예멘 후티 세력에 대한 군수 지원 의혹이 미·유엔·제3국 공개 자료에 자주 등장합니다. 러시아와는 우크라이나 전쟁 국면에서 드론·군수 협력이 부각되었고, 중국과는 에너지·전략 협력이 이어져 왔습니다. 북한과의 미사일·군수 연계 보도도 장기간 축적되어 있습니다.",
        "걸프 도서(아부무사·톤브) 영유권과 호르무즈 통항 영향력은 이란이 자국 안보·해양 관할의 문제로 제기하는 영역입니다. 상반된 연안국 주장이 공존합니다.",
      ],
      false,
      "ko",
    ),
    en: doc(
      "Iran · Borders · Partner network",
      [
        "The Islamic Republic of Iran borders the Persian Gulf and the Strait of Hormuz. Since 1979 it has maintained an Islamic republic, with recurring sanctions and negotiations over its nuclear program, missiles, and regional proxy support.",
        "Public U.S., UN, and third-country materials frequently describe influence in Syria and Iraq, links with Hezbollah in Lebanon, and alleged arms support to Yemen’s Houthis. Wartime Russia ties highlighted drones and arms; China ties center on energy and strategy. Missile and arms reporting with North Korea spans many years.",
        "Claims over Gulf islands (Abu Musa and the Tunbs) and leverage over Hormuz transit are framed by Tehran as sovereignty and maritime security—contested by other littoral states.",
      ],
      false,
      "en",
    ),
  },
};

const CLAIMS: Record<string, { ko: HubBriefDoc; en: HubBriefDoc }> = {
  "claim-chn-taiwan": {
    ko: doc(
      "영유권 주장 · 대만",
      [
        "중화인민공화국은 대만을 자국 영토의 일부로 간주하는 ‘하나의 중국’ 원칙을 공식 정책으로 유지합니다. 중화민국(대만)은 실효 지배하는 섬과 부속도서를 주권 정부로 운영하며, 양측 모두 완전한 상호 승인을 전제로 한 통일 방식에는 합의하지 못한 상태입니다.",
        "대만해협은 세계 반도체·해상 물류의 핵심 통로 중 하나입니다. 중국 인민해방군의 훈련·항행과 미국·파트너국의 통과·무기 이전 논의는 주기적으로 긴장을 끌어올립니다. 무력 통일을 배제하지 않는다는 중국의 입장과, 현상 유지를 선호하는 지역 안보 논리가 병존합니다.",
        "지도의 색연필 원은 국제적으로 확정된 경계가 아니며, 베이징이 핵심 이익으로 규정하는 공간을 표시합니다.",
      ],
      true,
      "ko",
    ),
    en: doc(
      "Claim · Taiwan",
      [
        "The PRC maintains a One China principle treating Taiwan as part of its territory. The ROC (Taiwan) governs the island and outlying areas as a sovereign-capable administration. The two sides have not agreed a reunification formula based on mutual recognition.",
        "The Taiwan Strait is a chokepoint for semiconductors and shipping. PLA exercises and transit, and U.S./partner passage and arms discussions, periodically raise tension. Beijing’s refusal to renounce force coexists with regional preference for the status quo.",
        "The pencil ring marks a space Beijing defines as a core interest—not a settled international border.",
      ],
      true,
      "en",
    ),
  },
  "claim-chn-scs": {
    ko: doc(
      "영유권 주장 · 남중국해 (구단선)",
      [
        "중국은 남중국해에서 구단선에 기초한 광역 해양 주장을 제시해 왔습니다. 이 주장은 스프래틀리·파라셀(시사·난사) 등을 포함하며, 인공섬·시설화와 순시가 관측됩니다.",
        "2016년 상설중재재판소(PCA)는 필리핀이 제기한 사건에서 구단선에 기초한 역사적 권리 주장을 국제법상 배척하는 취지의 판단을 내렸습니다. 중국은 이를 수용하지 않는다고 밝혔습니다. 베트남·필리핀·말레이시아·브루나이도 중첩 주장을 가지고 있습니다.",
        "이 해역은 원유·가스 잠재력을 지니며, 동아시아 해상 무역로가 지나갑니다. 분쟁은 도서 영유권과 배타적 경제수역(EEZ)이 겹친 복합체입니다.",
      ],
      true,
      "ko",
    ),
    en: doc(
      "Claim · South China Sea (nine-dash line)",
      [
        "China advances broad maritime claims in the South China Sea based on the nine-dash line, covering features including the Spratlys and Paracels, with observed artificial-island building and patrols.",
        "In 2016 a PCA tribunal, in a case brought by the Philippines, rejected historic-rights claims tied to the nine-dash line under the law of the sea as presented. China stated it does not accept the award. Vietnam, the Philippines, Malaysia, and Brunei also hold overlapping claims.",
        "The waters matter for energy potential and East Asian sea trade. The dispute mixes island title and EEZ layers.",
      ],
      true,
      "en",
    ),
  },
  "claim-chn-senkaku": {
    ko: doc(
      "영유권 주장 · 센카쿠 · 댜오위다오",
      [
        "센카쿠 열도(중국·대만명 댜오위다오)는 동중국해에 위치하며, 일본이 실효 지배하고 중국·대만이 영유권을 주장합니다. 일본 정부는 영유권 분쟁 자체가 존재하지 않는다는 입장을 취해 왔으나, 중국은 역사적·지리적 근거를 들어 주권을 주장합니다.",
        "2012년 일본의 국유화 조치 이후 해경·해군 자산의 대치와 순시가 잦아졌습니다. 어업·대륙붕·안보 인식이 겹치며 장기 마찰이 이어집니다.",
      ],
      true,
      "ko",
    ),
    en: doc(
      "Claim · Senkaku / Diaoyu",
      [
        "The Senkaku Islands (Diaoyu in Chinese/Taiwanese usage) lie in the East China Sea. Japan administers them; China and Taiwan claim sovereignty. Tokyo has long said no dispute exists; Beijing cites historical and geographic grounds for title.",
        "After Japan’s 2012 nationalization, coast-guard and naval encounters increased. It is a long friction of fisheries, continental shelf, and security perceptions.",
      ],
      true,
      "en",
    ),
  },
  "claim-chn-arunachal": {
    ko: doc(
      "영유권 주장 · 아루나찰 (짱난)",
      [
        "인도 아루나찰프라데시주는 인도가 통치하는 주입니다. 중국은 이를 ‘짱난(藏南)’으로 부르며 영토 주장의 대상으로 삼아 왔습니다. 맥마흔 라인 등 식민기·초기 공화국 시기 경계 유산이 갈등 배경에 놓여 있습니다.",
        "1962년 중인전쟁 이후에도 실질통제선(LAC)을 둘러싼 대치가 이어졌고, 2020년 갈완 계곡 충돌은 양국 관계를 급랭시켰습니다. 경계는 아직 완전히 획정되지 않았습니다.",
      ],
      true,
      "ko",
    ),
    en: doc(
      "Claim · Arunachal (Zangnan)",
      [
        "India’s Arunachal Pradesh is administered by India; China refers to it as Zangnan and claims it. Colonial-era and early-republic boundary legacies, including the McMahon Line, sit in the background.",
        "After the 1962 Sino-Indian war, Line of Actual Control standoffs continued; the 2020 Galwan clash chilled ties. The boundary remains incompletely delimited.",
      ],
      true,
      "en",
    ),
  },
  "claim-rus-crimea": {
    ko: doc(
      "영유권 주장 · 크림",
      [
        "2014년 러시아는 크림반도를 병합했다고 선포했습니다. 우크라이나와 유엔 총회 다수 결의는 이를 우크라이나 주권·영토보전 위반으로 규정합니다. 러시아는 주민투표와 역사적 소속을 근거로 편입을 정당화합니다.",
        "세바스토폴 해군 기지는 흑해 함대의 요충으로 남아 있습니다. 반도 통제는 흑해·아조프해 접근과 직결됩니다. 지도의 표시는 러시아의 실효·주장 공간을 보여 주며, 국제적 승인 여부를 단정하지 않습니다.",
      ],
      true,
      "ko",
    ),
    en: doc(
      "Claim · Crimea",
      [
        "In 2014 Russia declared Crimea annexed. Ukraine and many UN General Assembly resolutions treat this as a violation of Ukraine’s sovereignty and territorial integrity. Russia cites a referendum and historical affiliation.",
        "Sevastopol remains a Black Sea Fleet anchor. Control of the peninsula is tied to Black Sea and Sea of Azov access. The map marks Russian control/claim space without asserting universal recognition.",
      ],
      true,
      "en",
    ),
  },
  "claim-rus-donbas": {
    ko: doc(
      "영유권 주장 · 돈바스",
      [
        "도네츠크·루한스크 일대(돈바스)는 2014년 이후 분리주의 전쟁과 민스크 합의 국면을 거쳤습니다. 2022년 전면전에서 러시아는 이들 지역의 ‘독립 인정’과 이후 병합 선포를 진행했고, 우크라이나와 다수국은 이를 위법으로 봅니다.",
        "전선은 고정되지 않았고, 도시·마을 단위로 통제선이 이동합니다. 이 브리프는 점령·주장의 존재를 기록할 뿐, 전리품을 승인하지 않습니다.",
      ],
      true,
      "ko",
    ),
    en: doc(
      "Claim · Donbas",
      [
        "Donetsk and Luhansk (the Donbas) saw separatist war after 2014 and Minsk-era pauses. In 2022 Russia recognized ‘independence’ and later declared annexation of these and other occupied areas—rejected as unlawful by Ukraine and many states.",
        "The front is not fixed; control moves town by town. This brief records claim and occupation; it does not endorse conquest.",
      ],
      true,
      "en",
    ),
  },
  "claim-rus-abkhazia": {
    ko: doc(
      "영유권 주장 · 압하지야",
      [
        "압하지야는 조지아 북서부에 위치합니다. 1990년대 전쟁과 2008년 러–조지아 전쟁 이후 러시아 등이 ‘독립’을 인정했으나, 조지아와 유엔 회원국 다수는 이를 조지아 영토로 간주합니다.",
        "러시아군 주둔과 조약 관계가 이어져 왔습니다. 흑해 연안·코카서스 안보의 장기 미해결 분쟁입니다.",
      ],
      true,
      "ko",
    ),
    en: doc(
      "Claim · Abkhazia",
      [
        "Abkhazia lies in northwest Georgia. After 1990s war and the 2008 Russo–Georgian war, Russia and a few others recognized ‘independence.’ Georgia and most UN members treat it as Georgian territory.",
        "Russian basing and treaty ties continue. It is a long-running Black Sea–Caucasus frozen conflict.",
      ],
      true,
      "en",
    ),
  },
  "claim-rus-s-ossetia": {
    ko: doc(
      "영유권 주장 · 남오세티야",
      [
        "남오세티야 역시 2008년 전쟁 이후 러시아가 독립을 인정한 지역이며, 조지아는 자국 영토로 봅니다. 러시아군 주둔과 ‘국경화’ 조치가 보고되어 왔습니다.",
        "압하지야와 함께 코카서스에서 러시아–서방·조지아 관계의 해결과제를 남긴 사례입니다.",
      ],
      true,
      "ko",
    ),
    en: doc(
      "Claim · South Ossetia",
      [
        "South Ossetia was recognized as independent by Russia after 2008; Georgia considers it its territory. Russian forces and ‘borderization’ measures have been reported.",
        "Together with Abkhazia, it remains a Caucasus settlement problem for Russia–West–Georgia relations.",
      ],
      true,
      "en",
    ),
  },
  "claim-prk-rok": {
    ko: doc(
      "영유권 주장 · 한반도 전체",
      [
        "오랫동안 북한 헌법·당 문헌과 체제 선전은 한반도 전체를 ‘조국 통일’의 공간으로 서술해 왔습니다. 대한민국은 실효 지배하는 남쪽 영토에서 주권 국가·유엔 회원국으로 기능해 왔습니다.",
        "2023년 말 김정은은 노동당 전원회의 등에서 통일·민족공조 노선을 공식 폐기하는 취지를 밝히고, 남쪽을 화해의 상대가 아닌 적대적 별개 국가로 규정하는 방향으로 전환했습니다. 이후 통일 관련 기구·기념물 철거와 헌법·당 문서 서술 조정이 공개 보도로 확인되었습니다. 과거의 ‘전 반도 통일 서사’와 현재의 공식 노선은 같지 않습니다.",
        "정전협정(1953)은 전쟁을 정지시켰을 뿐 평화조약을 대체하지 못했습니다. 지도상의 ‘한반도 전체’ 표시는 역사적 주장·선전 공간을 참고로 보여 줄 뿐, 2023년 말 이후의 공식 통일 포기를 덮어쓰지 않습니다.",
      ],
      true,
      "ko",
    ),
    en: doc(
      "Claim · Entire peninsula",
      [
        "For decades DPRK constitutional and party texts cast the whole peninsula as a reunification task, while the Republic of Korea functioned as a sovereign UN member in the south.",
        "In late 2023 Kim Jong Un formally discarded reunification and inter-Korean ‘national reconciliation’ framing, casting the South as a separate hostile state. Subsequent reporting described dismantling of unification institutions/symbols and wording changes in governing documents. Earlier ‘whole-peninsula reunification’ narrative and the post-2023 official line are not the same.",
        "The 1953 Armistice halted fighting; it did not replace a peace treaty. The map’s ‘entire peninsula’ mark is historical narrative reference—it does not override the late-2023 abandonment of official reunification.",
      ],
      true,
      "en",
    ),
  },
  "claim-prk-nll": {
    ko: doc(
      "영유권 주장 · 서해 NLL",
      [
        "북방한계선(NLL)은 정전 이후 유엔군 사령부가 서해에 설정한 군사분계선 성격의 선이며, 한국은 이를 사실상의 해상 경계로 운용해 왔습니다. 북한은 NLL을 일방적으로 그어진 선이라며 부정하고, 자체 해상군사분계선을 제시해 왔습니다.",
        "연평·대청 일대에서는 해전·포격 사건이 반복되었습니다. 어선·경비함의 근접이 위기 고조로 이어질 수 있는 좁은 수역입니다.",
      ],
      true,
      "ko",
    ),
    en: doc(
      "Claim · West Sea NLL",
      [
        "The Northern Limit Line (NLL) was set by UNC after the armistice in the Yellow Sea; South Korea treats it as a de facto maritime line. The DPRK rejects it as unilateral and has advanced its own maritime military demarcation claims.",
        "Naval clashes and shelling have recurred near Yeonpyeong and Daecheong. It is a narrow waterway where fishing and patrol craft can escalate quickly.",
      ],
      true,
      "en",
    ),
  },
  "claim-irn-tunbs": {
    ko: doc(
      "영유권 주장 · 아부무사 · 톤브 제도",
      [
        "아부무사와 대·소 톤브 섬은 페르시아만(아라비아만) 입구 인근에 있습니다. 이란이 실효 통제하는 가운데 UAE는 영유권을 주장합니다. 1971년 영국 철수 전후의 조치와 협약이 해석 쟁점이 되어 왔습니다.",
        "호르무즈 접근로에 가까운 위치 때문에 상징·군사 가치가 함께 거론됩니다. 분쟁은 양자 외교 의제로 남아 있습니다.",
      ],
      true,
      "ko",
    ),
    en: doc(
      "Claim · Abu Musa & the Tunbs",
      [
        "Abu Musa and the Greater/Lesser Tunbs sit near the Gulf approaches. Iran administers them; the UAE claims title. Measures around the 1971 British withdrawal remain interpretive flashpoints.",
        "Proximity to Hormuz gives both symbolic and military weight. The dispute stays on the bilateral diplomatic table.",
      ],
      true,
      "en",
    ),
  },
  "claim-irn-gulf": {
    ko: doc(
      "영유권 주장 · 페르시아만 영향권",
      [
        "호르무즈 해협은 전 세계 해상 원유 수송의 상당 비중만 통과하는 초크포인트입니다. 이란은 자국 연안과 인접 수역의 군사·경비 활동을 안보 권리로 설명하고, 미국과 걸프 연안국은 통항의 자유와 억지력을 강조합니다.",
        "유조선 나포·드론·기뢰 위협 보도가 긴장 국면에서 반복됩니다. ‘영향권’은 합의된 EEZ 획정과 같지 않으며, 이란이 행사·과시하는 해상 거부(sea denial) 능력에 가깝습니다.",
      ],
      true,
      "ko",
    ),
    en: doc(
      "Claim · Persian Gulf influence",
      [
        "The Strait of Hormuz is a chokepoint for a large share of seaborne oil. Iran frames coastal and near-sea activity as security rights; the U.S. and Gulf states stress freedom of navigation and deterrence.",
        "Tanker seizures and drone/mine scare reports recur in tense periods. ‘Influence’ is not the same as an agreed EEZ—read it as demonstrated sea-denial and presence.",
      ],
      true,
      "en",
    ),
  },
  "claim-irn-levant": {
    ko: doc(
      "영유권 주장 · 레반트 축",
      [
        "이란은 시리아 내전 국면에서 아사드 정권을 지원했고, 이라크 내 친이란 민병 네트워크와 레바논 헤즈볼라와의 이념·군수 관계가 공개·반공개 자료에 축적되어 있습니다. ‘축’은 공식 방위조약 하나라기보다 병참·정치·종파 연결의 묶음입니다.",
        "이스라엘·미국은 이를 자국 안보 위협으로 규정하고 공습·제재로 대응해 왔습니다. 전장은 시리아·레바논·이라크·홍해로 파급되는 경우가 있습니다.",
      ],
      true,
      "ko",
    ),
    en: doc(
      "Claim · Levant axis",
      [
        "Iran backed Assad in Syria’s war; public and semi-public records describe Iran-aligned militia networks in Iraq and ideological/arms ties with Hezbollah in Lebanon. The ‘axis’ is a logistics–politics–sectarian bundle more than a single defense treaty.",
        "Israel and the United States treat it as a security threat and have answered with strikes and sanctions. Fighting can spill across Syria, Lebanon, Iraq, and the Red Sea.",
      ],
      true,
      "en",
    ),
  },
};

const ARMS: Record<AxisHubId, { ko: HubBriefDoc; en: HubBriefDoc }> = {
  CHN: {
    ko: doc(
      "중국 · 무기거래 (SIPRI)",
      [
        "화면에 잠시 뜨는 호는 SIPRI(스톡홀름국제평화연구소) 무역등록부에 기록된 재래식 무기 이전 가운데, 중국이 공급 또는 수요 측으로 등장하는 축 관련 페어를 요약한 것입니다. TIV(추세지표가치)는 가격이 아니라 이전 규모 비교용 지수입니다.",
        "중국은 일부 국가에 무인기·함정·방공 체계 등을 수출해 왔다는 기록이 있으며, 동시에 첨단 체계는 수입·공동개발 경로도 존재합니다. 데이터는 보고된 계약·이전만 담고, 암시장·완제품 위장 이전은 누락될 수 있습니다.",
        "편지를 접으면 상세 목록 패널에서 연도·장비명을 더 볼 수 있습니다. SIPRI 원자료를 함께 교차 확인합니다.",
      ],
      false,
      "ko",
    ),
    en: doc(
      "China · Arms transfers (SIPRI)",
      [
        "Arcs briefly shown summarize SIPRI Trade Register conventional arms transfers where China appears as supplier or recipient in this axis lens. TIV is a volume index, not a market price.",
        "Records include UAV, naval, and air-defense exports to some partners, alongside import/co-development paths for advanced systems. Only reported deals appear; black-market or disguised transfers may be missing.",
        "After you fold this letter, a detail panel lists years and designations. Cross-check SIPRI originals.",
      ],
      false,
      "en",
    ),
  },
  RUS: {
    ko: doc(
      "러시아 · 무기거래 (SIPRI)",
      [
        "러시아는 수십 년간 세계 주요 재래식 무기 수출국 중 하나였습니다. 항공·방공·장갑·함정 이전이 SIPRI에 누적 기록되어 있습니다. 우크라이나 전쟁과 제재 이후 수출 여력·우선순위가 바뀌었다는 평가가 많습니다.",
        "이란·북한 등과의 군수 협력은 SIPRI 등록분이 아닌 보도·정보 평가에 더 많이 의존하는 경우가 있습니다. 화면 데이터는 ‘등록된 이전’과 ‘축 렌즈 필터’의 교집합입니다.",
        "편지를 접으면 목록에서 공급↔수요 페어를 확인할 수 있습니다.",
      ],
      false,
      "ko",
    ),
    en: doc(
      "Russia · Arms transfers (SIPRI)",
      [
        "Russia has long been among the world’s largest conventional arms exporters. SIPRI accumulates aircraft, air defense, armor, and naval transfers. After the Ukraine war and sanctions, capacity and priorities are widely assessed as changed.",
        "Some Russia–Iran/DPRK military cooperation is documented more in reporting than in SIPRI rows. What you see is the intersection of registered transfers and this hub filter.",
        "Fold the letter to inspect supplier↔recipient pairs in the list panel.",
      ],
      false,
      "en",
    ),
  },
  PRK: {
    ko: doc(
      "북한 · 무기거래 (SIPRI)",
      [
        "북한은 유엔 제재 하에서 무기 수출입이 크게 제약됩니다. SIPRI에 남는 항목은 제한적이며, 과거 중동·아프리카 등으로의 이전 의혹·적발이 별도의 제재 보고서로 다루는 경우가 많습니다.",
        "러시아·이란과의 전시·미사일 관련 협력은 최근 보도의 중심이지만, 등록 데이터의 공백이 큽니다. 지도 호가 비어 있거나 적을 수 있는 이유입니다.",
        "관측 공백은 활동이 없다는 뜻이 아니라, 공개 등록이 적다는 뜻입니다.",
      ],
      false,
      "ko",
    ),
    en: doc(
      "DPRK · Arms transfers (SIPRI)",
      [
        "Under UN sanctions, DPRK arms imports and exports are heavily constrained. SIPRI rows are sparse; alleged transfers to the Middle East and Africa often appear in separate sanctions reporting.",
        "Recent Russia/Iran wartime and missile cooperation dominates news, but registry gaps are large—so map arcs may be few or empty.",
        "Read absence as ‘few public registrations,’ not proof of no activity.",
      ],
      false,
      "en",
    ),
  },
  IRN: {
    ko: doc(
      "이란 · 무기거래 (SIPRI)",
      [
        "이란은 장기간 무기 금수·제재 환경에 놓여 국내 생산과 우회 조달에 의존해 왔습니다. SIPRI에 잡히는 이전은 시기에 따라 드뭅니다.",
        "최근 러시아로의 드론 공급 보도와 역방향 방공·항공 협력 논의가 주목받았으나, 등록 완료분과 미확인 보도는 구분해야 합니다. 화면은 축 필터가 적용된 SIPRI 요약입니다.",
        "편지를 접으면 거래 카드 목록으로 이어집니다.",
      ],
      false,
      "ko",
    ),
    en: doc(
      "Iran · Arms transfers (SIPRI)",
      [
        "Iran has lived under arms embargo and sanctions for years, relying on domestic production and workaround procurement. SIPRI-visible transfers are often sparse by period.",
        "Recent reports of drones to Russia and reverse air-defense/aviation discussions drew attention—separate confirmed register rows from unverified claims. The map uses a hub-filtered SIPRI summary.",
        "Fold the letter to open deal cards.",
      ],
      false,
      "en",
    ),
  },
};

const REGIME_SHARED_KO = [
  "반서방·권위주의 진영은 항상 한 편만은 아니었습니다. 국경·주권·영향권을 둘러싼 상호 충돌의 현장이 지도 곳곳에 남아 있습니다.",
  "이 렌즈는 전바오(1969), 랑선(1979), 갈완(2020), 츠힌발리(2008), 슈샤(2020), 샤트알아랍(1980–88), 톰브(1971), 프놈펜(1978), 바드메(1998–2000), 백두산·두만강 긴장처럼 공개 기록으로 남은 대표 충돌을 짧게 읽습니다.",
  "각 카드는 당시 현장에서 무엇이 터졌는지—누가 맞섰고, 무엇이 쟁점이었으며, 이후 관계를 어떻게 바꿔 놓았는지—상황 설명으로 이어집니다. V-Dem 전수 연표가 아니라, 현장 중심의 큐레이션입니다.",
  "편지를 접으면 우측 목록이 열립니다. 카드를 누르면 해당 좌표로 이동하고, 그 순간의 상황을 다시 양피지로 풀어 줍니다.",
];

const REGIME_SHARED_EN = [
  "Anti-Western and authoritarian camps have not always stood as one bloc. Borders, sovereignty, and spheres of influence left flashpoints across the map.",
  "This lens walks through open-record cases such as Zhenbao (1969), Lạng Sơn (1979), Galwan (2020), Tskhinvali (2008), Shusha (2020), Shatt al-Arab (1980–88), Tunb (1971), Phnom Penh (1978), Badme (1998–2000), and Paektu / Tumen friction.",
  "Each card explains the situation on the ground—who clashed, what was at stake, and how relations shifted afterward. This is curated scene briefing, not a full V-Dem timeline.",
  "Fold the letter to open the side list. Pick a card to fly to the coordinates and read that moment’s situation brief.",
];

const REGIME: Record<AxisHubId, { ko: HubBriefDoc; en: HubBriefDoc }> = {
  CHN: {
    ko: doc("반서방국 충돌사 · 상황 설명", REGIME_SHARED_KO, true, "ko"),
    en: doc("Intra-bloc clashes · situation brief", REGIME_SHARED_EN, true, "en"),
  },
  RUS: {
    ko: doc("반서방국 충돌사 · 상황 설명", REGIME_SHARED_KO, true, "ko"),
    en: doc("Intra-bloc clashes · situation brief", REGIME_SHARED_EN, true, "en"),
  },
  PRK: {
    ko: doc("반서방국 충돌사 · 상황 설명", REGIME_SHARED_KO, true, "ko"),
    en: doc("Intra-bloc clashes · situation brief", REGIME_SHARED_EN, true, "en"),
  },
  IRN: {
    ko: doc("반서방국 충돌사 · 상황 설명", REGIME_SHARED_KO, true, "ko"),
    en: doc("Intra-bloc clashes · situation brief", REGIME_SHARED_EN, true, "en"),
  },
};

function pickLang<T extends { ko: HubBriefDoc; en: HubBriefDoc }>(
  pair: T,
  lang: LabelLanguage,
): HubBriefDoc {
  return lang === "en" ? pair.en : pair.ko;
}

function allyBrief(
  hubId: AxisHubId,
  allyCode: string,
  lang: LabelLanguage,
): HubBriefDoc | null {
  const hub = hubById(hubId);
  const ally = AXIS_NODES[allyCode];
  if (!hub || !ally) return null;
  const hubName = lang === "en" ? (AXIS_NODES[hubId]?.nameEn ?? hub.label) : hub.label;
  const allyName = lang === "en" ? ally.nameEn : ally.nameKo;
  const edges = edgesForHub(hubId).filter(
    (e) =>
      (e.a === hubId && e.b === allyCode) ||
      (e.b === hubId && e.a === allyCode),
  );
  const labels = edges.map((e) => (lang === "en" ? e.labelEn : e.labelKo));
  const unique = [...new Set(labels)];
  if (lang === "en") {
    return doc(
      `${hubName} · Partner · ${allyName}`,
      [
        `This map hop centers ${allyName} in relation to ${hubName}.`,
        unique.length > 0
          ? `Public lens labels on file include: ${unique.join("; ")}.`
          : `Open records list ${allyName} among states appearing on this hub’s spoke set.`,
        "Partner does not always mean formal treaty ally. Trade, basing, patronage, and arms links can coexist without a mutual-defense clause. Treat the pencil and arcs as a reading aid, not a verdict.",
      ],
      false,
      "en",
    );
  }
  return doc(
    `${hubName} · 우군 · ${allyName}`,
    [
      `지도가 잠시 ${allyName} 쪽으로 이동합니다. ${hubName} 허브 렌즈에서 연결된 행위자입니다.`,
      unique.length > 0
        ? `공개 관계 라벨에는 다음이 포함됩니다. ${unique.join(" · ")}.`
        : `${allyName}는 이 허브 스포크 집합에 등장하는 국가로 정리되어 있습니다.`,
      "우군은 곧 상호방위조약 동맹을 뜻하지 않습니다. 무역·주둔·후원·군수는 방위 조항 없이도 겹칠 수 있습니다. 호와 강조는 읽기 보조이며, 판결이 아닙니다.",
    ],
    false,
    "ko",
  );
}

/** hub nav 선택 → 양피지 문서. hub 렌즈가 아니면 null */
export function resolveHubBrief(
  selection: NavSelection,
  lang: LabelLanguage,
): HubBriefDoc | null {
  if (!selection.hubId || !selection.focusMode) return null;
  const hubId = selection.hubId;

  switch (selection.focusMode) {
    case "network":
      return pickLang(NETWORK[hubId], lang);
    case "ally":
      return selection.allyCode
        ? allyBrief(hubId, selection.allyCode, lang)
        : pickLang(NETWORK[hubId], lang);
    case "claim":
      if (selection.claimId && CLAIMS[selection.claimId]) {
        return pickLang(CLAIMS[selection.claimId], lang);
      }
      return pickLang(NETWORK[hubId], lang);
    case "arms":
      if (!SIPRI_ARMS_LENS_ENABLED) return null;
      return pickLang(ARMS[hubId], lang);
    case "regime":
      return pickLang(REGIME[hubId], lang);
    default:
      return null;
  }
}
