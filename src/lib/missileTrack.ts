export const MISSILE_AGENCIES = ["jcs", "jmod", "pentagon"] as const;
export type MissileAgency = (typeof MISSILE_AGENCIES)[number];
export const AGENCY_LABEL: Record<MissileAgency, string> = {
  jcs: "한국 합참", jmod: "일본 방위성", pentagon: "미 펜타곤",
};
export const AGENCY_COLOR: Record<MissileAgency, string> = {
  jcs: "#38bdf8", jmod: "#fb7185", pentagon: "#c4b5fd",
};
export type ReportLocation = {
  label: string;
  coordinates: [number, number]; // longitude, latitude
  precision: "published-coordinate" | "place-reference";
  /** Editorial display bounds, NOT a measured confidence interval. */
  bounds?: [number, number, number, number];
  basis: string;
};
export type MissileReport = {
  id: string;
  agency: MissileAgency;
  publishedAt: string;
  publicationTimeKnown: boolean;
  publisher: string;
  sourceUrl: string;
  sourceKind: "official" | "reporting";
  summary: string;
  excerpt?: string;
  launchTime?: string;
  landingTime?: string;
  distanceKm?: number;
  apogeeKm?: number;
  launch?: ReportLocation;
  landing?: ReportLocation;
};
export type MissileEvent = {
  id: string;
  date: string;
  title: string;
  reports: MissileReport[];
  /** Each endpoint retains its own source; never merge contradictory reports silently. */
  illustration?: { launchReportId: string; landingReportId: string };
};

export function illustrationEndpoints(event: MissileEvent, visible: MissileAgency[]) {
  const from = event.reports.find(r => r.id === event.illustration?.launchReportId);
  const to = event.reports.find(r => r.id === event.illustration?.landingReportId);
  if (!from?.launch || !to?.landing || !visible.includes(from.agency) || !visible.includes(to.agency)) return null;
  return { from, to, launch: from.launch, landing: to.landing };
}

/** Geographic interpolation for an illustrative ground track, not a flight model. */
export function trackPosition(from: [number, number], to: [number, number], progress: number): [number, number] {
  const t = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
  const delta = ((to[0] - from[0] + 540) % 360) - 180;
  return [((from[0] + delta * t + 540) % 360) - 180, from[1] + (to[1] - from[1]) * t];
}

export function safeArticleUrl(raw: string): string | null {
  try { const url = new URL(raw); return url.protocol === "https:" || url.protocol === "http:" ? url.href : null; }
  catch { return null; }
}

export type MissileArticleCandidate = {
  title: string;
  link: string;
  pubDate: string;
  publisher?: string;
  agencies: MissileAgency[];
  queriedAgencies: MissileAgency[];
  status: "needs-review";
};

export function isDprkMissileArticle(text: string): boolean {
  return /north\s*korea|dprk|북한|北朝鮮/i.test(text) && /missile|icbm|미사일|ミサイル/i.test(text);
}

/** Mentions are discovery hints only. They do not establish attribution of measurements. */
export function mentionedAgencies(text: string): MissileAgency[] {
  if (!isDprkMissileArticle(text)) return [];
  return MISSILE_AGENCIES.filter(agency => ({
    jcs: /joint chiefs of staff|\bJCS\b|합참|합동참모/i,
    jmod: /japan.{0,35}(defen[cs]e|minister)|japanese.{0,25}(defen[cs]e|military)|방위성|防衛省/i,
    pentagon: /pentagon|펜타곤|미\s*국방부|U\.?S\.?.{0,20}(defen[cs]e secretary|department of defen[cs]e)/i,
  })[agency].test(text));
}
