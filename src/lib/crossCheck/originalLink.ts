/**
 * 근거 원본으로 열 수 있는 주소.
 * http(s)만 받고, 경로가 .pdf 이면 브라우저가 PDF로 열게 표시한다.
 */

export type OriginalKind = "web" | "pdf";

export type OriginalLink = {
  href: string;
  kind: OriginalKind;
};

const LIVEUA_HOME = /^https?:\/\/(www\.)?liveuamap\.com\/?$/i;

/**
 * 보고가 모여 있는 목록. 사건 하나의 원문이 아니라서 카드에 달지 않는다.
 * 국제해사국 지도·보고서, 레카프 경보 목록, 연합해사정보센터 모음 페이지.
 * 그 사건 PDF 한 장(ukmto.org 미디어)은 여기 해당하지 않는다.
 */
function isReportBundle(url: URL): boolean {
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const path = decodeURIComponent(url.pathname).replace(/\/+$/, "").toLowerCase();
  if (host === "icc-ccs.org") return true;
  if (host === "recaap.org") {
    if (path === "" || path === "/alerts" || path.includes("list of incidents") || path.includes("number of incidents")) {
      return true;
    }
  }
  if (host === "ukmto.org" && (path === "/partner-products/jmic-products" || path.endsWith("/jmic-products"))) {
    return true;
  }
  return false;
}

export function classifyOriginalUrl(raw: string | null | undefined): OriginalLink | null {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (LIVEUA_HOME.test(url.toString())) return null;
  if (isReportBundle(url)) return null;
  const kind: OriginalKind = url.pathname.toLowerCase().endsWith(".pdf") ? "pdf" : "web";
  return { href: url.toString(), kind };
}
