/**
 * 확전 신호 피드 테스트 — 노출량 조절이 핵심.
 *
 * 확전 신호가 하루 20번 뜨면 사용자는 배경음으로 처리하고,
 * 정말 중요한 신호도 같이 묻힌다(alert fatigue).
 * **조용한 게 기본값**이어야 한다.
 *
 * 동시에 — 우리가 가린 것을 "아무 일 없음"으로 오독하게 하면 안 된다.
 * 그래서 억제된 신호도 목록에는 남긴다.
 */
import { describe, expect, it } from "vitest";
import {
  buildEscalationFeed,
  eventFingerprint,
  flashCandidate,
  summarizeFeed,
  suppressedCount,
  visibleSignals,
  type EscalationFeedInput,
} from "@/lib/escalationFeed";
import { scoreEscalation } from "@/lib/escalationSignals";

const ROMANIA: EscalationFeedInput = {
  id: "ro-1",
  title: "Russian drone violated Romanian airspace, Bucharest says jets scrambled",
  summary: "Romania said a Russian drone entered its airspace.",
  theater: "russia-ukraine",
};

const POLAND: EscalationFeedInput = {
  id: "pl-1",
  title: "Poland issues air raid alert and closes airspace near Ukrainian border",
  summary: "Polish authorities issued an air raid alert.",
  theater: "russia-ukraine",
};

const CASPIAN: EscalationFeedInput = {
  id: "casp-1",
  title: "Ukraine says it shot down an Iranian-made drone over the Caspian Sea",
  summary: "Iran denied involvement.",
  theater: "russia-ukraine",
};

const QUIET: EscalationFeedInput = {
  id: "quiet-1",
  title: "Heavy Russian shelling continues in Donetsk region",
  summary: "Ukrainian forces reported artillery strikes along the front line.",
  theater: "russia-ukraine",
};

describe("buildEscalationFeed — 기본 동작", () => {
  it("신호가 없으면 빈 배열 (조용한 게 기본값)", () => {
    expect(buildEscalationFeed([QUIET])).toEqual([]);
    expect(buildEscalationFeed([])).toEqual([]);
  });

  it("신호가 있는 기사만 남긴다", () => {
    const feed = buildEscalationFeed([QUIET, ROMANIA]);
    expect(feed).toHaveLength(1);
    expect(feed[0]!.id).toBe("ro-1");
  });

  it("점수 높은 순으로 정렬한다", () => {
    const feed = buildEscalationFeed([CASPIAN, ROMANIA]);
    expect(feed.length).toBeGreaterThan(1);
    for (let i = 1; i < feed.length; i += 1) {
      expect(feed[i - 1]!.signal.score).toBeGreaterThanOrEqual(feed[i]!.signal.score);
    }
  });

  it("오래된 기사는 신호로 띄우지 않는다", () => {
    const old = {
      ...ROMANIA,
      pubDate: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
    };
    expect(buildEscalationFeed([old])).toEqual([]);
    // 창을 넓히면 다시 잡힌다
    expect(buildEscalationFeed([old], { maxAgeMinutes: 720 })).toHaveLength(1);
  });
});

describe("중복 사건 접기", () => {
  it("같은 사건의 여러 매체 보도를 하나로 접는다", () => {
    // 5개 매체가 같은 루마니아 사건을 보도
    const items: EscalationFeedInput[] = Array.from({ length: 5 }, (_, i) => ({
      ...ROMANIA,
      id: `ro-${i}`,
    }));
    const feed = buildEscalationFeed(items);
    expect(feed).toHaveLength(1);
    expect(feed[0]!.duplicates).toBe(4);
  });

  it("다른 사건은 접지 않는다", () => {
    const feed = buildEscalationFeed([ROMANIA, CASPIAN]);
    expect(feed.length).toBe(2);
  });

  it("지문은 패턴·임계선·경계국·전장으로 만든다", () => {
    const a = scoreEscalation({ title: ROMANIA.title, summary: ROMANIA.summary, theater: "russia-ukraine" })!;
    const b = scoreEscalation({
      // 표현은 다르지만 같은 사건
      title: "Romania reports Russian drone incursion into its airspace; jets scrambled",
      theater: "russia-ukraine",
    })!;
    expect(eventFingerprint(a)).toBe(eventFingerprint(b));
  });

  it("제목이 비슷해도 임계선이 다르면 다른 사건", () => {
    const a = scoreEscalation({ title: ROMANIA.title, theater: "russia-ukraine" })!;
    const c = scoreEscalation({ title: CASPIAN.title, theater: "russia-ukraine" })!;
    expect(eventFingerprint(a)).not.toBe(eventFingerprint(c));
  });
});

