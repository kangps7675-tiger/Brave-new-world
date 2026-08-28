import { describe, expect, it } from "vitest";
import {
  MEDIAZONA_CASUALTY_MARKER_ID,
  buildHapiCasualtySkullMarker,
  buildMediazonaCasualtyMarker,
  hapiCasualtyKilledLabel,
  isHapiEventsOnly,
} from "@/lib/casualtySkullMarkers";
import type { HapiActiveFront } from "@/lib/hapiConflictCasualties";
import { MEDIAZONA_CASUALTY_SEED } from "@/lib/mediazonaCasualties";

const tehranEvents: HapiActiveFront = {
  id: "hapi-irn-tehran",
  theaterId: "middle-east",
  locationCode: "IRN",
  locationName: "Iran",
  admin1Name: "Tehran",
  lat: 35.69,
  lng: 51.39,
  killed: 0,
  events: 18,
  periodStart: "2026-02-28",
  periodEnd: "2026-08-26",
  territorySpanDeg: 2.2,
};

const khuzestan: HapiActiveFront = {
  ...tehranEvents,
  id: "hapi-irn-khuzestan",
  admin1Name: "Khuzestan",
  killed: 40,
  events: 9,
};

describe("hapiCasualtyKilledLabel", () => {
  it("does not call Iran event counts today's fatalities", () => {
    expect(hapiCasualtyKilledLabel("IRN", true, "ko")).toBe("이란 정치폭력 사건");
    expect(hapiCasualtyKilledLabel("IRN", false, "ko")).toBe("개전 이후 사망 (ACLED)");
    expect(hapiCasualtyKilledLabel("UKR", false, "ko")).toBe("개전 이후 사망 (ACLED)");
  });
});

describe("buildHapiCasualtySkullMarker", () => {
  it("shows Iran events when fatalities are zero", () => {
    expect(isHapiEventsOnly(tehranEvents)).toBe(true);
    const m = buildHapiCasualtySkullMarker(tehranEvents, "ko");
    expect(m.killed).toBe(18);
    expect(m.hideWounded).toBe(true);
    expect(m.killedLabel).toBe("이란 정치폭력 사건");
  });

  it("shows Iran war-start fatalities when present", () => {
    const m = buildHapiCasualtySkullMarker(khuzestan, "ko");
    expect(m.killed).toBe(40);
    expect(m.killedLabel).toBe("개전 이후 사망 (ACLED)");
  });
});

describe("buildMediazonaCasualtyMarker", () => {
  it("exposes named KIA plus CSIS wounded", () => {
    const m = buildMediazonaCasualtyMarker(MEDIAZONA_CASUALTY_SEED, "ko");
    expect(m.id).toBe(MEDIAZONA_CASUALTY_MARKER_ID);
    expect(m.killed).toBe(MEDIAZONA_CASUALTY_SEED.confirmedNamedDeaths);
    expect(m.wounded).toBe(MEDIAZONA_CASUALTY_SEED.estimatedWounded);
    expect(m.hideWounded).toBe(false);
    expect(m.killedLabel).toMatch(/전사|확인/);
  });
});
