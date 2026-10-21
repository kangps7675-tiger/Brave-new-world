import { formatUtcFull, parseTime } from "./provenance";

/**
 * 이메일 다이제스트 — 순수 함수만 둔다 (워커·테스트 공용, 앱 별칭(@/) import 금지).
 * 구독자에게는 "새 피격 사건"과 "보도 기준 전쟁위험 보험료"를 하루 한 번 보낸다.
 * 하루 발송 시각은 워커 크론 `EMAIL_DIGEST_CRON` (01:00 UTC = 한국시간 10:00).
 */

/** wrangler.ingest.toml 의 세 번째 크론과 같아야 한다. 01:00 UTC = 한국시간 10:00. */
export const EMAIL_DIGEST_CRON = "0 1 * * *";

export type DigestLang = "ko" | "en";

export type DigestIncident = {
  source: "UKMTO" | "NGA";
  /** 사건 유형·선종 등 한 줄 제목 */
  title: string;
  place: string;
  occurredAt?: string | null;
  publishedAt?: string | null;
  firstSeenAt?: string | null;
};

export type DigestQuote = {
  region: string;
  ratePct: number | null;
  rateHighPct: number | null;
  ratePrevPct: number | null;
  direction: string | null;
  outlet: string | null;
  headline: string;
  url: string;
  publishedAt: string | null;
};

export type DigestInput = {
  incidents: DigestIncident[];
  quotes: DigestQuote[];
  /** 수신 해지 링크 — 모든 메일에 반드시 넣는다 */
  unsubscribeUrl: string;
  /** 지금 시각 (테스트용) */
  now?: number;
};

const REGION_LABEL: Record<string, { ko: string; en: string }> = {
  hormuz: { ko: "호르무즈", en: "Hormuz" },
  "red-sea": { ko: "홍해·아덴만", en: "Red Sea / Aden" },
  "black-sea": { ko: "흑해", en: "Black Sea" },
  "taiwan-strait": { ko: "대만해협", en: "Taiwan Strait" },
  malacca: { ko: "말라카", en: "Malacca" },
};

