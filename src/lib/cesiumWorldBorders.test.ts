import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("country-borders compact schema", () => {
  it("lite profile has path segments with lng/lat pairs", () => {
    const raw = JSON.parse(
      readFileSync(
        join(process.cwd(), "public/data/lite/country-borders.json"),
        "utf8",
      ),
    ) as Array<{ i?: string; p?: number[][] }>;
    expect(Array.isArray(raw)).toBe(true);
    expect(raw.length).toBeGreaterThan(50);
    const sample = raw[0];
    expect(sample?.p?.[0]?.length).toBeGreaterThanOrEqual(2);
    expect(Number.isFinite(sample?.p?.[0]?.[0])).toBe(true);
    expect(Number.isFinite(sample?.p?.[0]?.[1])).toBe(true);
  });
});
