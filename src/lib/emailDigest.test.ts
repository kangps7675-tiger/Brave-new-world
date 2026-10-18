import { describe, expect, it } from "vitest";
import {
  EMAIL_DIGEST_CRON,
  buildConfirmMail,
  buildDigest,
  digestWindow,
  emailActionUrl,
  escapeHtml,
  isValidEmail,
  normalizeEmail,
  randomToken,
} from "./emailDigest";
import { pickDigestIncidents, pickDigestQuotes } from "./emailDigestPick";

const NOW = Date.parse("2026-10-19T00:00:00Z");

describe("이메일 다이제스트", () => {
  it("이메일 형식을 검사하고 소문자로 정리한다", () => {
    expect(isValidEmail("kim@example.com")).toBe(true);
    expect(isValidEmail("a@b")).toBe(false);
    expect(isValidEmail("a b@example.com")).toBe(false);
    expect(isValidEmail("<x>@example.com")).toBe(false);
    expect(normalizeEmail("  Kim@Example.COM ")).toBe("kim@example.com");
  });

  it("보낼 내용이 없으면 메일을 만들지 않는다", () => {
    expect(buildDigest({ incidents: [], quotes: [], unsubscribeUrl: "https://x/u", now: NOW }, "ko")).toBeNull();
  });

  it("사건과 보험료를 연·월·일·시각과 수신 해지 링크와 함께 담는다", () => {
    const d = buildDigest(
      {
        incidents: [
          {
            source: "UKMTO",
            title: "공격 · 유조선",
            place: "아덴만",
            occurredAt: "2026-10-18T09:10:00Z",
            publishedAt: "2026-10-18T12:10:00Z",
            firstSeenAt: "2026-10-18T12:14:00Z",
          },
        ],
        quotes: [
          {
            region: "red-sea",
            ratePct: 0.7,
            rateHighPct: null,
            ratePrevPct: 0.5,
            direction: "up",
            outlet: "gCaptain",
            headline: "h",
            url: "https://example.com/a",
            publishedAt: "2026-10-17T00:00:00Z",
          },
        ],
        unsubscribeUrl: "https://w.example/email/unsubscribe?token=abc",
        now: NOW,
      },
      "ko",
    )!;
    expect(d.subject).toContain("선박 피격 1건");
    expect(d.text).toContain("발생 2026-10-18 09:10 UTC");
    expect(d.text).toContain("UKMTO 발표 2026-10-18 12:10 UTC");
    expect(d.text).toContain("확인 2026-10-18 12:14 UTC");
    expect(d.text).toContain("홍해·아덴만: 0.5% → 0.7%");
    expect(d.text).toContain("시세가 아니라 기사에 실린 수치");
    expect(d.text).toContain("token=abc");
    expect(d.html).toContain("수신 해지");
  });

  it("HTML에는 사용자 문자열을 이스케이프해서 넣는다", () => {
    expect(escapeHtml(`<script>"&`)).toBe("&lt;script&gt;&quot;&amp;");
    const d = buildDigest(
      {
        incidents: [{ source: "NGA", title: "<b>x</b>", place: "", occurredAt: null }],
        quotes: [],
        unsubscribeUrl: "https://w/u",
        now: NOW,
      },
      "en",
    )!;
    expect(d.html).not.toContain("<b>x</b>");
    expect(d.html).toContain("&lt;b&gt;x&lt;/b&gt;");
  });

  it("확인 메일에는 확인 링크만 있고, 누르기 전에는 발송되지 않는다고 적는다", () => {
    const d = buildConfirmMail({ confirmUrl: `https://w.example/email/confirm?token=abc` }, "ko");
    expect(d.subject).toContain("확인해 주세요");
    expect(d.text).toContain("token=abc");
    expect(d.text).toContain("링크를 누르기 전에는 메일이 가지 않습니다");
    expect(d.html).toContain("구독 확인");
    expect(d.text).not.toContain("시세가 아니라");
  });

  it("하루 창은 직전 24시간이고 날짜 키는 한국시간이다", () => {
    expect(EMAIL_DIGEST_CRON).toBe("0 1 * * *");
    const morning = digestWindow(Date.parse("2026-10-18T01:00:00Z"));
    expect(morning.dateKey).toBe("2026-10-18");
    expect(morning.endMs - morning.startMs).toBe(24 * 3_600_000);
    expect(digestWindow(Date.parse("2026-10-18T16:00:00Z")).dateKey).toBe("2026-10-19");
  });

  it("확인 링크를 공개 주소 아래에 만든다", () => {
    expect(emailActionUrl("https://w.example", "unsubscribe", "abc")).toBe(
      "https://w.example/email/unsubscribe?token=abc",
    );
    expect(randomToken()).toMatch(/^[a-f0-9]{64}$/);
  });
});