describe("노출 상한 — alert fatigue 방지", () => {
  const many: EscalationFeedInput[] = [
    ROMANIA,
    POLAND,
    CASPIAN,
    {
      id: "jp-1",
      title: "Japan scrambled jets after Chinese drone entered airspace near Okinawa",
      summary: "Tokyo said the aircraft violated Japanese airspace.",
      theater: "china-taiwan",
    },
    {
      id: "znpp-1",
      title: "Shelling struck the Zaporizhzhia nuclear power plant site, IAEA says",
      summary: "Debris fell near a reactor building.",
      theater: "russia-ukraine",
    },
  ];

  it("기본 상한은 3개", () => {
    const feed = buildEscalationFeed(many);
    expect(visibleSignals(feed)).toHaveLength(3);
  });

  it("상한을 넘은 것도 목록에는 남긴다 (가린 것 ≠ 없는 것)", () => {
    const feed = buildEscalationFeed(many);
    expect(feed.length).toBeGreaterThan(3);
    expect(suppressedCount(feed)).toBeGreaterThan(0);
  });

  it("상한은 조절 가능하다", () => {
    expect(visibleSignals(buildEscalationFeed(many, { maxVisible: 1 }))).toHaveLength(1);
    expect(visibleSignals(buildEscalationFeed(many, { maxVisible: 5 })).length).toBeGreaterThan(3);
  });

  it("잘릴 때는 약한 신호가 먼저 잘린다", () => {
    const feed = buildEscalationFeed(many, { maxVisible: 1 });
    const visible = visibleSignals(feed);
    const maxScore = Math.max(...feed.map((f) => f.signal.score));
    expect(visible[0]!.signal.score).toBe(maxScore);
  });

  it("이미 본 신호는 자리를 차지하지 않는다", () => {
    const feed = buildEscalationFeed(many, {
      maxVisible: 2,
      seenIds: new Set(["ro-1"]),
    });
    const visible = visibleSignals(feed);
    expect(visible.map((v) => v.id)).not.toContain("ro-1");
    expect(visible).toHaveLength(2);
  });
});

describe("타전 후보", () => {
  it("임계 이상인 강한 신호만 타전 후보", () => {
    const feed = buildEscalationFeed([ROMANIA], {
      hotTheaters: ["russia-ukraine", "middle-east"],
    });
    const flash = flashCandidate(feed);
    expect(flash).not.toBeNull();
  });

  it("약한 신호만 있으면 타전하지 않는다", () => {
    const weak = buildEscalationFeed([
      { id: "w", title: "Iran seized a tanker in the Gulf", theater: "middle-east" },
    ]);
    // 신호가 잡혀도 타전 임계에는 못 미친다
    expect(flashCandidate(weak)).toBeNull();
  });

  it("억제된 신호는 타전 후보가 아니다", () => {
    const feed = buildEscalationFeed([ROMANIA], { seenIds: new Set(["ro-1"]) });
    expect(flashCandidate(feed)).toBeNull();
  });
});

describe("요약", () => {
  it("신호가 없으면 null — HUD 를 억지로 채우지 않는다", () => {
    expect(summarizeFeed([])).toBeNull();
    expect(summarizeFeed(buildEscalationFeed([QUIET]))).toBeNull();
  });

  it("하나면 헤드라인 그대로", () => {
    const feed = buildEscalationFeed([ROMANIA]);
    expect(summarizeFeed(feed, "ko")).toMatch(/\(보도\)$/);
  });

  it("여럿이면 '외 N건'", () => {
    const feed = buildEscalationFeed([ROMANIA, CASPIAN]);
    const s = summarizeFeed(feed, "ko");
    expect(s).toMatch(/외 \d+건$/);
  });
});
