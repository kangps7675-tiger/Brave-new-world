import { describe, expect, it } from "vitest";
import { liveuaConfirmedStrike, liveuaGroundAssault } from "@/lib/liveuamap/confirmedStrike";

function event(
  title: string,
  extra?: { body?: string; titleKo?: string; lat?: number; lng?: number },
) {
  return {
    title,
    body: extra?.body ?? "",
    titleKo: extra?.titleKo,
    bodyKo: "",
    tags: [] as string[],
    lat: extra?.lat ?? 46.48,
    lng: extra?.lng ?? 30.73,
  };
}

describe("liveuaConfirmedStrike", () => {
  it("keeps a drone that struck a site", () => {
    expect(
      liveuaConfirmedStrike(event("Shahed drones struck an oil depot in Odesa")),
    ).toEqual({ kind: "drone" });
  });

  it("keeps a missile that hit a city", () => {
    expect(
      liveuaConfirmedStrike(event("Ballistic missile hit Kharkiv")),
    ).toEqual({ kind: "missile" });
  });

  it("keeps explosions after a drone attack", () => {
    expect(
      liveuaConfirmedStrike(event("Explosions in Kyiv after drone attack")),
    ).toEqual({ kind: "drone" });
  });

  it("keeps a strike even when other drones were shot down", () => {
    expect(
      liveuaConfirmedStrike(
        event("Drones struck the plant; 12 were shot down"),
      ),
    ).toEqual({ kind: "drone" });
  });

  it("reads a Korean impact line", () => {
    expect(
      liveuaConfirmedStrike(
        event("Update", { titleKo: "드론이 하르키우 변전소를 타격했다" }),
      ),
    ).toEqual({ kind: "drone" });
  });

  it("drops a shoot-down and an intercept blast", () => {
    expect(
      liveuaConfirmedStrike(event("Air defense shot down drones over Kyiv")),
    ).toBeNull();
    expect(
      liveuaConfirmedStrike(event("Missile intercepted and exploded over the city")),
    ).toBeNull();
  });

  it("drops a launch that has not landed", () => {
    expect(
      liveuaConfirmedStrike(event("Russia launches missiles toward Kyiv")),
    ).toBeNull();
  });

  it("drops a test launch", () => {
    expect(
      liveuaConfirmedStrike(event("North Korea test-fires ballistic missile")),
    ).toBeNull();
  });

  it("drops a threat and an unconfirmed attack", () => {
    expect(liveuaConfirmedStrike(event("Missile threat warning for Israel"))).toBeNull();
    expect(liveuaConfirmedStrike(event("Possible drone attack on Kyiv"))).toBeNull();
    expect(
      liveuaConfirmedStrike(event("Update", { titleKo: "드론 타격 가능성" })),
    ).toBeNull();
  });

  it("keeps a strike on a training site and drops a drill", () => {
    expect(
      liveuaConfirmedStrike(event("Shahed drones struck a training center")),
    ).toEqual({ kind: "drone" });
    expect(
      liveuaConfirmedStrike(event("During a missile drill a target was struck")),
    ).toBeNull();
  });

  it("drops artillery and a Korean intercept", () => {
    expect(liveuaConfirmedStrike(event("Artillery shelling of Pokrovsk"))).toBeNull();
    expect(
      liveuaConfirmedStrike(event("Update", { titleKo: "미사일 요격에 성공" })),
    ).toBeNull();
  });

  it("drops a damaged missile-defense site that was not struck by a missile", () => {
    expect(
      liveuaConfirmedStrike(event("Artillery damaged a missile defense radar")),
    ).toBeNull();
  });

  it("drops an event without a real coordinate", () => {
    expect(
      liveuaConfirmedStrike(
        event("Cruise missile slammed into a residential building", {
          lat: Number.NaN,
          lng: 30,
        }),
      ),
    ).toBeNull();
  });
});

describe("liveuaGroundAssault", () => {
  it("marks infantry, armor, and light armor attacks", () => {
    expect(liveuaGroundAssault(event("Infantry assaulted the village"))).toEqual({
      kind: "ground",
    });
    expect(liveuaGroundAssault(event("Tanks attacked Avdiivka"))).toEqual({
      kind: "ground",
    });
    expect(liveuaGroundAssault(event("BMP entered the outskirts"))).toEqual({
      kind: "ground",
    });
    expect(
      liveuaGroundAssault(event("Update", { titleKo: "보병이 마을로 진입했다" })),
    ).toEqual({ kind: "ground" });
  });

  it("leaves shelling, oil tanks, drills, and drone strikes unmarked", () => {
    expect(liveuaGroundAssault(event("Artillery shelling of Pokrovsk"))).toBeNull();
    expect(liveuaGroundAssault(event("Oil tank farm struck"))).toBeNull();
    expect(liveuaGroundAssault(event("Tanks will attack the city"))).toBeNull();
    expect(
      liveuaGroundAssault(event("Update", { titleKo: "전차 공격 예고" })),
    ).toBeNull();
    expect(
      liveuaGroundAssault(event("Shahed drones struck an oil depot in Odesa")),
    ).toBeNull();
    expect(liveuaConfirmedStrike(event("Infantry assaulted the village"))).toBeNull();
  });
});
