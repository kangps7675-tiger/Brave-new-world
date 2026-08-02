import { describe, expect, it } from "vitest";
import { newsTheaterFromCoords } from "@/lib/news/theaterMap";

describe("newsTheaterFromCoords — middle-east includes Egypt", () => {
  it("maps Cairo and Alexandria to middle-east", () => {
    expect(newsTheaterFromCoords(30.04, 31.24)).toBe("middle-east");
    expect(newsTheaterFromCoords(31.2, 29.9)).toBe("middle-east");
  });

  it("maps Suez / Sinai to middle-east", () => {
    expect(newsTheaterFromCoords(29.97, 32.55)).toBe("middle-east");
    expect(newsTheaterFromCoords(28.5, 34.0)).toBe("middle-east");
  });

  it("still maps Levant and Gulf to middle-east", () => {
    expect(newsTheaterFromCoords(32.0, 35.0)).toBe("middle-east");
    expect(newsTheaterFromCoords(29.0, 48.0)).toBe("middle-east");
  });
});
