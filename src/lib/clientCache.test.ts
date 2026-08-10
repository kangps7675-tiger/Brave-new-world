import { describe, expect, it } from "vitest";
import { ageLabel, readClientCache, writeClientCache } from "@/lib/clientCache";

describe("clientCache ageLabel", () => {
  it("formats minutes and hours", () => {
    const now = Date.now();
    expect(ageLabel(now - 30_000, "ko")).toBe("방금");
    expect(ageLabel(now - 5 * 60_000, "ko")).toBe("5분 전");
    expect(ageLabel(now - 2 * 60 * 60_000, "en")).toBe("2h ago");
  });
});

describe("clientCache memory round-trip", () => {
  it("round-trips via in-memory after write", async () => {
    const key = `t-${Date.now()}-${Math.random()}`;
    await writeClientCache(key, { ok: true }, 1_700_000_000_000);
    const hit = await readClientCache<{ ok: boolean }>(key);
    expect(hit?.data.ok).toBe(true);
    expect(hit?.fetchedAt).toBe(1_700_000_000_000);
  });
});
