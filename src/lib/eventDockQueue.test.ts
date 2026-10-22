import { describe, expect, it } from "vitest";
import { pickDockEntries } from "@/lib/eventDockQueue";

const H = 3_600_000;
describe("pickDockEntries", () => {
  const now = 100 * H;
  it("닫은 건·3시간 넘은 건 뺀다", () => {
    const r = pickDockEntries(
      [
        { id: "a", at: now - H },
        { id: "b", at: now - 4 * H },
        { id: "c", at: now - 2 * H },
      ],
      new Set(["c"]),
      now,
    );
    expect(r.map((x) => x.id)).toEqual(["a"]);
  });
  it("최신순으로 최대 2건", () => {
    const r = pickDockEntries(
      [
        { id: "a", at: now - 3 * 60_000 },
        { id: "b", at: now - 1 * 60_000 },
        { id: "c", at: now - 2 * 60_000 },
      ],
      new Set(),
      now,
    );
    expect(r.map((x) => x.id)).toEqual(["b", "c"]);
  });
});
