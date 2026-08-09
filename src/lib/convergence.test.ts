import { describe, expect, it } from "vitest";
import { evaluateTheater } from "../../workers/cron-ingest/src/convergence";

type Row = {
  signal_date: string;
  theater_id: string;
  mentions: number;
  points: number;
  fire_count: number;
  telegram_count: number;
  air_raid_score: number;
};

const THEATER = "hormuz";

function baseline(n: number, over: Partial<Row> = {}): Row[] {
  return Array.from({ length: n }, (_, i) => ({
    signal_date: `2026-0${1 + Math.floor(i / 28)}-${String((i % 28) + 1).padStart(2, "0")}`,
    theater_id: THEATER,
    mentions: 10,
    points: 5,
    fire_count: 30,
    telegram_count: 6,
    air_raid_score: 0,
    ...over,
  }));
}

function target(over: Partial<Row>): Row {
  return {
    signal_date: "2026-08-01",
    theater_id: THEATER,
    mentions: 10,
    points: 5,
    fire_count: 30,
    telegram_count: 6,
    air_raid_score: 0,
    ...over,
  };
}

describe("convergence detector", () => {
  it("평시에는 발화하지 않는다", () => {
    const ev = evaluateTheater("2026-08-01", THEATER, target({}), baseline(60));
    expect(ev).toBeNull();
  });

  it("채널 2개만 튀면 발화하지 않는다 (최소 3개)", () => {
    const ev = evaluateTheater(
      "2026-08-01",
      THEATER,
      target({ mentions: 200, telegram_count: 90 }),
      baseline(60),
    );
    expect(ev).toBeNull();
  });

  it("독립 채널 3개가 동시에 튀면 발화한다", () => {
    const ev = evaluateTheater(
      "2026-08-01",
      THEATER,
      target({ mentions: 200, telegram_count: 90, air_raid_score: 14 }),
      baseline(60),
    );
    expect(ev).not.toBeNull();
    expect(ev!.channelCount).toBeGreaterThanOrEqual(3);
    expect(ev!.firedChannels).toEqual(
      expect.arrayContaining(["gdelt", "telegram", "airraid"]),
    );
  });

  it("FIRMS 단독 급증은 발화하지 않는다 — 가스 플레어 오탐 방어", () => {
    // 페르시아만 플레어 시나리오: 위성 화재만 폭증, 나머지는 평시
    const ev = evaluateTheater(
      "2026-08-01",
      THEATER,
      target({ fire_count: 900 }),
      baseline(60),
    );
    expect(ev).toBeNull();
  });

  it("FIRMS 는 다른 채널이 함께 켜질 때만 채널로 계수된다", () => {
    const ev = evaluateTheater(
      "2026-08-01",
      THEATER,
      target({ mentions: 200, telegram_count: 90, fire_count: 900 }),
      baseline(60),
    );
    expect(ev).not.toBeNull();
    expect(ev!.firedChannels).toContain("firms");
  });

  it("희소 채널의 0→3 같은 잡음은 절대값 하한으로 막는다", () => {
    // telegram 평시 0 → 오늘 3이면 z 는 매우 크지만 absFloor(4) 미만이라 발화 금지.
    // gdelt·airraid 2개만 남으므로 컨버전스 자체가 성립하지 않아야 한다.
    const rows = baseline(60, { telegram_count: 0 });
    const noisy = evaluateTheater(
      "2026-08-01",
      THEATER,
      target({ telegram_count: 3, mentions: 200, air_raid_score: 14 }),
      rows,
    );
    expect(noisy).toBeNull();

    // 대조군: 같은 조건에서 telegram 이 하한을 넘으면 발화한다
    // → 위 null 의 원인이 "하한"이지 다른 버그가 아님이 증명된다
    const real = evaluateTheater(
      "2026-08-01",
      THEATER,
      target({ telegram_count: 40, mentions: 200, air_raid_score: 14 }),
      rows,
    );
    expect(real).not.toBeNull();
    expect(real!.firedChannels).toContain("telegram");
  });

  it("베이스라인 표본이 모자라면 발화하지 않는다 (초기 운영 보호)", () => {
    const ev = evaluateTheater(
      "2026-08-01",
      THEATER,
      target({ mentions: 500, telegram_count: 300, air_raid_score: 50 }),
      baseline(10),
    );
    expect(ev).toBeNull();
  });

  it("이상치 하나가 베이스라인을 오염시켜도 다음 발화를 막지 않는다 (median/MAD)", () => {
    const rows = baseline(60);
    rows[0].mentions = 5000; // 과거 대형 사건
    rows[1].telegram_count = 3000;
    const ev = evaluateTheater(
      "2026-08-01",
      THEATER,
      target({ mentions: 200, telegram_count: 90, air_raid_score: 14 }),
      rows,
    );
    expect(ev).not.toBeNull();
  });

  it("id 에 algo_version 이 포함된다 — 버전 섞인 적중률 방지", () => {
    const ev = evaluateTheater(
      "2026-08-01",
      THEATER,
      target({ mentions: 200, telegram_count: 90, air_raid_score: 14 }),
      baseline(60),
    );
    expect(ev!.id).toBe(`2026-08-01:${THEATER}:${ev!.algoVersion}`);
  });

  it("발화하지 않은 경우에도 채널 평가 자체는 계산된다", () => {
    const ev = evaluateTheater(
      "2026-08-01",
      THEATER,
      target({ mentions: 200, telegram_count: 90, air_raid_score: 14 }),
      baseline(60),
    );
    expect(ev!.channels.length).toBe(4);
    expect(ev!.channels.every((c) => Number.isFinite(c.z))).toBe(true);
  });
});
