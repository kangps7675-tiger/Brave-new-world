import { describe, expect, it } from "vitest";
import { newsAboutVessel, usableVesselKey, type NewsRef } from "@/lib/news/vesselNews";

const n = (title: string, at: number, link = `https://ex.com/${at}`): NewsRef => ({ id: String(at), title, link, source: "X", at });
describe("vesselNews", () => {
  it("흔하거나 짧은 이름은 찾지 않는다", () => {
    expect(usableVesselKey("UNKNOWN")).toBeNull();
    expect(usableVesselKey("12345")).toBeNull();
    expect(usableVesselKey("ABC")).toBeNull();
    expect(usableVesselKey("MV Sounion")).toBe("sounion");
  });
  it("제목에 이름이 단어로 나온 기사만, 최신순", () => {
    const r = newsAboutVessel(["MV Sounion"], [
      n("Tanker Sounion on fire after Houthi attack", 2),
      n("Sounions of the world", 3),
      n("Unrelated oil news", 4),
      n("Sounion salvage begins", 5),
    ]);
    expect(r.map((x) => x.at)).toEqual([5, 2]);
  });
  it("이름이 없으면 빈 배열", () => {
    expect(newsAboutVessel([null], [n("x", 1)])).toEqual([]);
  });
});
