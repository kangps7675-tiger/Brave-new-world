import { describe, expect, it } from "vitest";
import {
  classifyThumbCategory,
  categoryThumbUrl,
  nasaGibsSnapshotUrl,
  resolveHubThumbSync,
  hubThumbFallbacks,
} from "./hubThumbResolver";

describe("hubThumbResolver", () => {
  it("핵·미사일 카테고리를 분류한다", () => {
    expect(classifyThumbCategory("Yongbyon reactor expansion")).toBe("nuclear");
    expect(classifyThumbCategory("ICBM launch from Sohae")).toBe("missile");
    expect(classifyThumbCategory("PLA destroyer transit")).toBe("ship");
  });

  it("좌표 있으면 NASA GIBS URL", () => {
    const r = resolveHubThumbSync({
      title: "Yongbyon update",
      lat: 39.8,
      lng: 125.75,
    });
    expect(r.kind).toBe("nasa-gibs");
    expect(r.imageUrl).toContain("wvs.earthdata.nasa.gov");
    expect(r.thumbCredit).toMatch(/NASA/);
  });

  it("좌표 없으면 카테고리 SVG", () => {
    const r = resolveHubThumbSync({ title: "Sanctions package announced" });
    expect(r.kind).toBe("category");
    expect(r.imageUrl).toBe(categoryThumbUrl("sanction"));
  });

  it("nasaGibsSnapshotUrl 이 bbox를 포함한다", () => {
    expect(nasaGibsSnapshotUrl(10, 110)).toContain("BBOX=");
  });

  it("폴백 체인에 category가 마지막", () => {
    const urls = hubThumbFallbacks({
      title: "Front line",
      placeId: "yongbyon",
      lat: 39.8,
      lng: 125.75,
    });
    expect(urls[urls.length - 1]).toMatch(/categories\//);
  });
});
