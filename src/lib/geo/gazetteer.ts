/**
 * 전역 공용 gazetteer — newfeedsI18n LOCATION_I18N / 지명 TITLE_PHRASE 를 승격.
 * 좌표는 기존 시드·공개 도시 중심으로만 채운다. 지명 매칭 실패 시 좌표를 지어내지 않는다.
 */
import type { ConflictTheater } from "@/lib/conflictEvents/types";

export type GazetteerPrecision = "city" | "region" | "country";

export type GazetteerEntry = {
  id: string;
  aliases: readonly string[];
  ko: string;
  en: string;
  lat: number;
  lng: number;
  theater: ConflictTheater;
  precision: GazetteerPrecision;
};

function e(
  id: string,
  aliases: string[],
  ko: string,
  en: string,
  lat: number,
  lng: number,
  theater: ConflictTheater,
  precision: GazetteerPrecision = "city",
): GazetteerEntry {
  const uniq = Array.from(new Set([id, ...aliases].map((a) => a.trim()).filter(Boolean)));
  return { id, aliases: uniq, ko, en, lat, lng, theater, precision };
}

/** 기존 LOCATION_I18N + 레바논/시리아/우크라이나/대만/한국 핵심 지명 */
export const GAZETTEER: readonly GazetteerEntry[] = [
  // —— 이란·걸프 (기존 LOCATION_I18N) ——
  e("iran", ["이란", "islamic republic of iran"], "이란", "Iran", 32.4279, 53.688, "iran", "country"),
  e("tehran", ["테헤란"], "테헤란", "Tehran", 35.6892, 51.389, "iran"),
  e("isfahan", ["esfahan", "이스파한"], "이스파한", "Isfahan", 32.6546, 51.668, "iran"),
  e("bushehr", ["부셰흐르"], "부셰흐르", "Bushehr", 28.9234, 50.8203, "iran"),
  e("bandar abbas", ["bandar", "반다르압바스", "반다르"], "반다르압바스", "Bandar Abbas", 27.1832, 56.2666, "iran"),
  e("hormuz", ["strait of hormuz", "호르무즈 해협", "호르무즈"], "호르무즈 해협", "Strait of Hormuz", 26.5667, 56.25, "iran", "region"),
  e("persian gulf", ["페르시아만"], "페르시아만", "Persian Gulf", 26.0, 52.0, "iran", "region"),
  e("gulf of oman", ["오만만"], "오만만", "Gulf of Oman", 24.5, 58.5, "iran", "region"),
  e("iraq", ["이라크"], "이라크", "Iraq", 33.2232, 43.6793, "iran", "country"),
  e("baghdad", ["바그다드"], "바그다드", "Baghdad", 33.3152, 44.3661, "iran"),
  e("natanz", ["나탄즈"], "나탄즈", "Natanz", 33.725, 51.726, "iran"),
  e("fordow", ["포르도"], "포르도", "Fordow", 34.8847, 50.9958, "iran"),
  e("kharg", ["하르그"], "하르그", "Kharg", 29.237, 50.314, "iran"),
  e("mashhad", ["마슈하드"], "마슈하드", "Mashhad", 36.2605, 59.6168, "iran"),
  e("shiraz", ["시라즈"], "시라즈", "Shiraz", 29.5918, 52.5837, "iran"),
  e("tabriz", ["타브리즈"], "타브리즈", "Tabriz", 38.0962, 46.2738, "iran"),
  e("kermanshah", ["케르만샤"], "케르만샤", "Kermanshah", 34.3142, 47.065, "iran"),
  e("israel", ["이스라엘"], "이스라엘", "Israel", 31.7683, 35.2137, "iran", "country"),
  e("tel aviv", ["텔아비브"], "텔아비브", "Tel Aviv", 32.0853, 34.7818, "iran"),
  e("jerusalem", ["예루살렘"], "예루살렘", "Jerusalem", 31.7683, 35.2137, "iran"),
  e("red sea", ["홍해"], "홍해", "Red Sea", 20.0, 38.5, "iran", "region"),
  e("yemen", ["예멘"], "예멘", "Yemen", 15.5527, 48.5164, "iran", "country"),
  e("saudi arabia", ["사우디아라비아", "saudi"], "사우디아라비아", "Saudi Arabia", 23.8859, 45.0792, "iran", "country"),
  e("bahrain", ["바레인"], "바레인", "Bahrain", 26.0667, 50.5577, "iran", "country"),
  e("qatar", ["카타르"], "카타르", "Qatar", 25.3548, 51.1839, "iran", "country"),
  e("uae", ["united arab emirates", "아랍에미리트"], "아랍에미리트", "UAE", 23.4241, 53.8478, "iran", "country"),
  e("kuwait", ["쿠웨이트"], "쿠웨이트", "Kuwait", 29.3117, 47.4818, "iran", "country"),
  e("turkey", ["튀르키예", "turkiye"], "튀르키예", "Turkey", 38.9637, 35.2433, "iran", "country"),
  e("afghanistan", ["아프가니스탄"], "아프가니스탄", "Afghanistan", 33.9391, 67.71, "iran", "country"),
  e("pakistan", ["파키스탄"], "파키스탄", "Pakistan", 30.3753, 69.3451, "iran", "country"),

  // —— 레바논 ——
  e("lebanon", ["레바논"], "레바논", "Lebanon", 33.8547, 35.8623, "lebanon", "country"),
  e("beirut", ["베이루트"], "베이루트", "Beirut", 33.8938, 35.5018, "lebanon"),
  e("tripoli lebanon", ["tripoli", "트리폴리"], "트리폴리", "Tripoli", 34.4333, 35.8333, "lebanon"),
  e("sidon", ["saida", "시돈"], "시돈", "Sidon", 33.5571, 35.3729, "lebanon"),
  e("tyre", ["sur lebanon", "티레"], "티레", "Tyre", 33.2704, 35.2038, "lebanon"),
  e("nabatieh", ["나바티예"], "나바티예", "Nabatieh", 33.3789, 35.4839, "lebanon"),
  e("baalbek", ["바알베크"], "바알베크", "Baalbek", 34.0058, 36.2181, "lebanon"),
  e("south lebanon", ["southern lebanon", "남레바논", "litani"], "남레바논", "South Lebanon", 33.27, 35.42, "lebanon", "region"),

  // —— 시리아 ——
  e("syria", ["시리아"], "시리아", "Syria", 34.8021, 38.9968, "syria", "country"),
  e("damascus", ["다마스쿠스"], "다마스쿠스", "Damascus", 33.5138, 36.2765, "syria"),
  e("aleppo", ["알레포"], "알레포", "Aleppo", 36.2021, 37.1343, "syria"),
  e("homs", ["홈스"], "홈스", "Homs", 34.7324, 36.7137, "syria"),
  e("idlib", ["이들리브"], "이들리브", "Idlib", 35.9306, 36.6339, "syria"),
  e("latakia", ["라타키아"], "라타키아", "Latakia", 35.5317, 35.79, "syria"),
  e("tartus", ["타르투스"], "타르투스", "Tartus", 34.889, 35.8866, "syria"),
  e("golan", ["골란", "quneitra", "쿠네이트라"], "골란", "Golan", 33.0, 35.75, "syria", "region"),
  e("deir ez-zor", ["deir ezzor", "데이르에조르"], "데이르에조르", "Deir ez-Zor", 35.3333, 40.15, "syria"),
  e("palmyra", ["tadmur", "팔미라"], "팔미라", "Palmyra", 34.5624, 38.284, "syria"),

  // —— 우크라이나·러시아 표적 (기존 타격 시드 좌표 재사용) ——
  e("ukraine", ["우크라이나"], "우크라이나", "Ukraine", 48.3794, 31.1656, "ukraine", "country"),
  e("kyiv", ["kiev", "키이우", "키예프"], "키이우", "Kyiv", 50.4501, 30.5234, "ukraine"),
  e("kharkiv", ["kharkov", "하르키우"], "하르키우", "Kharkiv", 49.9935, 36.2304, "ukraine"),
  e("odesa", ["odessa", "오데사"], "오데사", "Odesa", 46.4825, 30.7233, "ukraine"),
  e("dnipro", ["dnipropetrovsk", "드니프로"], "드니프로", "Dnipro", 48.4647, 35.0462, "ukraine"),
  e("lviv", ["리비우"], "리비우", "Lviv", 49.8397, 24.0297, "ukraine"),
  e("zaporizhzhia", ["zaporizhia", "자포리자"], "자포리자", "Zaporizhzhia", 47.8388, 35.1396, "ukraine"),
  e("mykolaiv", ["nikolaev", "미콜라이우"], "미콜라이우", "Mykolaiv", 46.975, 31.9946, "ukraine"),
  e("kherson", ["헤르손"], "헤르손", "Kherson", 46.6354, 32.6169, "ukraine"),
  e("donetsk", ["도네츠크"], "도네츠크", "Donetsk", 48.0159, 37.8028, "ukraine"),
  e("luhansk", ["루한스크"], "루한스크", "Luhansk", 48.574, 39.3078, "ukraine"),
  e("mariupol", ["마리우폴"], "마리우폴", "Mariupol", 47.0971, 37.5434, "ukraine"),
  e("bakhmut", ["바흐무트"], "바흐무트", "Bakhmut", 48.5956, 38.0005, "ukraine"),
  e("avdiivka", ["아브디이우카"], "아브디이우카", "Avdiivka", 48.1394, 37.7498, "ukraine"),
  e("pokrovsk", ["포크로우스크"], "포크로우스크", "Pokrovsk", 48.282, 37.1828, "ukraine"),
  e("crimea", ["krym", "크림"], "크림", "Crimea", 45.3453, 34.4997, "ukraine", "region"),
  e("sevastopol", ["세바스토폴"], "세바스토폴", "Sevastopol", 44.6166, 33.5254, "ukraine"),
  e("belgorod", ["벨고로드"], "벨고로드", "Belgorod", 50.5977, 36.5858, "ukraine"),
  e("kursk", ["쿠르스크"], "쿠르스크", "Kursk", 51.7304, 36.1926, "ukraine"),
  e("bryansk", ["브랸스크"], "브랸스크", "Bryansk", 53.2434, 34.364, "ukraine"),
  e("voronezh", ["보로네시"], "보로네시", "Voronezh", 51.672, 39.1843, "ukraine"),
  e("rostov", ["rostov-on-don", "로스토프"], "로스토프", "Rostov", 47.2357, 39.7015, "ukraine"),
  e("moscow", ["모스크바"], "모스크바", "Moscow", 55.7558, 37.6173, "ukraine"),
  e("engels", ["엥겔스"], "엥겔스", "Engels", 51.5013, 46.1258, "ukraine"),
  e("novorossiysk", ["노보로시스크"], "노보로시스크", "Novorossiysk", 44.7239, 37.7689, "ukraine"),
  e("tuapse", ["투압세"], "투압세", "Tuapse", 44.1053, 39.0803, "ukraine"),

  // —— 대만·동아시아 (중국 전장 시드 재사용) ——
  e("taiwan", ["대만", "taiwan strait", "대만 해협"], "대만", "Taiwan", 23.6978, 120.9605, "taiwan", "country"),
  e("taipei", ["타이베이"], "타이베이", "Taipei", 25.033, 121.5654, "taiwan"),
  e("kaohsiung", ["가오슝"], "가오슝", "Kaohsiung", 22.6273, 120.3014, "taiwan"),
  e("kinmen", ["진먼"], "진먼", "Kinmen", 24.432, 118.317, "taiwan"),
  e("penghu", ["펑후"], "펑후", "Penghu", 23.571, 119.579, "taiwan"),
  e("bashi", ["bashi channel", "바시 해협"], "바시 해협", "Bashi Channel", 21.0, 121.5, "taiwan", "region"),

  // —— 남중국해 ——
  e("south china sea", ["남중국해", "south china sea"], "남중국해", "South China Sea", 12.0, 115.0, "south-china-sea", "region"),
  e("spratly", ["spratly islands", "난사", "스프래틀리"], "스프래틀리", "Spratly Islands", 10.0, 115.0, "south-china-sea", "region"),
  e("paracel", ["paracel islands", "시사", "파라셀", "호앙사"], "파라셀", "Paracel Islands", 16.5, 112.0, "south-china-sea", "region"),
  e("scarborough", ["scarborough shoal", "huangyan", "황옌다오", "스카버러"], "스카버러", "Scarborough Shoal", 15.15, 117.75, "south-china-sea"),
  e("west philippine sea", ["서필리핀해"], "서필리핀해", "West Philippine Sea", 15.0, 118.0, "south-china-sea", "region"),
  e("nine-dash", ["nine dash", "nine-dash line", "십단선", "구단선"], "구단선", "Nine-Dash Line", 12.0, 114.0, "south-china-sea", "region"),

  // —— 한국·북한 (미사일 시드 재사용) ——
  e("korea", ["한반도", "korean peninsula"], "한반도", "Korea", 38.0, 127.5, "korea", "country"),
  e("pyongyang", ["평양"], "평양", "Pyongyang", 39.0392, 125.7625, "korea"),
  e("sunan", ["순안"], "순안", "Sunan", 39.2, 125.67, "korea"),
  e("tongchang-ri", ["동창리"], "동창리", "Tongchang-ri", 39.66, 124.71, "korea"),
  e("sinpo", ["신포"], "신포", "Sinpo", 40.03, 128.18, "korea"),
  e("wonsan", ["원산", "kalma", "갈마"], "원산", "Wonsan", 39.15, 127.45, "korea"),
  e("sunchon", ["순천"], "순천", "Sunchon", 39.42, 125.93, "korea"),
  e("panghyon", ["방현"], "방현", "Panghyon", 39.88, 125.25, "korea"),
  e("punggye-ri", ["풍계리"], "풍계리", "Punggye-ri", 41.28, 129.09, "korea"),
  e("hwadae", ["화대"], "화대", "Hwadae", 40.8, 129.5, "korea"),
  e("kittaeryong", ["깃대령"], "깃대령", "Kittaeryong", 38.65, 127.1, "korea"),
  e("seoul", ["서울"], "서울", "Seoul", 37.5665, 126.978, "korea"),
  e("yeonpyeong", ["연평"], "연평도", "Yeonpyeong", 37.667, 125.7, "korea"),
  e("dmz", ["demilitarized zone", "비무장지대"], "DMZ", "DMZ", 38.0, 127.0, "korea", "region"),
  e("east sea korea", ["동해", "east sea"], "동해", "East Sea", 38.5, 132.0, "korea", "region"),
  e("west sea korea", ["서해", "yellow sea", "황해"], "서해", "West Sea / Yellow Sea", 36.0, 124.0, "korea", "region"),
  e("south sea korea", ["남해", "korea strait", "대한해협"], "남해", "South Sea", 34.0, 128.0, "korea", "region"),

  // —— 쿠릴·북방영토 (공백 1순위) ——
  e("kuril", ["kurils", "kuril islands", "northern territories", "쿠릴", "북방영토", "북방 영토"], "쿠릴열도", "Kuril Islands", 45.0, 147.5, "kuril", "region"),
  e("iturup", ["etorofu", "이투루프", "에토로후"], "이투루프", "Iturup", 45.0, 147.9, "kuril"),
  e("kunashir", ["kunashiri", "쿠나시르", "구나시리"], "쿠나시르", "Kunashir", 44.1, 145.9, "kuril"),
  e("shikotan", ["시코탄"], "시코탄", "Shikotan", 43.8, 146.7, "kuril"),
  e("habomai", ["하보마이"], "하보마이", "Habomai", 43.4, 145.9, "kuril"),
  e("sakhalin", ["사할린"], "사할린", "Sakhalin", 51.0, 143.0, "kuril", "region"),
  e("okhotsk", ["sea of okhotsk", "오호츠크"], "오호츠크해", "Sea of Okhotsk", 55.0, 149.0, "kuril", "region"),

  // —— 일본·난세이제도 (JADIZ·대만 인접 서남제도) ——
  e("japan", ["일본"], "일본", "Japan", 36.2, 138.25, "japan", "country"),
  e("nansei", ["nansei islands", "ryukyu", "ryukyus", "난세이", "난세이제도", "난세이 제도", "류큐"], "난세이제도", "Nansei Islands", 26.5, 127.9, "japan", "region"),
  e("okinawa", ["오키나와", "okinawa prefecture"], "오키나와", "Okinawa", 26.5, 127.9, "japan", "region"),
  e("amami", ["amami oshima", "아마미", "아마미오시마"], "아마미", "Amami", 28.3, 129.5, "japan"),
  e("miyako", ["miyako-jima", "miyakojima", "미야코", "미야코지마"], "미야코", "Miyako", 24.8, 125.3, "japan"),
  e("yaeyama", ["야에야마"], "야에야마", "Yaeyama", 24.3, 124.0, "japan", "region"),
  e("ishigaki", ["이시가키"], "이시가키", "Ishigaki", 24.34, 124.16, "japan"),
  e("yonaguni", ["요나구니"], "요나구니", "Yonaguni", 24.45, 122.98, "japan"),
  e("senkaku", ["diaoyu", "diaoyu dao", "diaoyutai", "센카쿠", "댜오위", "댜오위다오", "댜오위타이", "尖閣"], "센카쿠/댜오위", "Senkaku / Diaoyu", 25.74, 123.47, "japan"),
  e("dokdo", ["takeshima", "liancourt", "liancourt rocks", "독도", "다케시마", "리앙쿠르"], "독도/다케시마", "Dokdo / Takeshima", 37.24, 131.87, "japan"),
  e("sea of japan", ["일본해", "sea of japan"], "일본해", "Sea of Japan", 40.0, 135.0, "japan", "region"),
  e("east china sea", ["동중국해", "east china sea"], "동중국해", "East China Sea", 30.0, 125.0, "japan", "region"),
  e("western pacific japan", ["서태평양", "일본 영해", "japanese territorial waters", "japan eez"], "서태평양·일본영해", "Western Pacific / Japan waters", 28.0, 140.0, "japan", "region"),
  e("tokyo", ["도쿄"], "도쿄", "Tokyo", 35.6762, 139.6503, "japan"),
  e("hokkaido", ["홋카이도"], "홋카이도", "Hokkaido", 43.2, 142.0, "japan", "region"),
  e("tsushima", ["쓰시마"], "쓰시마", "Tsushima", 34.2, 129.3, "japan"),

  // —— 발트·칼리닌그라드·수바우키 (공백 2순위) ——
  e("baltic", ["baltic sea", "발트해", "발트"], "발트해", "Baltic Sea", 56.0, 19.0, "baltic", "region"),
  e("kaliningrad", ["калининград", "칼리닌그라드", "koenigsberg", "königsberg"], "칼리닌그라드", "Kaliningrad", 54.7104, 20.4522, "baltic"),
  e("suwalki", ["suwałki", "수바우키", "suwalki gap", "suwałki gap"], "수바우키", "Suwałki", 54.1, 22.93, "baltic", "region"),
  e("vilnius", ["빌뉴스"], "빌뉴스", "Vilnius", 54.6872, 25.2797, "baltic"),
  e("riga", ["리가"], "리가", "Riga", 56.9496, 24.1052, "baltic"),
  e("tallinn", ["탈린"], "탈린", "Tallinn", 59.437, 24.7536, "baltic"),
  e("gdansk", ["gdańsk", "단치히", "그단스크"], "그단스크", "Gdansk", 54.352, 18.6466, "baltic"),
  e("szczecin", ["슈체친"], "슈체친", "Szczecin", 53.4285, 14.5528, "baltic"),
  e("gotland", ["고틀란드"], "고틀란드", "Gotland", 57.5, 18.55, "baltic"),
  e("bornholm", ["보른홀름"], "보른홀름", "Bornholm", 55.16, 14.94, "baltic"),
  e("svalbard", ["스발바르", "spitsbergen"], "스발바르", "Svalbard", 78.22, 15.65, "baltic", "region"),
  e("belarus", ["벨라루스", "belarus"], "벨라루스", "Belarus", 53.7098, 27.9534, "baltic", "country"),
  e("minsk", ["민스크"], "민스크", "Minsk", 53.9, 27.5667, "baltic"),
  e("poland", ["폴란드"], "폴란드", "Poland", 51.9194, 19.1451, "baltic", "country"),
  e("lithuania", ["리투아니아"], "리투아니아", "Lithuania", 55.1694, 23.8813, "baltic", "country"),
  e("latvia", ["라트비아"], "라트비아", "Latvia", 56.8796, 24.6032, "baltic", "country"),
  e("estonia", ["에스토니아"], "에스토니아", "Estonia", 58.5953, 25.0136, "baltic", "country"),

  // —— 흑해 (공백 3순위 · 우크라와 겹치면 도시 정밀도가 우선) ——
  e("black sea", ["흑해"], "흑해", "Black Sea", 43.5, 34.0, "black-sea", "region"),
  e("grain corridor", ["black sea grain", "곡물회랑", "곡물 회랑"], "흑해 곡물회랑", "Black Sea Grain Corridor", 44.5, 32.0, "black-sea", "region"),
  e("constanta", ["콘스탄차"], "콘스탄차", "Constanta", 44.1598, 28.6348, "black-sea"),
  e("varna", ["바르나"], "바르나", "Varna", 43.2141, 27.9147, "black-sea"),
  e("batumi", ["바투미"], "바투미", "Batumi", 41.6168, 41.6367, "black-sea"),
  e("poti", ["포티"], "포티", "Poti", 42.15, 41.67, "black-sea"),

  // —— 캅카스 (공백 4순위) ——
  e("caucasus", ["캅카스", "남캅카스", "south caucasus", "transcaucasus"], "캅카스", "Caucasus", 42.0, 45.0, "caucasus", "region"),
  e("azerbaijan", ["아제르바이잔"], "아제르바이잔", "Azerbaijan", 40.1431, 47.5769, "caucasus", "country"),
  e("armenia", ["아르메니아"], "아르메니아", "Armenia", 40.0691, 45.0382, "caucasus", "country"),
  e("georgia", ["조지아", "sakartvelo"], "조지아", "Georgia", 42.3154, 43.3569, "caucasus", "country"),
  e("baku", ["바쿠"], "바쿠", "Baku", 40.4093, 49.8671, "caucasus"),
  e("yerevan", ["예레반"], "예레반", "Yerevan", 40.1792, 44.4991, "caucasus"),
  e("tbilisi", ["트빌리시"], "트빌리시", "Tbilisi", 41.7151, 44.8271, "caucasus"),
  e("nagorno-karabakh", ["artsakh", "나고르노카라바흐", "카라바흐"], "나고르노카라바흐", "Nagorno-Karabakh", 39.8, 46.75, "caucasus", "region"),
  e("lachin", ["라친"], "라친", "Lachin", 39.6, 46.55, "caucasus"),
  e("zangezur", ["잔게주르", "syunik"], "잔게주르", "Zangezur", 39.2, 46.15, "caucasus", "region"),

  // —— 중앙아시아 (공백 5순위) ——
  e("central asia", ["중앙아시아", "central asia"], "중앙아시아", "Central Asia", 41.0, 64.0, "central-asia", "region"),
  e("kazakhstan", ["카자흐스탄"], "카자흐스탄", "Kazakhstan", 48.0196, 66.9237, "central-asia", "country"),
  e("uzbekistan", ["우즈베키스탄"], "우즈베키스탄", "Uzbekistan", 41.3775, 64.5853, "central-asia", "country"),
  e("kyrgyzstan", ["키르기스스탄", "키르기즈"], "키르기스스탄", "Kyrgyzstan", 41.2044, 74.7661, "central-asia", "country"),
  e("tajikistan", ["타지키스탄"], "타지키스탄", "Tajikistan", 38.861, 71.2761, "central-asia", "country"),
  e("turkmenistan", ["투르크메니스탄"], "투르크메니스탄", "Turkmenistan", 38.9697, 59.5563, "central-asia", "country"),
  e("astana", ["nur-sultan", "아스타나"], "아스타나", "Astana", 51.1694, 71.4491, "central-asia"),
  e("almaty", ["알마티"], "알마티", "Almaty", 43.222, 76.8512, "central-asia"),
  e("tashkent", ["타슈켄트"], "타슈켄트", "Tashkent", 41.2995, 69.2401, "central-asia"),
  e("bishkek", ["비슈케크"], "비슈케크", "Bishkek", 42.8746, 74.5698, "central-asia"),
];

