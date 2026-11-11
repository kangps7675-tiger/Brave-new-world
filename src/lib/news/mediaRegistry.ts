/**
 * 매체를 이름 조각이 아니라 도메인으로 구별하는 목록. 같은 이름의 다른 매체나 주소 안의 단어에
 * 속지 않는다. 소유·재원 구조(ownership)를 같이 적어서 화면이 "러시아 국영"처럼 말할 수 있게 한다.
 *
 * ⚠ 초안이다. 매체의 소유·편집 독립성은 논쟁이 있을 수 있어, 새로 넣거나 고칠 때는 근거(RSF 지수,
 * 소유 구조 공시 등)를 note에 적고 필성이 검수한다. 목록에 없는 매체는 기본 2등급(보완 매체)이다.
 */
import type { MediaTrustTier } from "@/lib/news/types";

export type MediaOwnership =
  | "wire" //          통신사·와이어(정부에서 편집 독립)
  | "independent" //   민간 독립 언론
  | "public" //        공영(재원은 공적이나 편집 독립이 제도로 보장)
  | "state" //         국영·정부 통제 매체
  | "party" //         정파·무장단체 계열 매체
  | "osint" //         민간 OSINT
  | "think-tank"; //   연구소

export type MediaEntry = {
  name: string;
  hosts: string[];
  /** ISO 3166-1 alpha-2(소문자). 국제 매체는 null. */
  country: string | null;
  ownership: MediaOwnership;
  tier: MediaTrustTier;
  note?: string;
};

const e = (name: string, hosts: string[], country: string | null, ownership: MediaOwnership, tier: MediaTrustTier, note?: string): MediaEntry => ({
  name, hosts, country, ownership, tier, ...(note ? { note } : {}),
});

