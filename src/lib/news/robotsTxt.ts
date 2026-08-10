/**
 * robots.txt 준수 — 기사 페이지를 능동적으로 가져오기 전에 확인한다.
 *
 * ## 왜 필요한가
 *
 * `enrichArticleImage.ts` 는 RSS 에 이미지가 없을 때 **기사 페이지 HTML 을 직접
 * 가져와** og:image 를 파싱한다. 이건 RSS 를 받는 것과 성격이 다르다 — 매체가
 * 배포하라고 내준 피드가 아니라, 우리가 그쪽 서버에 능동적으로 요청을 넣는
 * 크롤링이다. robots.txt 는 그 서버가 자동화 접근에 대해 밝혀둔 유일한 의사표시고,
 * 무시하면 저작권과 별개로 **약관 위반·업무방해** 축이 열린다.
 *
 * ## 구현 기준 — RFC 9309 (Robots Exclusion Protocol)
 *
 * - `User-agent` 그룹은 우리 토큰 정확 일치를 우선하고, 없으면 `*` 그룹을 쓴다
 * - `Allow` / `Disallow` 는 **가장 긴 패턴이 이긴다.** 길이가 같으면 `Allow` 우선
 * - `*`(임의 문자열) · `$`(끝 고정) 와일드카드 지원
 * - 4xx(robots.txt 없음) → **전체 허용** (RFC 9309 §2.3.1.4)
 * - 5xx·네트워크 실패 → **전체 차단** (RFC 9309 §2.3.1.4 — "SHOULD assume complete disallow")
 *
 * 마지막 항목이 이 모듈에서 유일하게 "안전한 쪽으로 튼" 선택이다.
 * 상대 서버가 아프면 우리가 긁지 않는 게 맞다.
 *
 * @see docs/copyright-audit-2026-08-01.md — O-3
 */

/** robots.txt 캐시 TTL — 12h (RFC 권장 24h 이내) */
const ROBOTS_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const ROBOTS_FETCH_TIMEOUT_MS = 3_000;
/** robots.txt 본문 상한 — RFC 9309 §2.5 는 최소 500KiB 파싱을 요구 */
const ROBOTS_MAX_BYTES = 512 * 1024;

type RobotsRule = { path: string; allow: boolean };

type RobotsPolicy = {
  /** 그룹 규칙 (긴 패턴 우선 정렬됨) */
  rules: RobotsRule[];
  /** Crawl-delay (초). 없으면 null */
  crawlDelaySec: number | null;
  /** 전체 차단 여부 — 5xx·네트워크 실패 시 true */
  blockAll: boolean;
};

type CacheEntry = { policy: RobotsPolicy; at: number };

const robotsCache = new Map<string, CacheEntry>();
/** origin → 마지막 요청 시각 (Crawl-delay 준수용) */
const lastFetchAt = new Map<string, number>();

const ALLOW_ALL: RobotsPolicy = { rules: [], crawlDelaySec: null, blockAll: false };
const BLOCK_ALL: RobotsPolicy = { rules: [], crawlDelaySec: null, blockAll: true };

/** robots.txt 경로 패턴 → 정규식. `*` 와 `$` 만 특수문자로 취급한다. */
function pathPatternToRegExp(pattern: string): RegExp {
  let out = "";
  for (let i = 0; i < pattern.length; i += 1) {
    const ch = pattern[i]!;
    if (ch === "*") {
      out += ".*";
    } else if (ch === "$" && i === pattern.length - 1) {
      out += "$";
    } else {
      out += ch.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
    }
  }
  return new RegExp(`^${out}`);
}

/**
 * robots.txt 본문 파싱 — 우리 UA 토큰에 해당하는 그룹만 뽑는다.
 *
 * @param uaToken 소문자 UA 토큰 (예: "conflictviewbot")
 */