export function isValidEmail(raw: string): boolean {
  const s = raw.trim();
  if (s.length < 6 || s.length > 254) return false;
  return /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[A-Za-z]{2,}$/.test(s);
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtRate(q: Pick<DigestQuote, "ratePct" | "rateHighPct">): string {
  return q.rateHighPct !== null ? `${q.ratePct}–${q.rateHighPct}%` : `${q.ratePct}%`;
}

function timeLine(i: DigestIncident, lang: DigestLang): string {
  const parts: string[] = [];
  const occ = parseTime(i.occurredAt);
  const pub = parseTime(i.publishedAt);
  const seen = parseTime(i.firstSeenAt);
  if (occ != null) parts.push(`${lang === "ko" ? "발생" : "Occurred"} ${formatUtcFull(occ, lang)}`);
  if (pub != null) parts.push(`${i.source} ${lang === "ko" ? "발표" : "published"} ${formatUtcFull(pub, lang)}`);
  if (seen != null) parts.push(`${lang === "ko" ? "확인" : "Confirmed"} ${formatUtcFull(seen, lang)}`);
  return parts.join(" · ");
}

/** 보낼 내용이 있으면 메일을, 없으면 null (빈 메일은 보내지 않는다). */
export function buildDigest(
  input: DigestInput,
  lang: DigestLang,
): { subject: string; text: string; html: string } | null {
  const { incidents, quotes } = input;
  const shownIncidents = incidents.slice(0, 15);
  const shownQuotes = quotes.slice(0, 6);
  if (shownIncidents.length === 0 && shownQuotes.length === 0) return null;
  const ko = lang === "ko";
  const now = input.now ?? Date.now();
  const dateStr = formatUtcFull(now, lang).slice(0, 10);

  const subject = ko
    ? `[Strait Desk] 선박 피격 ${shownIncidents.length}건 · 전쟁위험 보험료 ${shownQuotes.length}곳 — ${dateStr}`
    : `[Strait Desk] ${shownIncidents.length} ship incident(s) · ${shownQuotes.length} war-risk figure(s) — ${dateStr}`;

  const textParts: string[] = [];
  const htmlParts: string[] = [];

  if (shownIncidents.length > 0) {
    textParts.push(ko ? "■ 새 선박 피격·보안 사건" : "■ New ship incidents");
    htmlParts.push(`<h2 style="font-size:16px;margin:18px 0 6px">${ko ? "새 선박 피격·보안 사건" : "New ship incidents"}</h2>`);
    for (const i of shownIncidents) {
      const times = timeLine(i, lang);
      textParts.push(`- ${i.title}${i.place ? ` (${i.place})` : ""}\n  ${times}`);
      htmlParts.push(
        `<p style="margin:8px 0"><strong>${escapeHtml(i.title)}</strong>${i.place ? ` <span style="color:#555">(${escapeHtml(i.place)})</span>` : ""}<br><span style="color:#666;font-size:13px">${escapeHtml(times)}</span></p>`,
      );
    }
  }

  if (shownQuotes.length > 0) {
    textParts.push("", ko ? "■ 전쟁위험 보험료 (보도 기준, 선가 대비)" : "■ War-risk premium (as reported, % of hull value)");
    htmlParts.push(
      `<h2 style="font-size:16px;margin:18px 0 6px">${ko ? "전쟁위험 보험료 (보도 기준, 선가 대비)" : "War-risk premium (as reported, % of hull value)"}</h2>`,
    );
    for (const q of shownQuotes) {
      const label = REGION_LABEL[q.region]?.[lang] ?? q.region;
      const prev = q.ratePrevPct !== null ? `${q.ratePrevPct}% → ` : "";
      const when = parseTime(q.publishedAt);
      const meta = `${q.outlet ?? "news"}${when != null ? ` · ${formatUtcFull(when, lang)}` : ""}`;
      textParts.push(`- ${label}: ${prev}${fmtRate(q)}  (${meta})\n  ${q.url}`);
      htmlParts.push(
        `<p style="margin:8px 0"><strong>${escapeHtml(label)}</strong>: ${escapeHtml(prev + fmtRate(q))}<br><a href="${escapeHtml(q.url)}" style="color:#555;font-size:13px">${escapeHtml(meta)}</a></p>`,
      );
    }
    const disclaimer = ko
      ? "시세가 아니라 기사에 실린 수치입니다. 실제 견적은 선박·선주·국적·브로커마다 다릅니다."
      : "Figures quoted in news reports, not a live market price. Actual quotes vary by vessel, owner, flag and broker.";
    textParts.push(disclaimer);
    htmlParts.push(`<p style="color:#888;font-size:12px">${escapeHtml(disclaimer)}</p>`);
  }

  const footer = ko
    ? "이 메일은 구독 신청에 동의하신 분께만 발송됩니다. 정보는 참고용이며 항해 결정의 근거가 될 수 없습니다."
    : "You receive this because you subscribed. Information is for reference only and is not a basis for navigation decisions.";
  const unsub = ko ? "수신 해지" : "Unsubscribe";
  textParts.push("", footer, `${unsub}: ${input.unsubscribeUrl}`);
  htmlParts.push(
    `<hr style="border:none;border-top:1px solid #ddd;margin:20px 0"><p style="color:#888;font-size:12px">${escapeHtml(footer)}<br><a href="${escapeHtml(input.unsubscribeUrl)}">${unsub}</a></p>`,
  );

  return {
    subject,
    text: textParts.join("\n"),
    html: `<div style="font-family:-apple-system,Segoe UI,Pretendard,sans-serif;max-width:560px;margin:auto;color:#111">${htmlParts.join("")}</div>`,
  };
}

export function isDigestRegion(region: string): boolean {
  return region in REGION_LABEL;
}

/** 64자 hex. 확인·해지 링크의 비밀 토큰. */
export function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** 하루 창: 끝 시각 기준 직전 24시간. dateKey는 한국시간 달력 날짜 (크론이 하루 한 번만 돌게 하는 키). */
export function digestWindow(now: number): { startMs: number; endMs: number; dateKey: string } {
  const pad = (n: number) => String(n).padStart(2, "0");
  const kst = new Date(now + 9 * 3_600_000);
  return {
    startMs: now - 24 * 3_600_000,
    endMs: now,
    dateKey: `${kst.getUTCFullYear()}-${pad(kst.getUTCMonth() + 1)}-${pad(kst.getUTCDate())}`,
  };
}

/** 확인·해지 링크. publicBase는 사이트 또는 워커 주소 (끝 슬래시 무관). */
export function emailActionUrl(
  publicBase: string,
  action: "confirm" | "unsubscribe",
  token: string,
): string {
  const url = new URL(`/email/${action}`, publicBase);
  url.searchParams.set("token", token);
  return url.toString();
}

/** 더블 옵트인 확인 메일. 이 링크를 누르기 전에는 다이제스트를 보내지 않는다. */
export function buildConfirmMail(
  input: { confirmUrl: string },
  lang: DigestLang,
): { subject: string; text: string; html: string } {
  const ko = lang === "ko";
  const subject = ko
    ? "[Strait Desk] 이메일 수신을 확인해 주세요"
    : "[Strait Desk] Confirm your email";
  const lead = ko
    ? "선박 피격 사건과 보도 기준 전쟁위험 보험료를 하루 한 번 보내 드립니다. 아래 링크를 누르면 구독이 시작됩니다. 링크를 누르기 전에는 메일이 가지 않습니다."
    : "We send new ship incidents and reported war-risk figures once a day. Open the link below to start. Nothing is sent until you confirm.";
  const ignore = ko
    ? "신청하지 않으셨다면 이 메일을 무시하세요."
    : "If you did not ask for this, ignore this message.";
  const linkLabel = ko ? "구독 확인" : "Confirm subscription";
  return {
    subject,
    text: `${lead}\n\n${linkLabel}: ${input.confirmUrl}\n\n${ignore}`,
    html: `<div style="font-family:-apple-system,Segoe UI,Pretendard,sans-serif;max-width:560px;margin:auto;color:#111"><p>${escapeHtml(lead)}</p><p><a href="${escapeHtml(input.confirmUrl)}">${linkLabel}</a></p><p style="color:#888;font-size:12px">${escapeHtml(ignore)}</p></div>`,
  };
}
