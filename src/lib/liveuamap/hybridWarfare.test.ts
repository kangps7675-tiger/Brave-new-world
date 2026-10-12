import { describe, expect, it } from "vitest";
import {
  classifyHybridIncident,
  hybridAgencyOf,
  hybridKindOf,
  hybridNote,
  hybridZoneOf,
  isHybridEvent,
  withHybridTags,
} from "@/lib/liveuamap/hybridWarfare";

function ev(title: string, extra?: { body?: string; lat?: number; lng?: number }) {
  return {
    title,
    body: extra?.body ?? "",
    titleKo: undefined,
    bodyKo: undefined,
    tags: [] as string[],
    lat: extra?.lat ?? 50.0,
    lng: extra?.lng ?? 30.0,
  };
}

describe("airspace incursions — three European zones", () => {
  it("puts Poland in Central-Eastern Europe", () => {
    expect(
      classifyHybridIncident(
        ev("Russian drones violated Polish airspace overnight", { lat: 51.2, lng: 23.5 }),
      ),
    ).toMatchObject({ kind: "airspace-incursion", zone: "ce-europe", country: "Poland" });
  });

  it("groups the Baltic states with Central-Eastern Europe, Nordics stay Northern", () => {
    expect(
      classifyHybridIncident(ev("Russian drone entered Lithuanian airspace", { lat: 54.9, lng: 24.0 })),
    ).toMatchObject({ zone: "ce-europe", country: "Lithuania" });
    expect(
      classifyHybridIncident(ev("Drones over Riga airport, airspace violated, Russia blamed")),
    ).toMatchObject({ zone: "ce-europe", country: "Latvia" });
    expect(
      classifyHybridIncident(ev("Russian drone violated Finnish airspace")),
    ).toMatchObject({ zone: "n-europe", country: "Finland" });
    expect(
      classifyHybridIncident(ev("Drones spotted over Copenhagen airport, Russia suspected")),
    ).toMatchObject({ zone: "n-europe", country: "Denmark" });
  });

  it("puts Germany and the UK in Europe", () => {
    expect(
      classifyHybridIncident(ev("Drones spotted over German airbase, airspace violated")),
    ).toMatchObject({ zone: "europe", country: "Germany" });
  });

  it("uses the coordinate box only with NATO context, vague where boxes overlap", () => {
    const clear = classifyHybridIncident(
      ev("Russian drone crossed the border, NATO jets scrambled", { lat: 58.4, lng: 24.6 }),
    );
    expect(clear).toMatchObject({ zone: "ce-europe", country: "Estonia" });

    const noNato = classifyHybridIncident(
      ev("Russian drone crossed the border", { lat: 58.4, lng: 24.6 }),
    );
    expect(noNato).toBeNull();
  });

  it("does not let western Ukraine become a NATO-flank incident", () => {
    expect(
      classifyHybridIncident(
        ev("Russian drones entered the airspace over Lviv region", { lat: 49.84, lng: 24.03 }),
      ),
    ).toBeNull();
  });

  it("does not turn ordinary fighting inside Ukraine into a hybrid incident", () => {
    expect(
      classifyHybridIncident(ev("Russian forces shelled Kharkiv, drones struck an oil depot")),
    ).toBeNull();
  });
});

