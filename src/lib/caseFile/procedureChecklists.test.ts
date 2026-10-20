import { describe, expect, it } from "vitest";
import {
  findStepsForEventType,
  isProcedureItemDone,
  procedureChecklistFor,
} from "@/lib/caseFile/procedureChecklists";
import type { CaseFile } from "@/lib/caseFile/types";
import { emptyIncident } from "@/lib/caseFile/types";

describe("findStepsForEventType", () => {
  it("puts AIS first for maritime", () => {
    const steps = findStepsForEventType("maritime");
    expect(steps[0]?.mode).toBe("ais");
  });

  it("puts satellite and fire early for strike", () => {
    const steps = findStepsForEventType("strike");
    expect(steps[0]?.mode).toBe("satellite-auto");
    expect(steps[1]?.mode).toBe("firms");
    expect(steps[2]?.mode).toBe("air-raid");
  });
});

describe("procedureChecklistFor", () => {
  it("returns maritime-specific checks", () => {
    const items = procedureChecklistFor("maritime");
    expect(items.some((i) => i.id === "ais")).toBe(true);
    expect(items[0]?.id).toBe("anchor");
  });
});

describe("isProcedureItemDone", () => {
  it("marks anchor done when place and time exist", () => {
    const cf: CaseFile = {
      id: "c",
      rev: 1,
      article: { text: "" },
      eventType: "maritime",
      incident: {
        place: {
          label: "Port",
          lat: 1,
          lng: 2,
          precision: "city",
          source: "editor",
        },
        occurredAt: "2026-01-01T00:00:00.000Z",
        occurredAtSource: "editor",
      },
      claims: [],
      verdict: "unconfirmed",
    };
    const item = procedureChecklistFor("maritime")[0]!;
    expect(isProcedureItemDone(cf, item)).toBe(true);
    expect(isProcedureItemDone({ ...cf, incident: emptyIncident() }, item)).toBe(
      false,
    );
  });
});
