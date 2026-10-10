/**
 * LiveUA name/title에 붙은 URL을 제목에서 떼어 본문으로 옮긴다.
 */

const URL_RE = /https?:\/\/[^\s<>"')\]]+/gi;

function normalizeUrl(raw: string): string {
  return raw.replace(/[),.]+$/g, "");
}

/** 텍스트에서 URL을 분리한다. */
export function peelUrlsFromText(text: string): { text: string; urls: string[] } {
  const urls: string[] = [];
  const cleaned = text
    .replace(URL_RE, (m) => {
      const url = normalizeUrl(m);
      if (url) urls.push(url);
      return " ";
    })
    .replace(/\s+/g, " ")
    .trim();
  return { text: cleaned, urls: [...new Set(urls)] };
}

function isGenericLiveuaHome(url: string | undefined): boolean {
  if (!url) return true;
  return /^https?:\/\/(www\.)?liveuamap\.com\/?$/i.test(url.trim());
}

/**
 * 제목·본문·sourceUrl을 정리한다.
 * URL은 제목에 두지 않고 본문 끝에 남긴다.
 */
export function splitLiveuaTitleBody(
  title: string,
  body: string,
  sourceUrl?: string,
): { title: string; body: string; sourceUrl: string } {
  const fromTitle = peelUrlsFromText(title.trim());
  const fromBody = peelUrlsFromText(body.trim());
  const urls = [...new Set([...fromTitle.urls, ...fromBody.urls])];

  let nextTitle = fromTitle.text;
  let nextBody = fromBody.text;

  if (!nextTitle && nextBody) {
    nextTitle = nextBody.slice(0, 120);
  }
  if (!nextBody && nextTitle) {
    nextBody = nextTitle;
  }

  for (const u of urls) {
    if (!nextBody.includes(u)) {
      nextBody = nextBody ? `${nextBody}\n${u}` : u;
    }
  }

  let nextSource = (sourceUrl || "").trim();
  if (urls[0] && isGenericLiveuaHome(nextSource)) {
    nextSource = urls[0]!;
  }
  if (!nextSource) {
    nextSource = urls[0] || "https://liveuamap.com/";
  }

  return { title: nextTitle, body: nextBody, sourceUrl: nextSource };
}