describe("sabotage — worldwide, agency suspicion flagged", () => {
  it("flags railway sabotage in Germany with an intelligence-agency suspicion", () => {
    const hit = classifyHybridIncident(
      ev("Railway sabotage in Germany; investigators suspect Russian GRU-recruited agents"),
    );
    expect(hit).toMatchObject({
      kind: "sabotage",
      zone: "europe",
      country: "Germany",
      agency: true,
    });
  });

  it("flags warehouse arson with a parcel/logistics context in Poland", () => {
    expect(
      classifyHybridIncident(ev("Arson at Warsaw logistics warehouse, sabotage suspected")),
    ).toMatchObject({ kind: "sabotage", zone: "ce-europe", country: "Poland" });
  });

  it("catches sabotage outside Europe and Asia as worldwide", () => {
    expect(
      classifyHybridIncident(ev("Sabotage at Chilean power substation, state-backed group blamed")),
    ).toMatchObject({ kind: "sabotage", zone: "world", agency: true });
  });

  it("assigns Asia when only an Asian place is named", () => {
    expect(
      classifyHybridIncident(ev("Sabotage of a port crane in Taiwan investigated")),
    ).toMatchObject({ kind: "sabotage", zone: "asia" });
  });

  it("ignores figurative sabotage with no infrastructure context", () => {
    expect(
      classifyHybridIncident(ev("Candidate accuses rival of sabotaging his campaign")),
    ).toBeNull();
  });

  it("does not claim agency involvement when the report does not suggest it", () => {
    const hit = classifyHybridIncident(ev("Arson at a rail depot in Sweden, police investigate"));
    expect(hit?.kind).toBe("sabotage");
    expect(hit?.agency).toBeUndefined();
  });
});

describe("Asia", () => {
  it("flags GPS jamming near Korea", () => {
    expect(classifyHybridIncident(ev("GPS jamming reported near the DMZ, Korea"))).toMatchObject({
      kind: "gps-jamming",
      zone: "asia",
    });
  });

  it("flags Chinese coast guard pressure in the South China Sea", () => {
    expect(
      classifyHybridIncident(
        ev("China coast guard used water cannon at Second Thomas Shoal, Philippines"),
      ),
    ).toMatchObject({ kind: "gray-zone-sea", zone: "asia" });
  });

  it("flags trash balloons from the north", () => {
    expect(classifyHybridIncident(ev("North Korean trash balloons landed in Seoul"))).toMatchObject(
      { kind: "balloon", zone: "asia" },
    );
  });

  it("flags an undersea cable cut near Taiwan", () => {
    expect(
      classifyHybridIncident(ev("Undersea cable cut off Taiwan, anchor dragged by vessel")),
    ).toMatchObject({ kind: "undersea-cable", zone: "asia" });
  });
});

describe("tags and notes", () => {
  it("round-trips through tags including the agency flag", () => {
    const incident = classifyHybridIncident(
      ev("Railway sabotage in Germany, intelligence agency suspected"),
    )!;
    const tags = withHybridTags(["ukraine"], incident);
    const event = { tags };
    expect(isHybridEvent(event)).toBe(true);
    expect(hybridKindOf(event)).toBe("sabotage");
    expect(hybridZoneOf(event)).toBe("europe");
    expect(hybridAgencyOf(event)).toBe(true);
    expect(withHybridTags(tags, incident)).toEqual(tags);
  });

  it("reads legacy zone tags saved before the three-way Europe split", () => {
    expect(hybridZoneOf({ tags: ["hybrid", "hybrid-zone:nato-east"] })).toBe("ce-europe");
    expect(hybridZoneOf({ tags: ["hybrid", "hybrid-zone:other"] })).toBe("world");
  });

  it("writes a note with the zone, and the agency caveat only when flagged", () => {
    const flagged = withHybridTags([], {
      kind: "sabotage",
      zone: "n-europe",
      country: "Sweden",
      agency: true,
    });
    expect(
      hybridNote({ tags: withHybridTags([], { kind: "sabotage", zone: "ce-europe" }) }, "ko"),
    ).toContain("발트 포함");
    expect(hybridNote({ tags: flagged }, "ko")).toContain("북유럽");
    expect(hybridNote({ tags: flagged }, "ko")).toContain("기관·국가 후원 세력 개입이 의심");
    const plain = withHybridTags([], { kind: "sabotage", zone: "world" });
    expect(hybridNote({ tags: plain }, "en")).toContain("Worldwide");
    expect(hybridNote({ tags: plain }, "en")).not.toContain("intelligence-agency");
    expect(hybridNote({ tags: plain }, "en")).toContain("verify at source");
    expect(hybridNote({ tags: [] }, "ko")).toBeNull();
  });
});
