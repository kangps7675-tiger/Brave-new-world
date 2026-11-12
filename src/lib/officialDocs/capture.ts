/**
 * 공식 문서 원본 파일(PDF) 보관의 순수 부분. 워커(수집)와 API(내려주기)와 테스트가 같이 쓴다.
 *
 * 저장은 어느 나라 문서든 같은 규칙으로 한다(정부가 나중에 파일을 고치거나 지워도 "그때는 이랬다"는 증거가 남게).
 * 사용자에게 우리 서버에서 직접 펼쳐 보여 주는 것은 별개라서 발행처마다 켜고 끈다(FILE_DISPLAY_ISSUERS).
 * 꺼진 나라도 원본 링크와 아카이브 보관본 링크는 보인다.
 */

/** 이보다 큰 파일은 받지 않는다(워커 메모리·R2 용량·모바일 열람 모두 감안) */
export const FILE_MAX_BYTES = 15 * 1024 * 1024;

/**
 * 원본 파일을 우리 서버에서 직접 보여 줘도 되는 발행처. **이용 조건을 읽고 확인한 곳만** 넣는다.
 *  - us: 미국 연방정부 저작물은 저작권 보호 대상이 아니다(17 U.S.C. §105). state.gov·whitehouse.gov 안내문도 같은 취지(2026-11-12 확인).
 *    단 사진·삽화 등 제3자 자료는 예외라는 안내가 있다.
 *  - gb: 영국 정부는 Open Government Licence v3.0(출처 표기 조건, 로고·제3자 권리 제외). 2026-11-12 확인.
 * 다른 나라는 이용 조건을 읽은 뒤 한 곳씩 추가한다. 빠진 나라는 "안 된다"가 아니라 "아직 확인 안 했다"는 뜻이다.
 */
export const FILE_DISPLAY_ISSUERS: ReadonlySet<string> = new Set(["us", "gb"]);

export function fileDisplayAllowed(issuerId: string): boolean {
  return FILE_DISPLAY_ISSUERS.has(issuerId);
}

export function isPdfUrl(url: string): boolean {
  try {
    return /\.pdf$/i.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

const SECOND_LEVEL = new Set(["gov.uk", "co.uk", "gov.cn", "go.jp", "go.kr", "gov.in", "gov.au", "gov.ua", "gov.pl", "gov.pk", "gov.sa", "gov.qa", "gov.lv", "gov.md", "gov.tw", "gov.il", "gov.tr", "com.tr"]);

function siteOf(host: string): string {
  const labels = host.toLowerCase().replace(/^www\./, "").split(".");
  const two = labels.slice(-2).join(".");
  return SECOND_LEVEL.has(two) ? labels.slice(-3).join(".") : two;
}

/** 같은 기관 사이트인가(문서 페이지와 첨부 PDF가 다른 하위 도메인이어도 같은 사이트로 본다). 엉뚱한 외부 PDF를 받지 않으려는 장치. */
export function sameSite(a: string, b: string): boolean {
  try {
    const ha = new URL(a).hostname.toLowerCase();
    const hb = new URL(b).hostname.toLowerCase();
    if (ha === hb) return true;
    // 영국 정부 첨부는 assets.publishing.service.gov.uk 에 있다
    if (ha.endsWith(".gov.uk") && hb.endsWith(".gov.uk")) return true;
    return siteOf(ha) === siteOf(hb);
  } catch {
    return false;
  }
}

/** 문서 페이지 HTML에서 같은 사이트의 PDF 링크를 나온 순서대로 */
export function pdfLinksOf(html: string, pageUrl: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/<a\b[^>]*?\bhref\s*=\s*["']([^"']+?\.pdf(?:[?#][^"']*)?)["']/gi)) {
    try {
      const url = new URL(m[1].replace(/&amp;/g, "&"), pageUrl).toString();
      if (sameSite(url, pageUrl) && !out.includes(url)) out.push(url);
    } catch {
      /* 잘못된 주소는 건너뛴다 */
    }
  }
  return out;
}

/** PDF 파일 첫 5바이트(%PDF-). 로그인·차단 HTML을 PDF로 저장하지 않으려는 확인. */
export function isPdfBytes(buf: ArrayBuffer): boolean {
  const head = new Uint8Array(buf.slice(0, 5));
  return head.length === 5 && String.fromCharCode(...head) === "%PDF-";
}

export async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** R2 객체 키. 파일이 바뀌어 해시가 달라지면 새 키로 저장해 옛 사본도 남는다. */
export function fileKeyOf(docId: string, sha256: string): string {
  return `official-docs/${docId}/${sha256.slice(0, 16)}.pdf`;
}

/** 웹 아카이브 "Save Page Now" 응답에서 보관본 주소를 읽는다. 읽을 수 없으면 null. */
export function archiveUrlOf(headers: { get(name: string): string | null }, finalUrl: string): string | null {
  const loc = headers.get("content-location");
  if (loc && /^\/web\/\d{8,14}/.test(loc)) return `https://web.archive.org${loc}`;
  if (/^https:\/\/web\.archive\.org\/web\/\d{8,14}/.test(finalUrl)) return finalUrl;
  return null;
}

export function archiveSaveUrl(target: string): string {
  return `https://web.archive.org/save/${target}`;
}

export const DOC_ID_RE = /^[a-f0-9]{20}$/;
