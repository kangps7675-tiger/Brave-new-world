"use client";

import { BRAND_NAME } from "@/lib/brand";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { t } from "@/lib/uiStrings";
import { ParchmentLetter } from "@/components/ParchmentLetter";

/**
 * 입장 편지 — 한글은 문학체.
 * 조사·어순은 지키되, 종결을 ~입니다로 억지로 맞추지 않는다.
 * (서술 ~다 / 호소 ~십시오 / 시적 명사열 허용)
 */
const LETTER_KO = {
  title: "멋진 신세계에\n오신 것을 환영합니다",
  paragraphs: [
    "존경하는 탐험가님께.",
    "문을 열면—\n먼저 소리가 온다.\n\n멀리서 포탄이 작렬하고\n공습 사이렌이 허파를 쥐어짠다.\n지도 위 한 칸에서는\n밤이 붉게 탄다.\n\n그런데—\n같은 순간,\n같은 지구본의 반대편에서는\n누군가 조용히 숫자를 읽어 올린다.\n\n유가.\n환율.\n제재.\n항로.\n케이블.\n\n누군가는\n돈을 번다.",
    "Aldous Huxley가 그린\n《Brave New World》는\n‘멋진’이라는 말이\n얼마나 섬뜩할 수 있는지를\n보여 주었다.\n\n우리는 그 아이러니를 빌려\n이 관측대에 이름을 붙였다.\n\n멋진 신세계.\n\n완성된 낙원이 아니라—\n전쟁과 이익이\n한 화면을 나눠 쓰는,\n너무도 현실적인 신세계.",
    "세상은 하나의 이야기로\n정리되기를 원한다.\n\n그러나 지정학은\n여러 줄기가 한꺼번에 흐르는 강이다.\n\n한쪽에서는 총성이,\n다른 쪽에서는 회담이,\n바다 위에서는 선박이 항로를 틀고,\n해저에서는 보이지 않는 케이블이\n대륙을 잇는다.\n\n이 지구본은 그 서사의 결을\n지도의 언어로 펼쳐 놓았다.",
    "이곳에서 당신은\n두 갈래의 문 앞에 선다.",
    "지정학의 창—\n전선과 분쟁,\n군사와 외교의 긴장.\n\n접촉선의 윤곽,\n공중의 궤적,\n속보의 불꽃,\n사이렌이 남긴 잔향을\n따라가는 길.",
    "지경학의 창—\n에너지와 물류,\n시장과 제재,\n호르무즈와 수에즈,\n파이프라인과 해저 케이블.\n\n자본이 숨을 고르는 교차로를\n읽는 길.",
    "어느 문을 열든,\n부디 성급히 눈을 감지 마시라.\n\n소름과 설렘은\n같은 자리에서 태어난다.\n긴장 너머에 감동이 있고,\n감동 너머에 질문이 남는다.\n\n지도는 답을 주기보다,\n올바른 질문을 떠올리게 하는\n도구다.",
    "다음 양피지에서\n데이터 출처·한계·가짜로 표시 중인 레이어를\n반드시 읽어 주십시오.\n\n우리는 완벽한 정보기관이 아닙니다.\n등불·긴장지수·실시간 레이어는\n그 고지를 확인한 뒤에만\n펼쳐집니다.",
    "이제 편지를 접으시라.\n\n그리고—\n출처 고지 양피지를\n끝까지 읽으신 뒤,\n어느 창으로\n이 멋진 신세계에 들어설지,\n스스로 고르시라.",
    "\"보이는 모든 것은\n지금 이곳에서 벌어지는 실제 상황이다.\"",
  ],
  signOff: `${BRAND_NAME.ko}\n지구본 관측대에서`,
  backMark: BRAND_NAME.ko,
  backSub: BRAND_NAME.en,
};

const LETTER_EN = {
  title: "Welcome to\nBrave New World",
  paragraphs: [
    "Dear explorer,",
    "Open the door—\nand sound arrives first.\n\nFar away, shells rupture the night;\nair-raid sirens claw at the lungs.\nOne square of the map\nburns red.\n\nAnd yet—\nin the same heartbeat,\non the far side of the same globe—\nsomeone quietly reads the numbers up.\n\nOil.\nExchange.\nSanctions.\nSea lanes.\nCables.\n\nSomeone\nis making money.",
    "Aldous Huxley’s Brave New World\ntaught us how unsettling\nthe word “brave” can be.\n\nWe borrowed that irony\nfor this observatory.\n\nBrave New World.\n\nNot a finished paradise—\nbut a world too real,\nwhere war and profit\nshare one screen.",
    "The world longs to be told\nas a single story.\n\nGeopolitics is a river\nof many currents at once:\ngunfire here, talks there;\nships altering course at sea;\nunseen cables binding continents below.\n\nThis globe unfolds that epic grain\nin the language of maps.",
    "Here you stand\nbefore two doors.",
    "The window of geopolitics—\nfront lines and disputes,\nthe tension of arms and diplomacy.\n\nThe outline of a contact line,\ntrails in the sky,\nsparks of breaking news,\nthe after-echo of sirens.",
    "The window of geoeconomics—\nenergy and logistics,\nmarkets and sanctions,\nHormuz and Suez,\npipelines and submarine cables.\n\nThe crossings\nwhere capital catches its breath.",
    "Whichever door you open,\ndo not close your eyes too soon.\n\nGoosebumps and thrill\nare born in the same place.\nBeyond tension, feeling;\nbeyond feeling, a question.\n\nA map does not so much give answers\nas invite the right ones.",
    "On the next parchment you must read\ndata sources, limits, and layers\nstill shown with placeholder data.\n\nWe are not a perfect intelligence agency.\nBreaking news, tension scores, and live layers\nunfold only after you acknowledge that.",
    "Now fold the letter.\n\nThen read the sources disclosure\nin full — and choose for yourself\nwhich window leads you\ninto this Brave New World.",
    "\"Everything you see is a real situation unfolding now.\"",
  ],
  signOff: `${BRAND_NAME.en}\nFrom the Globe Observatory`,
  backMark: BRAND_NAME.en,
  backSub: BRAND_NAME.ko,
};

type WelcomeParchmentLetterProps = {
  lang: LabelLanguage;
  onContinue: () => void;
};

export function WelcomeParchmentLetter({ lang, onContinue }: WelcomeParchmentLetterProps) {
  const letter = lang === "en" ? LETTER_EN : LETTER_KO;
  return (
    <ParchmentLetter
      lang={lang}
      title={letter.title}
      paragraphs={letter.paragraphs}
      signOff={letter.signOff}
      backMark={letter.backMark}
      backSub={letter.backSub}
      ctaLabel={t("welcomeLetterCta", lang)}
      onContinue={onContinue}
      titleId="welcome-letter-title"
      historyHandFont={lang !== "en"}
      intelFont={lang === "en"}
    />
  );
}
