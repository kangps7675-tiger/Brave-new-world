import { describe, expect, it } from "vitest";
import {
  blockedLayerIds,
  formatReliabilityForHover,
  formatReliabilityForSources,
  getLayerReliability,
  isLayerShippable,
  layerBlockedReason,
  shippedLayerIds,
} from "@/lib/layerReliability";
import { NEWS_LAYER_SOURCE_CATALOG } from "@/data/sourceCatalog";
import { EVIDENCE_TIERS, isEvidenceTierShippable } from "@/lib/evidenceTier";

describe("layerReliability", () => {
  it("covers every shipped sourceCatalog layerId", () => {
    const missing: string[] = [];
    for (const id of shippedLayerIds()) {
      const rel = getLayerReliability(id);
      if (!rel) {
        missing.push(id);
        continue;
      }
      expect(rel.sourceLayerId).toBe(id);
      expect(rel.caveatKo.trim().length).toBeGreaterThan(0);
      expect(rel.caveatEn.trim().length).toBeGreaterThan(0);
      expect(EVIDENCE_TIERS).toContain(rel.evidenceTier);
      expect(["live", "near-real-time", "daily", "static", "curated"]).toContain(
        rel.freshnessClass,
      );
    }
    expect(missing).toEqual([]);
  });

  it("formats hover / sources lines", () => {
    const hover = formatReliabilityForHover("firms-fires", "ko");
    expect(hover?.badge).toBe("관측");
    expect(hover?.meta).toContain("준실시간");
    expect(formatReliabilityForSources("telegram-osint", "en")).toMatch(/Unverified/);
  });

  // ── 2026-07-31 감사 P0-3 회귀 방지 ──────────────────────────────────

  it("shipped 레이어에 synthetic tier 가 섞이지 않는다", () => {
    const leaked = shippedLayerIds().filter((id) => {
      const rel = getLayerReliability(id);
      return rel ? !isEvidenceTierShippable(rel.evidenceTier) : false;
    });
    expect(leaked).toEqual([]);
  });

  it("blocked 레이어는 사유가 반드시 있다", () => {
    for (const id of blockedLayerIds()) {
      const reason = layerBlockedReason(id);
      expect(reason, `${id} 에 blockedReason 이 없다`).toBeTruthy();
      expect(reason).not.toBe("사유 미기재");
      expect(isLayerShippable(id)).toBe(false);
    }
  });

  it("차단된 레이어는 실제 기관명으로 표기하지 않는다", () => {
    // 합성 데이터를 PeeringDB / OFAC / UCDP 이름으로 내보낸 것이 P0-3 의 본질이다.
    const REAL_ORG = /PeeringDB|OFAC|Uppsala Conflict Data|US Treasury/i;
    for (const note of NEWS_LAYER_SOURCE_CATALOG) {
      if (note.status !== "blocked") continue;
      expect(
        REAL_ORG.test(note.attribution),
        `${note.layerId}: 차단된 레이어인데 attribution 이 실제 기관명이다 ("${note.attribution}")`,
      ).toBe(false);
    }
  });

  it("synthetic-demo ingest 는 반드시 blocked 다", () => {
    const bad = NEWS_LAYER_SOURCE_CATALOG.filter(
      (n) => n.ingest === "synthetic-demo" && n.status !== "blocked",
    ).map((n) => n.layerId);
    expect(bad).toEqual([]);
  });
});