const SPECIFICITY: Record<GazetteerPrecision, number> = {
  city: 3,
  region: 2,
  country: 1,
};

function escapeRe(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function aliasHits(haystack: string, alias: string): boolean {
  const trimmed = alias.trim();
  if (!trimmed) return false;
  if (/[a-z]/i.test(trimmed) && !/[가-힣]/.test(trimmed)) {
    const re = new RegExp(`\\b${escapeRe(trimmed)}\\b`, "i");
    return re.test(haystack);
  }
  return haystack.toLowerCase().includes(trimmed.toLowerCase());
}

export function matchGazetteer(text: string): GazetteerEntry | null {
  const blob = text.trim();
  if (!blob) return null;
  let best: { entry: GazetteerEntry; aliasLen: number; spec: number } | null = null;
  for (const entry of GAZETTEER) {
    for (const alias of entry.aliases) {
      if (!aliasHits(blob, alias)) continue;
      const spec = SPECIFICITY[entry.precision];
      const aliasLen = alias.length;
      if (
        !best ||
        spec > best.spec ||
        (spec === best.spec && aliasLen > best.aliasLen)
      ) {
        best = { entry, aliasLen, spec };
      }
    }
  }
  return best?.entry ?? null;
}

/** newfeedsI18n 하위 호환 — 소문자 키 → ko/en */
export const LOCATION_I18N: Record<string, { ko: string; en: string }> = (() => {
  const out: Record<string, { ko: string; en: string }> = {};
  for (const entry of GAZETTEER) {
    const labels = { ko: entry.ko, en: entry.en };
    out[entry.id] = labels;
    for (const alias of entry.aliases) {
      out[alias.toLowerCase()] = labels;
    }
  }
  return out;
})();

/** 영문 헤드라인 지명 → 한국어. 긴 구문 우선. */
export const PLACE_TITLE_PHRASE_KO: [RegExp, string][] = GAZETTEER.flatMap((entry) =>
  entry.aliases
    .filter((alias) => /[a-z]/i.test(alias) && alias.length >= 3)
    .map((alias): [RegExp, string] => [
      new RegExp(`\\b${escapeRe(alias)}\\b`, "gi"),
      entry.ko,
    ]),
).sort((a, b) => b[0].source.length - a[0].source.length);

export function gazetteerById(id: string): GazetteerEntry | undefined {
  return GAZETTEER.find((entry) => entry.id === id);
}
