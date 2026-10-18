import { describe, expect, it } from "vitest";
import { formatLag, formatUtcFull, parseTime, provenanceLines } from "./provenance";

const T = Date.parse("2026-10-18T12:10:00Z");

describe("출처 시각", () => {
  it("년·월·일·시각을 UTC로, 한글은 한국시간을 덧붙인다", () => {
    expect(formatUtcFull(T, "en")).toBe("2026-10-18 12:10 UTC");
    expect(formatUtcFull(T, "ko")).toBe("2026-10-18 12:10 UTC (21:10 KST)");
  });

  it("한국시간 날짜가 넘어가면 월-일을 붙인다", () => {
    const late = Date.parse("2026-10-18T20:30:00Z");
    expect(formatUtcFull(late, "ko")).toBe("2026-10-18 20:30 UTC (10-19 05:30 KST)");
  });

  it("연도가 바뀌는 시각도 그대로 표기한다", () => {
    expect(formatUtcFull(Date.parse("2025-12-31T23:59:00Z"), "en")).toBe("2025-12-31 23:59 UTC");
  });

  it("지연 시간 표기", () => {
    expect(formatLag(30_000, "ko")).toBe("1분 미만");
    expect(formatLag(12 * 60_000, "ko")).toBe("12분");
    expect(formatLag(185 * 60_000, "ko")).toBe("3시간 5분");
    expect(formatLag(52 * 3_600_000, "en")).toBe("2 d 4 h");
  });

  it("발생·발표·확인 세 줄 — 발표 뒤 확인까지의 지연을 붙인다", () => {
    const lines = provenanceLines(
      { occurredAt: T - 3 * 3_600_000, publishedAt: T, firstSeenAt: T + 4 * 60_000 },
      "UKMTO",
      "ko",
    );
    expect(lines.map((l) => l.label)).toEqual(["사건 발생", "UKMTO 발표", "우리가 확인"]);
    expect(lines[0]!.value).toContain("2026-10-18 09:10 UTC");
    expect(lines[2]!.value).toContain("발표 후 4분");
  });

  it("최초 확인을 모르면 마지막 확인으로 표기한다", () => {
    const lines = provenanceLines({ publishedAt: T, lastSeenAt: T + 600_000 }, "UKMTO", "ko");
    expect(lines.at(-1)!.label).toBe("마지막 확인");
  });

  it("값이 없는 항목은 건너뛴다", () => {
    expect(provenanceLines({}, "UKMTO", "ko")).toEqual([]);
    expect(parseTime("not a date")).toBeUndefined();
    expect(parseTime(null)).toBeUndefined();
  });
});