export function parseRobotsTxt(body: string, uaToken: string): RobotsPolicy {
  const token = uaToken.toLowerCase();

  // 그룹 수집: 연속된 User-agent 줄은 하나의 그룹을 공유한다
  type Group = { agents: string[]; rules: RobotsRule[]; crawlDelaySec: number | null };
  const groups: Group[] = [];
  let current: Group | null = null;
  let lastLineWasAgent = false;

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;

    const sep = line.indexOf(":");
    if (sep === -1) continue;
    const field = line.slice(0, sep).trim().toLowerCase();
    const value = line.slice(sep + 1).trim();

    if (field === "user-agent") {
      if (!lastLineWasAgent || !current) {
        current = { agents: [], rules: [], crawlDelaySec: null };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastLineWasAgent = true;
      continue;
    }

    lastLineWasAgent = false;
    if (!current) continue;

    if (field === "disallow") {
      // 빈 Disallow 는 "제한 없음" 을 뜻하므로 규칙으로 넣지 않는다
      if (value) current.rules.push({ path: value, allow: false });
    } else if (field === "allow") {
      if (value) current.rules.push({ path: value, allow: true });
    } else if (field === "crawl-delay") {
      const n = Number.parseFloat(value);
      if (Number.isFinite(n) && n >= 0) current.crawlDelaySec = n;
    }
  }

  // 우리 토큰 정확 일치 그룹 우선, 없으면 `*`
  const exact = groups.filter((g) => g.agents.some((a) => a === token));
  const wildcard = groups.filter((g) => g.agents.includes("*"));
  const picked = exact.length > 0 ? exact : wildcard;
  if (picked.length === 0) return ALLOW_ALL;

  const rules = picked.flatMap((g) => g.rules);
  // 긴 패턴이 이긴다. 같은 길이면 Allow 우선 (RFC 9309 §2.2.2)
  rules.sort((a, b) => b.path.length - a.path.length || Number(b.allow) - Number(a.allow));

  const crawlDelaySec = picked.reduce<number | null>(
    (acc, g) => (g.crawlDelaySec != null ? Math.max(acc ?? 0, g.crawlDelaySec) : acc),
    null,
  );

  return { rules, crawlDelaySec, blockAll: false };
}

/** 정책에 비추어 경로가 허용되는가 */
export function isPathAllowed(policy: RobotsPolicy, pathname: string): boolean {
  if (policy.blockAll) return false;
  for (const rule of policy.rules) {
    if (pathPatternToRegExp(rule.path).test(pathname)) return rule.allow;
  }
  return true;
}

async function loadPolicy(origin: string, userAgent: string): Promise<RobotsPolicy> {
  const cached = robotsCache.get(origin);
  if (cached && Date.now() - cached.at < ROBOTS_CACHE_TTL_MS) return cached.policy;

  const uaToken = (userAgent.split("/")[0] ?? userAgent).toLowerCase();
  let policy: RobotsPolicy;

  try {
    const res = await fetch(`${origin}/robots.txt`, {
      signal: AbortSignal.timeout(ROBOTS_FETCH_TIMEOUT_MS),
      headers: { "User-Agent": userAgent, Accept: "text/plain" },
      redirect: "follow",
      cache: "no-store",
    });

    if (res.status >= 500) {
      // 서버가 아프다 — 긁지 않는다
      policy = BLOCK_ALL;
    } else if (!res.ok) {
      // 404 등 — robots.txt 가 없으면 제한 없음
      policy = ALLOW_ALL;
    } else {
      const buf = await res.arrayBuffer();
      const slice = buf.byteLength > ROBOTS_MAX_BYTES ? buf.slice(0, ROBOTS_MAX_BYTES) : buf;
      const text = new TextDecoder("utf-8", { fatal: false }).decode(slice);
      policy = parseRobotsTxt(text, uaToken);
    }
  } catch {
    // 타임아웃·네트워크 실패 — 보수적으로 차단
    policy = BLOCK_ALL;
  }

  robotsCache.set(origin, { policy, at: Date.now() });
  return policy;
}

/**
 * 이 URL 을 크롤링해도 되는가.
 *
 * robots.txt 를 확인하고, Crawl-delay 가 지정돼 있으면 그만큼 기다린다.
 * 차단이면 `false` — 호출부는 조용히 건너뛰면 된다.
 */
export async function canFetchArticle(
  targetUrl: string,
  userAgent: string,
): Promise<boolean> {
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;

  const origin = parsed.origin;
  const policy = await loadPolicy(origin, userAgent);
  if (!isPathAllowed(policy, `${parsed.pathname}${parsed.search}`)) return false;

  // Crawl-delay 준수 — 같은 오리진 연속 요청 간격 확보
  if (policy.crawlDelaySec != null && policy.crawlDelaySec > 0) {
    const gapMs = Math.min(policy.crawlDelaySec * 1000, 10_000);
    const last = lastFetchAt.get(origin) ?? 0;
    const wait = last + gapMs - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  }
  lastFetchAt.set(origin, Date.now());

  return true;
}

/** 테스트용 캐시 비우기 */
export function clearRobotsCacheForTests() {
  robotsCache.clear();
  lastFetchAt.clear();
}
