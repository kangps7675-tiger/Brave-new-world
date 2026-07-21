/**
 * AIS / ADS-B — D1·라이브 모두 비었을 때 체크박스 ON이면 최소 마커가 보이도록 하는 데모 시드.
 * 실데이터 아님 · UI 빈 화면 방지용.
 */
import type { AisVessel, MilitaryAircraft } from "@/data/geoTypes";

function milPlane(
  hex: string,
  callsign: string,
  lat: number,
  lng: number,
  type: string,
  track: number,
): MilitaryAircraft {
  const at = new Date().toISOString();
  return {
    id: hex,
    hex,
    callsign,
    registration: null,
    lat,
    lng,
    altitude: 28000,
    altitudeGeom: 28000,
    groundSpeed: 420,
    indicatedAirspeed: null,
    trueAirspeed: null,
    mach: null,
    track,
    trackRate: null,
    roll: null,
    magHeading: null,
    trueHeading: track,
    baroRate: null,
    geomRate: null,
    squawk: "0001",
    emergency: null,
    type,
    category: "A5",
    dbFlags: 1,
    windDirection: null,
    windSpeed: null,
    navAltitudeMcp: null,
    navHeading: null,
    navModes: null,
    seen: null,
    seenPos: null,
    rssi: null,
    acasAdvisory: null,
    timestamp: at,
    bellingcatMilitary: true,
  };
}

function civPlane(
  hex: string,
  callsign: string,
  lat: number,
  lng: number,
  type: string,
  track: number,
): MilitaryAircraft {
  const at = new Date().toISOString();
  return {
    id: hex,
    hex,
    callsign,
    registration: null,
    lat,
    lng,
    altitude: 35000,
    altitudeGeom: 35000,
    groundSpeed: 480,
    indicatedAirspeed: null,
    trueAirspeed: null,
    mach: null,
    track,
    trackRate: null,
    roll: null,
    magHeading: null,
    trueHeading: track,
    baroRate: null,
    geomRate: null,
    squawk: "1001",
    emergency: null,
    type,
    category: "A3",
    dbFlags: 0,
    windDirection: null,
    windSpeed: null,
    navAltitudeMcp: null,
    navHeading: null,
    navModes: null,
    seen: null,
    seenPos: null,
    rssi: null,
    acasAdvisory: null,
    timestamp: at,
  };
}

export function demoAisVessels(
  classFilter: "military" | "commercial" | "all" | "disguised" = "all",
): AisVessel[] {
  const at = new Date().toISOString();
  const demo: AisVessel[] = [
    {
      id: "367000001",
      mmsi: "367000001",
      shipName: "USS Abraham Lincoln",
      lat: 17.25,
      lng: 63.85,
      speedOverGround: 12,
      courseOverGround: 90,
      trueHeading: 90,
      timestamp: at,
      shipType: 35,
      shipTypeLabel: "Military",
      category: "military",
      militaryKind: "carrier",
    },
    {
      id: "367000011",
      mmsi: "367000011",
      shipName: "USS DEMO DESTROYER",
      lat: 25.1,
      lng: 55.2,
      speedOverGround: 18,
      courseOverGround: 45,
      trueHeading: 45,
      timestamp: at,
      shipType: 35,
      shipTypeLabel: "Military",
      category: "military",
      militaryKind: "destroyer",
    },
    {
      id: "440000012",
      mmsi: "440000012",
      shipName: "ROKS SEJONG THE GREAT DDG-991",
      lat: 33.2,
      lng: 126.5,
      speedOverGround: 16,
      courseOverGround: 120,
      trueHeading: 120,
      timestamp: at,
      shipType: 35,
      shipTypeLabel: "Military",
      category: "military",
      militaryKind: "destroyer",
    },
    {
      id: "235000013",
      mmsi: "235000013",
      shipName: "HMS DEMO FRIGATE FFG-23",
      lat: 35.0,
      lng: 33.0,
      speedOverGround: 14,
      courseOverGround: 200,
      trueHeading: 200,
      timestamp: at,
      shipType: 35,
      shipTypeLabel: "Military",
      category: "military",
      militaryKind: "frigate",
    },
    {
      id: "367000014",
      mmsi: "367000014",
      shipName: "USS DEMO SUBMARINE SSN",
      lat: 18.5,
      lng: 65.0,
      speedOverGround: 8,
      courseOverGround: 270,
      trueHeading: 270,
      timestamp: at,
      shipType: 35,
      shipTypeLabel: "Military",
      category: "military",
      militaryKind: "submarine",
    },
    {
      id: "477000002",
      mmsi: "477000002",
      shipName: "EVER DEMO",
      lat: 1.25,
      lng: 103.8,
      speedOverGround: 14,
      courseOverGround: 180,
      trueHeading: 180,
      timestamp: at,
      shipType: 70,
      shipTypeLabel: "Cargo",
      category: "commercial",
      militaryKind: null,
    },
    {
      id: "636000003",
      mmsi: "636000003",
      shipName: "CRUDE DEMO",
      lat: 26.5,
      lng: 56.5,
      speedOverGround: 11,
      courseOverGround: 270,
      trueHeading: 270,
      timestamp: at,
      shipType: 80,
      shipTypeLabel: "Tanker",
      category: "commercial",
      militaryKind: null,
    },
  ];
  if (classFilter === "military") return demo.filter((v) => v.category === "military");
  if (classFilter === "commercial") return demo.filter((v) => v.category === "commercial");
  if (classFilter === "disguised") return [];
  return demo;
}

export function demoMilAircraft(): MilitaryAircraft[] {
  return [
    milPlane("ae4a01", "RCH001", 34.9, 33.5, "C17", 95),
    milPlane("ae04d9", "REACH42", 35.2, 129.1, "KC135", 210),
    milPlane("3b76ae", "FAF001", 48.8, 2.2, "A400", 40),
  ];
}

export function demoCivAircraft(): MilitaryAircraft[] {
  return [
    civPlane("c0182e", "CPA001", 22.3, 114.2, "B77W", 80),
    civPlane("a83b5e", "UAL882", 37.5, -122.2, "B789", 270),
    civPlane("4780d1", "AFL120", 55.6, 37.3, "A359", 150),
  ];
}
