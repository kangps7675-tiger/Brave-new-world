import { describe, expect, it } from "vitest";
import { INCIDENT_MAX_POINT_KM, seaAtIncident, summarizeForecast, type WxRow } from "./summary";

const H = 3_600_000;
const row = (pointId: string, validTime: string, over: Partial<WxRow> = {}): WxRow => ({
  pointId,
  validTime,
  gridLat: 13,
  gridLng: 49,
  hsM: 1,
  periodS: 5,
  windMs: 5,
  windDirDeg: 90,
  swellM: 0.2,
  ...over,
});

describe("seaAtIncident", () => {
  const rows = [
    row("a", "2026-10-21T12:00:00.000Z", { hsM: 0.8 }),
    row("a", "2026-10-21T18:00:00.000Z", { hsM: 2.4, windMs: 12 }),
    row("b", "2026-10-21T18:00:00.000Z", { gridLat: 21.5, gridLng: 38.4, hsM: 9 }),
  ];

  it("가장 가까운 지점·가장 가까운 시각의 행을 고른다", () => {
    const r = seaAtIncident(rows, { lat: 13.1, lng: 49.1, atIso: "2026-10-21T17:00:00.000Z" })!;
    expect(r.pointId).toBe("a");
    expect(r.validTime).toBe("2026-10-21T18:00:00.000Z");
    expect(r.hsM).toBe(2.4);
    expect(r.windKn).toBe(23);
    expect(r.offsetMin).toBe(-60);
    expect(r.seaStateKo).toBe("보통 파도");
  });

  it("지점이 너무 멀면 null — 먼 바다 얘기를 하지 않는다", () => {
    expect(seaAtIncident(rows, { lat: 40, lng: 10, atIso: "2026-10-21T18:00:00.000Z" })).toBeNull();
    expect(INCIDENT_MAX_POINT_KM).toBeLessThanOrEqual(200);
  });

  it("관측 시각과 3.5시간 넘게 벌어지면 null", () => {
    expect(seaAtIncident(rows, { lat: 13, lng: 49, atIso: "2026-10-22T03:00:00.000Z" })).toBeNull();
  });

  it("행이 없거나 값이 전부 비면 null", () => {
    expect(seaAtIncident([], { lat: 13, lng: 49, atIso: "2026-10-21T18:00:00.000Z" })).toBeNull();
    const empty = [row("a", "2026-10-21T18:00:00.000Z", { hsM: null, windMs: null })];
    expect(seaAtIncident(empty, { lat: 13, lng: 49, atIso: "2026-10-21T18:00:00.000Z" })).toBeNull();
  });
});

describe("summarizeForecast", () => {
  const now = Date.parse("2026-10-22T00:00:00.000Z");
  const at = (h: number) => new Date(now + h * H).toISOString();
  const rows: WxRow[] = [];
  for (const h of [0, 6, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72]) {
    rows.push(row("a", at(h), { hsM: 1 + h / 24 }));
  }

  it("지금/+24/+48/+72 칸을 가장 가까운 예보로 채운다", () => {
    const s = summarizeForecast(rows, now);
    expect(s.points).toHaveLength(1);
    expect(s.points[0]!.cells.map((c) => c?.hsM)).toEqual([1, 2, 3, 4]);
  });

  it("앞으로 72시간 최대 파고를 찾는다", () => {
    const s = summarizeForecast(rows, now);
    expect(s.peak).toEqual({ pointId: "a", hsM: 4, validTime: at(72) });
  });

  it("해당 시각 근처 예보가 없으면 그 칸은 null (지어내지 않는다)", () => {
    const s = summarizeForecast(rows.filter((r) => Date.parse(r.validTime) <= now + 30 * H), now);
    expect(s.points[0]!.cells[2]).toBeNull();
    expect(s.points[0]!.cells[3]).toBeNull();
  });
});
