/**
 * 주간 함선 이동기 — 근거 URL 정규화·딥링크.
 * 관측이 가리키는 보고서 본문(기사·PDF)으로 보내고, 가능하면 함명/근거 구절로 스크롤한다.
 */

import type { PublicShipObservation } from "@/lib/shipMovements/types";

/** USNI 기사 permalink 형태 */
const USNI_ARTICLE_RE =
  /^https?:\/\/news\.usni\.org\/\d{4}\/\d{2}\/\d{2}\/[a-z0-9\-]+\/?$/i;

/** JSO / MOD 보도·PDF */
const JSO_HOST_RE = /^https?:\/\/(?:www\.)?mod\.go\.jp\//i;

export function canonicalizeShipEvidenceUrl(raw: string | null | undefined): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "";

  let url: URL;
  try {
    url = new URL(trimmed.startsWith("//") ? `https:${trimmed}` : trimmed);
  } catch {
    return trimmed;
  }

  if (url.protocol === "http:") url.protocol = "https:";

  // 추적 파라미터 제거
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_|fbclid|gclid|mc_)/i.test(key) || key === "ref") {
      url.searchParams.delete(key);
    }
  }

  // USNI 카테고리/피드가 오면 그대로 두되 trailing slash 정리
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (path !== "/" && !path.endsWith(".pdf")) {
    url.pathname = path;
  }

  url.hash = "";
  return url.toString();
}

/** 보고서 본문에서 찾을 짧은 근거 구절 */
export function evidenceSnippetForDeepLink(obs: PublicShipObservation): string | null {
  const candidates = [
    ...(obs.evidenceQuotes || []),
    obs.vesselName,
    obs.hullNumber,
    obs.locationLabel,
  ]
    .map((s) => (s || "").replace(/\s+/g, " ").trim())
    .filter((s) => s.length >= 4 && s.length <= 96);

  return candidates[0] ?? null;
}

/**
 * 관측 → 열 근거 기록 URL.
 * USNI HTML 기사는 Text Fragment로 함명/인용구 근처로 이동 시도.
 * PDF·인덱스·애매한 URL은 정규화된 원문만.
 */
export function shipEvidencePermalink(obs: PublicShipObservation): string {
  const base =
    canonicalizeShipEvidenceUrl(obs.sourceUrl) ||
    canonicalizeShipEvidenceUrl(
      // reportTitle만 있고 url이 비는 경우는 없음 — 방어
      null,
    );
  if (!base) return "";

  try {
    const u = new URL(base);
    if (/\.pdf($|\?)/i.test(u.pathname)) return base;
    if (!USNI_ARTICLE_RE.test(base) && !JSO_HOST_RE.test(base)) {
      // 그래도 https 정규화본은 반환
      return base;
    }
    if (!USNI_ARTICLE_RE.test(base)) return base;

    const snippet = evidenceSnippetForDeepLink(obs);
    if (!snippet) return base;

    // Chrome Text Fragments — 단순 구절 1개
    const encoded = encodeURIComponent(snippet).replace(/-/g, "%2D");
    return `${base}#:~:text=${encoded}`;
  } catch {
    return base;
  }
}

export function isLikelyShipArticleUrl(url: string): boolean {
  const c = canonicalizeShipEvidenceUrl(url);
  if (!c) return false;
  if (USNI_ARTICLE_RE.test(c)) return true;
  if (JSO_HOST_RE.test(c) && (/\.pdf($|\?)/i.test(c) || /\/js\//i.test(c))) return true;
  return /^https?:\/\//i.test(c);
}
