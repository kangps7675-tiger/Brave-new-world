/**
 * 사건 카드에 열어 볼 보고.
 * 모아 둔 목록은 그 문장이 맞다는 도장이 아니다. 그 종류 사건에서만 연다.
 * 사건 한 건의 PDF가 본문에 있으면 그게 원문이다.
 */

import type { StackItem } from "@/lib/incidentStack/build";
import { peelUrlsFromText } from "@/lib/liveuamap/peelTitleUrls";
import { classifyOriginalUrl, type OriginalKind } from "@/lib/crossCheck/originalLink";

export type RelatedReport = {
  id: string;
  sourceName: string;
  href: string;
  kind: OriginalKind;
  /** 이 주소가 그 한 건의 글인지, 보고가 모인 곳인지 */
  matched: boolean;
  noteKo: string;
  noteEn: string;
};

const MISSILE =
  /\b(?:missile|drone|uav|projectile|usv)\b|미사일|드론|무인기|발사체/i;
const PIRACY =
  /\b(?:piracy|pirates?|armed robbery|skiffs?|boarded|boarding|robbers?)\b|해적|무장\s*강도|승선/i;
const ASIA_PLACE =
  /\b(?:malacca|singapore|indonesia|philippines|vietnam|bangladesh|chittagong|sabah|south china sea)\b|말라카|싱가포르|인도네시아|필리핀|베트남|방글라데시/i;
const HORMUZ_PLACE =
  /\b(?:hormuz|red sea|gulf of aden|bab el|mukalla|oman|yemen|houthi)\b|호르무즈|홍해|아덴|예멘|후티|오만/i;

function blob(item: StackItem): string {
  return [item.title, item.place, item.detail, item.vesselName, item.vesselType].filter(Boolean).join("\n");
}

function inAsia(item: StackItem, text: string): boolean {
  if (ASIA_PLACE.test(text)) return true;
  return item.lat >= -8 && item.lat <= 25 && item.lng >= 88 && item.lng <= 125;
}

function inHormuzBook(item: StackItem, text: string): boolean {
  if (item.sea === "hormuz" || item.sea === "red_sea" || item.sea === "gulf_of_aden") return true;
  return HORMUZ_PLACE.test(text);
}

function specificPdf(item: StackItem): RelatedReport | null {
  const found = peelUrlsFromText(`${item.detail ?? ""}\n${item.url ?? ""}`).urls
    .map((url) => classifyOriginalUrl(url))
    .find((link) => link?.kind === "pdf" && /ukmto\.org|jmic/i.test(link.href));
  if (!found) return null;
  return {
    id: "matched-pdf",
    sourceName: "JMIC",
    href: found.href,
    kind: "pdf",
    matched: true,
    noteKo: "이 사건과 맞는 글입니다.",
    noteEn: "This file is the note for this incident.",
  };
}

export function relatedReports(item: StackItem): RelatedReport[] {
  const text = blob(item);
  const out: RelatedReport[] = [];
  const pdf = specificPdf(item);
  if (pdf) out.push(pdf);

  const hormuzBook = inHormuzBook(item, text);
  const missile = MISSILE.test(text);
  const piracy = PIRACY.test(text);

  if (hormuzBook && (missile || item.source === "ukmto" || item.source === "nga")) {
    out.push({
      id: "jmic",
      sourceName: "연합해사정보센터",
      href: "https://www.ukmto.org/partner-products/jmic-products",
      kind: "web",
      matched: false,
      noteKo: "홍해·호르무즈 상선 공격 보고가 모인 곳입니다. 이 한 건을 맞다고 찍어 주지는 않습니다. 그 사건 PDF가 있으면 그 주소가 원문입니다.",
      noteEn: "Reports of Red Sea and Hormuz merchant attacks are gathered here. This list does not confirm this one sentence. A matching PDF is the original.",
    });
  }

  if (piracy && !(missile && hormuzBook)) {
    out.push({
      id: "imb",
      sourceName: "국제해사국",
      href: "https://icc-ccs.org/map/",
      kind: "web",
      matched: false,
      noteKo: "해적·무장강도가 모이는 올해 지도입니다. 호르무즈 미사일 공격은 여기 사건이 아닙니다.",
      noteEn: "This year's map of piracy and armed robbery. A Hormuz missile attack is not one of these incidents.",
    });
  }

  if (piracy && inAsia(item, text)) {
    out.push({
      id: "recaap",
      sourceName: "레카프",
      href: "https://www.recaap.org/alerts",
      kind: "web",
      matched: false,
      noteKo: "아시아 해역 사건이 모이는 경보 목록입니다. 중동 선박 공격과는 다른 책입니다.",
      noteEn: "Alerts for incidents in Asian waters. A different book from Middle East ship attacks.",
    });
  }

  return out;
}
