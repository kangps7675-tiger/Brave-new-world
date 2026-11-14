import { describe, expect, it } from "vitest";
import type { StackItem } from "@/lib/incidentStack/build";
import { relatedReports } from "@/lib/crossCheck/relatedReports";

function item(over: Partial<StackItem>): StackItem {
  return {
    id: "1",
    source: "ukmto",
    at: 0,
    title: "공격",
    place: "호르무즈",
    lat: 26,
    lng: 56,
    sea: "hormuz",
    ...over,
  };
}

describe("relatedReports", () => {
  it("호르무즈 미사일은 연합해사정보센터만 연다", () => {
    const ids = relatedReports(item({ detail: "Missile attack on a tanker" })).map((r) => r.id);
    expect(ids).toContain("jmic");
    expect(ids).not.toContain("imb");
    expect(ids).not.toContain("recaap");
  });

  it("아시아 해적은 국제해사국과 레카프를 연다", () => {
    const ids = relatedReports(
      item({
        source: "liveua",
        title: "Armed robbery, pirates boarded",
        place: "Singapore Strait",
        lat: 1.2,
        lng: 103.8,
        sea: null,
      }),
    ).map((r) => r.id);
    expect(ids).toContain("imb");
    expect(ids).toContain("recaap");
    expect(ids).not.toContain("jmic");
  });

  it("본문에 있는 그 사건 PDF는 원문이다", () => {
    const hit = relatedReports(
      item({
        detail: "See https://www.ukmto.org/-/media/ukmto/partner-products/indian-ocean/2024/jmic-infonote/jmic-infonote-26apr_04.pdf",
      }),
    ).find((r) => r.id === "matched-pdf");
    expect(hit?.matched).toBe(true);
    expect(hit?.kind).toBe("pdf");
  });
});
