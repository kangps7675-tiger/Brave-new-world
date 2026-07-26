import { describe, expect, it } from "vitest";
import { geocodeObservation, destinationPoint, bearingFromText } from "./geocode";
import type { ExtractedObservation } from "./types";
import { parseJsoPressIndex } from "./jso";
import { parseUsniFleetTrackerRss } from "./usni";
import { t } from "@/lib/uiStrings";
import {
  mapEligibleShipObservations,
  shipMovementTrailPaths,
} from "./globeOverlay";
import type { PublicShipObservation } from "./types";

function baseObs(partial: Partial<ExtractedObservation> = {}): ExtractedObservation {
  return {
    vesselName: "USS George Washington",
    hullNumber: "CVN-73",
    navy: "USN",
    navyCode: "USN",
    observedAt: "2026-07-20T00:00:00.000Z",
    location: {
      raw: "",
      placeName: null,
      bearingDeg: null,
      distanceKm: null,
      directionText: null,
    },
    evidenceQuotes: [],
    vesselConfidence: "high",
    ...partial,
  };
}

describe("geocodeObservation location quality", () => {
  it("정밀 상대위치는 좌표·mapEligible", () => {
    const got = geocodeObservation(
      baseObs({
        location: {
          raw: "약 90km southwest of Kume Island",
          placeName: "Kume Island",
          bearingDeg: null,
          distanceKm: 90,
          directionText: "southwest",
        },
      }),
    );
    expect(got.locationStatus).toBe("precise");
    expect(got.mapEligible).toBe(true);
    expect(got.lat).not.toBeNull();
    expect(got.lng).not.toBeNull();
    expect(got.method).toBe("relative-bearing");
    expect(got.precisionKm).toBeGreaterThan(10);
  });

  it("해협만 있으면 chokepoint 추정", () => {
    const got = geocodeObservation(
      baseObs({
        location: {
          raw: "미야코 해협 남진",
          placeName: "Miyako Strait",
          bearingDeg: null,
          distanceKm: null,
          directionText: null,
        },
      }),
    );
    expect(got.locationStatus).toBe("chokepoint");
    expect(got.mapEligible).toBe(true);
    expect(got.lat).not.toBeNull();
    expect(got.confidence).toBe("estimated");
  });

  it("광역 해역만 있으면 mapEligible false", () => {
    const got = geocodeObservation(
      baseObs({
        location: {
          raw: "operating in the Philippine Sea",
          placeName: "Philippine Sea",
          bearingDeg: null,
          distanceKm: null,
          directionText: null,
        },
      }),
    );
    expect(got.locationStatus).toBe("broad");
    expect(got.mapEligible).toBe(false);
    expect(got.lat).not.toBeNull();
  });

  it("위치 문장 없으면 missing·좌표 null", () => {
    const got = geocodeObservation(baseObs());
    expect(got.locationStatus).toBe("missing");
    expect(got.mapEligible).toBe(false);
    expect(got.lat).toBeNull();
    expect(got.lng).toBeNull();
    expect(got.locationLabelKo).toContain("위치");
    expect(got.locationLabelEn).toMatch(/No public location/i);
  });

  it("미등록 지명은 unresolved", () => {
    const got = geocodeObservation(
      baseObs({
        location: {
          raw: "near Unregistered Atoll",
          placeName: "Unregistered Atoll XYZ",
          bearingDeg: 180,
          distanceKm: 20,
          directionText: "south",
        },
      }),
    );
    expect(got.locationStatus).toBe("unresolved");
    expect(got.mapEligible).toBe(false);
    expect(got.lat).toBeNull();
  });

  it("상충 해역은 ambiguous·좌표 null", () => {
    const got = geocodeObservation(
      baseObs({
        location: {
          raw: "reported in the Philippine Sea and also the South China Sea the same day",
          placeName: "Philippine Sea",
          bearingDeg: null,
          distanceKm: null,
          directionText: null,
        },
      }),
    );
    expect(got.locationStatus).toBe("ambiguous");
    expect(got.mapEligible).toBe(false);
    expect(got.lat).toBeNull();
  });
});

describe("destinationPoint / bearing", () => {
  it("구메섬 남서 90km는 오키나와 서쪽 해역", () => {
    const p = destinationPoint(26.34, 126.8, 225, 90);
    expect(p.lat).toBeLessThan(26.34);
    expect(p.lng).toBeLessThan(126.8);
  });

  it("방위 텍스트를 각도로", () => {
    expect(bearingFromText("southwest")).toBe(225);
    expect(bearingFromText("남서")).toBe(225);
  });
});

