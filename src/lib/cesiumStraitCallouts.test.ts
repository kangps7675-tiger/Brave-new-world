import { describe, expect, it } from "vitest";
import {
  buildBundleCalloutLabels,
  buildPortLabels,
} from "@/lib/cesiumStraitCallouts";
import type { WatchboardItem } from "@/lib/intelContract/buildObserveWatchboard";
import { OBSERVE_STRAIT_PRESETS } from "@/lib/cesiumStraitScene";

function item(
  id: string,
  titleKo: string,
  lat: number,
  lng: number,
  grade: WatchboardItem["grade"] = "low",
): WatchboardItem {
  return {
    id,
    kind: "maritime-alert",
    grade,
    titleKo,
    titleEn: titleKo,
    subtitleKo: "",
    subtitleEn: "",
    gate: {
      grade,
      reasons: [],
      bundle: {
        bundleId: id,
        kind: "maritime-alert",
        titleKo,
        titleEn: titleKo,
        observations: [],
        independenceCount: 1,
        modalityCount: 0,
        timeSpanMs: 0,
        geoOk: true,
        method: "test",
        disconfirmLog: { queried: false, hitCount: 0 },
        killCriteria: [],
      },
    },
    pirIds: [],
    pirScore: 0,
    pirStatuses: [],
    gapNoteKo: null,
    gapNoteEn: null,
    occurredAt: null,
    lat,
    lng,
  };
}

describe("buildBundleCalloutLabels", () => {
  const hormuz = OBSERVE_STRAIT_PRESETS.find((p) => p.id === "hormuz")!;

  it("dedupes same title near the gate (portwatch + ais-gate)", () => {
    const labels = buildBundleCalloutLabels({
      preset: hormuz,
      lang: "ko",
      max: 5,
      items: [
        item("alert:portwatch:choke-hormuz", "호르무즈 해협", 26.58, 56.25),
        item("alert:ais-gate:hormuz", "호르무즈 해협", 26.6, 56.3),
        item("alert:portwatch:other", "다른 초크", 26.5, 56.4, "std"),
      ],
    });
    const hormuzLabels = labels.filter((l) => l.text.includes("호르무즈"));
    expect(hormuzLabels).toHaveLength(1);
    expect(hormuzLabels[0].text.startsWith("[")).toBe(false);
  });
});

describe("buildPortLabels", () => {
  it("dedupes ports with the same name", () => {
    const labels = buildPortLabels(
      [
        {
          id: "a",
          name: "Jebel Ali Terminal",
          lat: 25.0,
          lng: 55.0,
          kind: "lng-terminal",
        },
        {
          id: "b",
          name: "Jebel Ali Terminal",
          lat: 25.01,
          lng: 55.01,
          kind: "port",
        },
      ],
      "en",
    );
    expect(labels).toHaveLength(1);
  });
});
