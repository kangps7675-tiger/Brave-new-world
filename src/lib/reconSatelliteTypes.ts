import type { ReconCountry, ReconSensor } from "@/lib/reconSatellites";

/** CelesTrak TLE + 정찰 분류 — API ↔ 클라이언트 공유 */
export type ReconTleSatellite = {
  name: string;
  line1: string;
  line2: string;
  country: ReconCountry;
  sensor: ReconSensor;
  familyKo: string;
  familyEn: string;
};