describe("parsers", () => {
  it("USNI RSS에서 Fleet Tracker 항목을 뽑는다", () => {
    const xml = `<?xml version="1.0"?>
    <rss version="2.0"><channel>
      <item>
        <title>USNI News Fleet and Marine Tracker: July 21, 2026</title>
        <link>https://news.usni.org/2026/07/21/usni-news-fleet-and-marine-tracker-july-21-2026</link>
        <pubDate>Mon, 21 Jul 2026 12:00:00 +0000</pubDate>
        <description><![CDATA[<p>USS George Washington (CVN-73) is operating in the Philippine Sea.</p>]]></description>
      </item>
      <item>
        <title>Unrelated politics story</title>
        <link>https://news.usni.org/other</link>
        <description>Congress vote</description>
      </item>
    </channel></rss>`;
    const rows = parseUsniFleetTrackerRss(xml);
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0]!.title).toMatch(/Fleet|Tracker|Pulse/i);
    expect(rows[0]!.source).toMatch(/usni/);
  });

  it("JSO 인덱스에서 해군 PDF만 필터", () => {
    const html = `
      <a href="./pdf/2026/press.pdf">中国海軍艦艇の動向について</a>
      <a href="./other.html">防衛大臣記者会見</a>
      <a href="./pdf/2026/joint.pdf">ロシア海軍艦艇との共同航行</a>
    `;
    const links = parseJsoPressIndex(html);
    expect(links.length).toBe(2);
    expect(links.every((l) => /艦艇|共同航行/.test(l.title))).toBe(true);
  });
});

describe("ko/en UI strings", () => {
  it("nav·위치미상 문구가 언어별로 분리된다", () => {
    expect(t("westpacShipMovesNav", "ko")).toMatch(/함선/);
    expect(t("westpacShipMovesNav", "en")).toMatch(/Ship/i);
    expect(t("westpacLocationUnknown", "ko")).not.toMatch(/[A-Za-z]{4,}/);
    expect(t("westpacLocationUnknown", "en")).not.toMatch(/[가-힣]/);
    expect(t("regimeConflictsNav", "ko")).toMatch(/분쟁/);
    expect(t("regimeConflictsNav", "en")).toMatch(/conflict/i);
  });
});

describe("globe trail policy", () => {
  it("좌표 없는 관측은 연결선을 만들지 않는다", () => {
    const rows: PublicShipObservation[] = [
      {
        id: "a",
        reportId: "r1",
        vesselKey: "cvn-73",
        vesselName: "USS George Washington",
        hullNumber: "CVN-73",
        navyCode: "USN",
        navyLabel: "미 해군",
        title: "Philippine Sea",
        summary: null,
        locationLabel: null,
        missingLocationNote: "위치 공개 관측 없음",
        observedAt: "2026-07-14T00:00:00.000Z",
        locationStatus: "missing",
        confidence: "estimated",
        vesselConfidence: "high",
        method: "none",
        mapEligible: false,
        lat: null,
        lng: null,
        precisionKm: null,
        weekStart: "2026-07-14",
        source: "usni-fleet-tracker",
        sourceUrl: "https://example.com",
        evidenceQuotes: [],
      },
      {
        id: "b",
        reportId: "r1",
        vesselKey: "cvn-73",
        vesselName: "USS George Washington",
        hullNumber: "CVN-73",
        navyCode: "USN",
        navyLabel: "미 해군",
        title: "Near Kume",
        summary: null,
        locationLabel: "구메섬 남서",
        missingLocationNote: null,
        observedAt: "2026-07-20T00:00:00.000Z",
        locationStatus: "precise",
        confidence: "reported",
        vesselConfidence: "high",
        method: "relative-bearing",
        mapEligible: true,
        lat: 25.7,
        lng: 126.1,
        precisionKm: 20,
        weekStart: "2026-07-14",
        source: "usni-fleet-tracker",
        sourceUrl: "https://example.com",
        evidenceQuotes: [],
      },
    ];
    expect(mapEligibleShipObservations(rows)).toHaveLength(1);
    expect(shipMovementTrailPaths(rows, "ko")).toHaveLength(0);
  });
});