export const MEDIA_REGISTRY: readonly MediaEntry[] = [
  // 통신사
  e("Reuters", ["reuters.com"], "gb", "wire", 1),
  e("Associated Press", ["apnews.com", "ap.org"], "us", "wire", 1),
  e("AFP", ["afp.com"], "fr", "wire", 1),
  e("dpa", ["dpa.com", "dpa-international.com"], "de", "wire", 1),
  e("EFE", ["efe.com"], "es", "wire", 1),
  e("ANSA", ["ansa.it"], "it", "wire", 1),
  e("PTI", ["ptinews.com"], "in", "wire", 1),
  e("Yonhap", ["yna.co.kr", "yonhapnews.co.kr", "yonhapnews.net"], "kr", "wire", 1, "국가기간통신사이나 편집 독립 인정"),
  e("Kyodo", ["kyodonews.net", "kyodonews.jp"], "jp", "wire", 1),
  e("Jiji", ["jiji.com"], "jp", "wire", 1),
  // 민간 독립 언론
  e("The New York Times", ["nytimes.com"], "us", "independent", 1),
  e("The Washington Post", ["washingtonpost.com"], "us", "independent", 1),
  e("The Wall Street Journal", ["wsj.com"], "us", "independent", 1),
  e("Financial Times", ["ft.com"], "gb", "independent", 1),
  e("Bloomberg", ["bloomberg.com"], "us", "independent", 1),
  e("The Guardian", ["theguardian.com"], "gb", "independent", 1),
  e("The Economist", ["economist.com"], "gb", "independent", 1),
  e("CNBC", ["cnbc.com"], "us", "independent", 1),
  e("CNN", ["cnn.com"], "us", "independent", 2),
  e("Fox News", ["foxnews.com"], "us", "independent", 2),
  e("NBC News", ["nbcnews.com"], "us", "independent", 2),
  e("The Hindu", ["thehindu.com"], "in", "independent", 2),
  e("Times of India", ["timesofindia.indiatimes.com", "indiatimes.com"], "in", "independent", 2),
  e("SCMP", ["scmp.com"], "hk", "independent", 2, "알리바바 소유"),
  // 공영(편집 독립 제도)
  e("BBC", ["bbc.com", "bbc.co.uk"], "gb", "public", 1),
  e("NHK", ["nhk.or.jp"], "jp", "public", 1),
  e("Deutsche Welle", ["dw.com"], "de", "public", 1, "정부 재원, 법으로 편집 독립 규정"),
  // 우크라이나·러시아 독립/망명
  e("Kyiv Independent", ["kyivindependent.com"], "ua", "independent", 1),
  e("Kyiv Post", ["kyivpost.com"], "ua", "independent", 1),
  e("Ukrinform", ["ukrinform.net", "ukrinform.ua"], "ua", "wire", 1, "국가 통신사이나 직접통제형은 아님(PRESS_FREEDOM_REFERENCE 기준)"),
  e("Ukrainska Pravda", ["pravda.com.ua"], "ua", "independent", 2),
  e("Meduza", ["meduza.io"], "lv", "independent", 1, "러시아어 망명 매체"),
  e("The Moscow Times", ["themoscowtimes.com"], "nl", "independent", 1, "러시아 관련 망명 매체"),
  e("Mediazona", ["zona.media", "mediazona.ru"], null, "independent", 1),
  // 중동
  e("Al Jazeera", ["aljazeera.com"], "qa", "independent", 2, "카타르 왕실 재원"),
  e("Al Arabiya", ["alarabiya.net"], "sa", "independent", 2, "사우디 계열 소유"),
  e("Haaretz", ["haaretz.com"], "il", "independent", 2),
  e("The Times of Israel", ["timesofisrael.com"], "il", "independent", 2),
  e("The Jerusalem Post", ["jpost.com"], "il", "independent", 2),
  e("Ynet", ["ynetnews.com", "ynet.co.il"], "il", "independent", 2),
  e("Iran International", ["iranintl.com"], "gb", "independent", 2, "런던 기반 페르시아어 매체"),
  e("Anadolu Agency", ["aa.com.tr"], "tr", "wire", 2, "국영 통신사이나 경계 사례로 2등급 유지(기존 정책)"),
  // 국영·정부 통제
  e("TASS", ["tass.com", "tass.ru"], "ru", "state", 3),
  e("RIA Novosti", ["ria.ru", "rian.ru"], "ru", "state", 3),
  e("RT", ["rt.com"], "ru", "state", 3),
  e("Sputnik", ["sputniknews.com", "sputnikglobe.com"], "ru", "state", 3),
  e("Rossiyskaya Gazeta", ["rg.ru"], "ru", "state", 3),
  e("Xinhua", ["xinhuanet.com", "news.cn"], "cn", "state", 3),
  e("CGTN", ["cgtn.com"], "cn", "state", 3),
  e("Global Times", ["globaltimes.cn"], "cn", "state", 3),
  e("China Daily", ["chinadaily.com.cn"], "cn", "state", 3),
  e("People's Daily", ["people.com.cn", "peopledaily.com.cn"], "cn", "state", 3),
  e("CCTV", ["cctv.com", "cctv.cn"], "cn", "state", 3),
  e("KCNA", ["kcna.kp", "kcna.co.jp"], "kp", "state", 3),
  e("Rodong Sinmun", ["rodong.rep.kp"], "kp", "state", 3),
  e("Press TV", ["presstv.ir", "presstv.com"], "ir", "state", 3),
  e("IRNA", ["irna.ir", "irna.ir"], "ir", "state", 3),
  e("Fars News", ["farsnews.ir"], "ir", "state", 3, "IRGC 계열"),
  e("Tasnim", ["tasnimnews.com"], "ir", "state", 3, "IRGC 계열"),
  e("Mehr News", ["mehrnews.com"], "ir", "state", 3),
  e("SANA", ["sana.sy"], "sy", "state", 3),
  e("TRT World", ["trtworld.com", "trt.net.tr"], "tr", "state", 3),
  // 정파·무장단체 계열
  e("Al-Manar", ["almanar.com.lb"], "lb", "party", 3, "헤즈볼라 계열"),
  e("Al-Masirah", ["almasirah.net", "almasirah.net.ye"], "ye", "party", 3, "후티 계열"),
  // OSINT·연구소
  e("Bellingcat", ["bellingcat.com"], null, "osint", 2),
  e("Oryx", ["oryxspioenkop.com"], null, "osint", 2),
  e("The War Zone", ["twz.com", "thedrive.com"], "us", "osint", 2),
  e("ISW", ["understandingwar.org"], "us", "think-tank", 2),
  e("Critical Threats", ["criticalthreats.org"], "us", "think-tank", 2),
  e("CSIS", ["csis.org"], "us", "think-tank", 2),
  e("Chatham House", ["chathamhouse.org"], "gb", "think-tank", 2),
  e("International Crisis Group", ["crisisgroup.org"], null, "think-tank", 2),
  e("Carnegie", ["carnegieendowment.org"], "us", "think-tank", 2),
  e("38 North", ["38north.org"], "us", "think-tank", 2),
  e("NK News", ["nknews.org"], null, "osint", 2),
  e("Jamestown Foundation", ["jamestown.org"], "us", "think-tank", 2),
  e("IISS", ["iiss.org"], "gb", "think-tank", 2),
  e("Janes", ["janes.com"], "gb", "think-tank", 2),
];

function hostMatches(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

/** 주소의 도메인으로 매체를 찾는다. 하위 도메인(en.yna.co.kr 등)도 잡는다. */
export function mediaByHost(host: string): MediaEntry | null {
  const h = host.toLowerCase().replace(/^www\./, "");
  if (!h) return null;
  return MEDIA_REGISTRY.find((row) => row.hosts.some((domain) => hostMatches(h, domain))) ?? null;
}
