/**
 * 공식 사이트에 요청을 보내는 공통 함수. 점검 스크립트와 수집 스크립트가 같이 쓴다.
 * 정부 사이트 상당수가 "프로그램 같은" 요청(기본 User-Agent, Accept 헤더 없음)을 403으로 막으므로
 * 일반 브라우저와 같은 모양의 헤더를 보낸다. 그래도 막는 곳(봇 차단 서비스)은 뚫으려 하지 않고 그대로 실패로 보고한다.
 */
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 StraitDeskBot/1.0";

export type FetchedPage = { body: string; type: string; finalUrl: string };

/** fetch 실패의 진짜 원인(DNS·인증서·연결 거부 등)은 error.cause에 들어 있다. 사람이 읽을 한 줄로 푼다. */
export function describeFetchError(error: unknown): string {
  const err = error as { name?: string; message?: string; cause?: { code?: string; message?: string } };
  if (err?.name === "AbortError") return "시간 초과(40초)";
  const cause = err?.cause;
  if (cause?.code || cause?.message) return `${err.message ?? "fetch failed"} → ${cause.code ?? ""} ${cause.message ?? ""}`.trim();
  return err?.message ?? String(error);
}

export async function getPage(url: string, timeoutMs = 40_000): Promise<FetchedPage> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // 일반 브라우저처럼 리다이렉트 중 받은 쿠키를 다음 요청에 실어 보낸다.
    // (쿠키를 받아야 통과시키는 사이트에서 "redirect count exceeded"로 빙빙 도는 것을 막는다.)
    const jar = new Map<string, string>();
    let current = url;
    for (let hop = 0; hop < 10; hop += 1) {
      const res = await fetch(current, {
        signal: controller.signal,
        redirect: "manual",
        headers: {
          "User-Agent": BROWSER_UA,
          Accept: "text/html,application/xhtml+xml,application/xml,application/rss+xml,application/atom+xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          ...(jar.size > 0 ? { Cookie: Array.from(jar, ([k, v]) => `${k}=${v}`).join("; ") } : {}),
        },
      });
      for (const line of res.headers.getSetCookie?.() ?? []) {
        const pair = line.split(";")[0];
        const eq = pair.indexOf("=");
        if (eq > 0) jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
      }
      if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
        current = new URL(res.headers.get("location") as string, current).toString();
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const type = res.headers.get("content-type") ?? "";
      // Word·PDF 같은 파일을 글자로 읽으면 깨진 문자열이 본문처럼 저장된다. 글자 문서가 아니면 거절한다.
      if (/(msword|officedocument|octet-stream|application\/pdf|zip|image\/)/i.test(type)) {
        throw new Error(`글자 문서가 아님(${type.split(";")[0]}) — PDF·Word는 --text-file로 텍스트를 직접 넣는다`);
      }
      return { body: await res.text(), type, finalUrl: current };
    }
    throw new Error("리다이렉트가 10번을 넘음(쿠키를 받아도 계속 돌려보냄)");
  } catch (error) {
    throw new Error(describeFetchError(error));
  } finally {
    clearTimeout(timer);
  }
}