const WIN = { startMs: Date.parse("2026-10-17T01:00:00Z"), endMs: Date.parse("2026-10-18T01:00:00Z") };

describe("다이제스트에 넣을 사건", () => {
  const ukmto = {
    id: "u1",
    incidentTypeName: "Attack",
    place: "Gulf of Aden",
    region: null,
    vesselName: "TKR",
    vesselType: "Tanker",
    utcDateOfIncident: "2026-10-17T09:00:00Z",
    utcDateCreated: "2026-10-17T12:00:00Z",
    firstSeenAt: "2026-10-17T12:05:00Z",
    lat: 12.5,
    lng: 48,
  };

  it("피습만 넣고 주의보·자리표시 선박명은 뺀다", () => {
    const items = pickDigestIncidents(
      [ukmto, { ...ukmto, id: "u2", incidentTypeName: "Advisory", firstSeenAt: "2026-10-17T13:00:00Z" }],
      [],
      WIN,
      "ko",
    );
    expect(items).toHaveLength(1);
    expect(items[0]!.title).toBe("공격 · 유조선");
    expect(items[0]!.place).toBe("아덴만");
    expect(items[0]!.title).not.toContain("TKR");
  });

  it("NGA 피습 선박명을 동사 앞에서 자르고, 가까운 UKMTO가 있으면 뺀다", () => {
    const nga = {
      id: "HYDROPAC-26-3002#1",
      description:
        "GULF OF OMAN. OMAN. M/V PETRO DOLPHIN SUFFERED SECURITY INCIDENT, ADRIFT IN 24-30.36N 057-27.11E ON 12 OCT.",
      warningDate: "2026-10-17T08:00:00Z",
      lat: 24.5,
      lng: 57.45,
    };
    const alone = pickDigestIncidents([], [nga, { ...nga, id: "HYDROPAC-26-3002#2" }], WIN, "ko");
    expect(alone).toHaveLength(1);
    expect(alone[0]!.title).toBe("보안 사건 · PETRO DOLPHIN");
    expect(alone[0]!.title).not.toContain("SUFFERED");

    const near = pickDigestIncidents(
      [{ ...ukmto, lat: 24.5, lng: 57.5, utcDateOfIncident: "2026-10-17T08:30:00Z" }],
      [nga],
      WIN,
      "en",
    );
    expect(near.map((i) => i.source)).toEqual(["UKMTO"]);

    const far = pickDigestIncidents([ukmto], [nga], WIN, "en");
    expect(far.map((i) => i.source).sort()).toEqual(["NGA", "UKMTO"]);
  });

  it("표류만 있는 경보와 창 밖의 건은 넣지 않는다", () => {
    const items = pickDigestIncidents(
      [{ ...ukmto, firstSeenAt: "2026-10-16T00:00:00Z" }],
      [
        {
          id: "n-adrift",
          description: "RED SEA. YEMEN. M/V SOME SHIP ADRIFT AFTER ENGINE FAILURE.",
          warningDate: "2026-10-17T08:00:00Z",
          lat: 14,
          lng: 42,
        },
      ],
      WIN,
      "ko",
    );
    expect(items).toHaveLength(0);
  });

  it("창 안에 새로 저장된 보험료만 해역별 최신 한 건으로 고른다", () => {
    const quotes = pickDigestQuotes(
      [
        {
          region: "hormuz",
          ratePct: 0.4,
          rateHighPct: null,
          ratePrevPct: null,
          direction: "flat",
          outlet: "old",
          headline: "a",
          url: "https://example.com/a",
          publishedAt: "2026-10-17T02:00:00Z",
          ingestedAt: "2026-10-17T03:00:00Z",
        },
        {
          region: "hormuz",
          ratePct: 0.7,
          rateHighPct: 1,
          ratePrevPct: 0.4,
          direction: "up",
          outlet: "new",
          headline: "b",
          url: "https://example.com/b",
          publishedAt: "2026-10-17T10:00:00Z",
          ingestedAt: "2026-10-17T11:00:00Z",
        },
        {
          region: "red-sea",
          ratePct: 0.2,
          rateHighPct: null,
          ratePrevPct: null,
          direction: null,
          outlet: "stale",
          headline: "c",
          url: "https://example.com/c",
          publishedAt: "2026-10-01T00:00:00Z",
          ingestedAt: "2026-10-01T00:00:00Z",
        },
      ],
      WIN,
    );
    expect(quotes).toHaveLength(1);
    expect(quotes[0]!.region).toBe("hormuz");
    expect(quotes[0]!.ratePct).toBe(0.7);
  });
});
