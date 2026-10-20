/**
 * GEM 표본 표기 테스트.
 *
 * 핵심 불변식: **없는 정보로 "전수"라고 주장하지 않는다.**
 * 매니페스트가 없으면 아무 말도 안 하는 게 맞다 —
 * "전수입니다"라고 잘못 말하는 것보다 낫다.
 */
import { describe, expect, it } from "vitest";
import {
  lookupSampling,
  samplingBadge,
  samplingHint,
  withSamplingNote,
  type GemSamplingManifest,
} from "@/lib/gemSampling";

const MANIFEST: GemSamplingManifest = {
  generatedAt: "2026-08-01T00:00:00.000Z",
  profile: "full",
  note: "GEM 레이어는 캡 샘플이다",
  layers: {
    "gem-coal-plant": {
      file: "gem-coal-plants.json",
      total: 6743,
      shipped: 900,
      truncated: true,
      sampling: "geo-stratified",
      rank: "status,capacity",
    },
    "gem-geothermal": {
      file: "gem-geothermal.json",
      total: 180,
      shipped: 180,
      truncated: false,
      sampling: "complete",
      rank: "status,capacity",
    },
  },
};

describe("samplingBadge", () => {
  it("잘린 레이어는 표본 비율을 보여준다", () => {
    const badge = samplingBadge(MANIFEST.layers["gem-coal-plant"], "ko");
    expect(badge).toBe("표본 900/6,743 (13%)");
  });

  it("영문도 같은 정보를 준다", () => {
    expect(samplingBadge(MANIFEST.layers["gem-coal-plant"], "en")).toBe(
      "sample 900/6,743 (13%)",
    );
  });

  it("전수면 배지를 달지 않는다 — 화면을 어지럽히지 않는다", () => {
    expect(samplingBadge(MANIFEST.layers["gem-geothermal"])).toBeNull();
  });

  it("정보가 없으면 아무 주장도 하지 않는다", () => {
    // ★ 없다고 "전수"라고 말하면 안 된다
    expect(samplingBadge(undefined)).toBeNull();
  });
});

describe("samplingHint", () => {
  it("어떻게 뽑았는지 밝힌다", () => {
    const hint = samplingHint(MANIFEST.layers["gem-coal-plant"], "ko")!;
    expect(hint).toMatch(/지리 층화/);
    expect(hint).toMatch(/전수가 아닙니다/);
  });

  it("전수면 설명도 없다", () => {
    expect(samplingHint(MANIFEST.layers["gem-geothermal"])).toBeNull();
  });
});

describe("withSamplingNote", () => {
  it("기존 문구에 표본 표기를 덧붙인다", () => {
    expect(withSamplingNote("석탄발전소 900곳", MANIFEST.layers["gem-coal-plant"])).toBe(
      "석탄발전소 900곳 · 표본 900/6,743 (13%)",
    );
  });

  it("전수면 원래 문구 그대로", () => {
    expect(withSamplingNote("지열 180곳", MANIFEST.layers["gem-geothermal"])).toBe(
      "지열 180곳",
    );
  });

  it("정보가 없으면 원래 문구 그대로", () => {
    expect(withSamplingNote("석탄발전소 900곳", undefined)).toBe("석탄발전소 900곳");
  });
});

describe("lookupSampling", () => {
  it("kind 로 조회한다", () => {
    expect(lookupSampling(MANIFEST, "gem-coal-plant")?.shipped).toBe(900);
  });

  it("없는 kind·null 매니페스트에 안전하다", () => {
    expect(lookupSampling(MANIFEST, "gem-없음")).toBeUndefined();
    expect(lookupSampling(null, "gem-coal-plant")).toBeUndefined();
    expect(lookupSampling(undefined, "gem-coal-plant")).toBeUndefined();
  });
});
