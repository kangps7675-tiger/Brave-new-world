import { describe, expect, it } from "vitest";
import type { WatchboardItem } from "@/lib/intelContract/buildObserveWatchboard";
import {
  deskGradeVisual,
  deskSlotOpacity,
  watchboardItemToDeskFocus,
} from "@/lib/intelContract/deskFocus";
import { withComputedStats } from "@/lib/intelContract/bundleStats";
import { evaluateGate } from "@/lib/intelContract/gate";

function stubItem(
  partial: Partial<WatchboardItem> & Pick<WatchboardItem, "id" | "kind">,
): WatchboardItem {
  const gate = evaluateGate(
    withComputedStats({
      bundleId: "t",
      kind: "incident",
      titleKo: "t",
      titleEn: "t",
      geoOk: true,
      method: "test",
      disconfirmLog: { queried: true, hitCount: 0 },
      killCriteria: ["k"],
      altHypothesis: { labelKo: "a", labelEn: "a", supportIds: [] },
      observations: [
        {
          id: "1",
          modality: "media",
          sourceKey: "a",
          occurredAt: null,
          payloadRef: "1",
        },
        {
          id: "2",
          modality: "sensor",
          sourceKey: "b",
          occurredAt: null,
          payloadRef: "2",
        },
      ],
    }),
  );
  return {
    grade: "std",
    titleKo: "제목",
    titleEn: "Title",
    subtitleKo: "",
    subtitleEn: "",
    gate,
    pirIds: [],
    pirScore: 0,
    pirStatuses: [],
    gapNoteKo: null,
    gapNoteEn: null,
    occurredAt: null,
    ...partial,
  };
}

describe("watchboardItemToDeskFocus", () => {
  it("maps cluster coords and verify meta", () => {
    const focus = watchboardItemToDeskFocus(
      stubItem({
        id: "cluster:c1",
        kind: "conflict-cluster",
        clusterId: "c1",
        lat: 48.1,
        lng: 37.2,
        grade: "high",
      }),
    );
    expect(focus?.lat).toBe(48.1);
    expect(focus?.lng).toBe(37.2);
    expect(focus?.showHeroPin).toBe(true);
    expect(focus?.kind).toBe("conflict-cluster");
    expect(focus?.independenceCount).toBeGreaterThanOrEqual(1);
    expect(focus?.modalitiesPresent.length).toBeGreaterThan(0);
    expect(focus?.sequenceStartedAt).toBeGreaterThan(0);
    expect(focus?.disconfirmHitCount).toBe(0);
    expect(focus?.promoteFromHold).toBe(false);
  });

  it("flags promoteFromHold", () => {
    const focus = watchboardItemToDeskFocus(
      stubItem({
        id: "cluster:p",
        kind: "conflict-cluster",
        clusterId: "p",
        lat: 1,
        lng: 2,
        grade: "std",
      }),
      "ko",
      { promoteFromHold: true },
    );
    expect(focus?.promoteFromHold).toBe(true);
  });

  it("falls back to sitrep anchor", () => {
    const focus = watchboardItemToDeskFocus(
      stubItem({
        id: "sitrep:ukraine",
        kind: "theater-sitrep",
        sitrepRegion: "ukraine",
      }),
    );
    expect(focus).toBeTruthy();
    expect(focus!.lat).toBeGreaterThan(40);
  });

  it("hold hides hero pin", () => {
    const focus = watchboardItemToDeskFocus(
      stubItem({
        id: "cluster:h",
        kind: "hold",
        clusterId: "h",
        lat: 1,
        lng: 2,
        grade: "hold",
      }),
    );
    expect(focus?.showHeroPin).toBe(false);
  });
});

describe("deskGradeVisual / slotOpacity", () => {
  it("high pulses stronger than low", () => {
    expect(deskGradeVisual("high").pixelSize).toBeGreaterThan(
      deskGradeVisual("low").pixelSize,
    );
    expect(deskGradeVisual("high").pulse).toBe(true);
  });

  it("dims sensor slot when missing", () => {
    const op = deskSlotOpacity(["sensor"]);
    expect(op.sensor).toBeLessThan(1);
    expect(op.alert).toBe(1);
  });
});
