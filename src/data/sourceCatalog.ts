export interface NewsLayerSourceNote {
  layerId: string;
  source: string;
  url: string;
  cadence: string;
  attribution: string;
  notes: string;
  status: "shipped" | "planned";
  ingest:
    | "static-build"
    | "cached-api"
    | "live-poll"
    | "mapped-existing"
    | "live-api";
}

/** 주요 실시간 출처 — 자료출처 패널 상단·도움말에 고정 표기 */
export type PrimaryLiveSource = {
  id: "nasa-firms" | "adsb" | "marinetraffic";
  nameKo: string;
  nameEn: string;
  product: string;
  url: string;
  layers: string;
  noteKo: string;
};

export const PRIMARY_LIVE_SOURCES: PrimaryLiveSource[] = [
  {
    id: "nasa-firms",
    nameKo: "NASA FIRMS",
    nameEn: "NASA Fire Information for Resource Management System",
    product: "VIIRS NRT (NOAA-20 / SNPP)",
    url: "https://firms.modaps.eosdis.nasa.gov/",
    layers: "위성 화재·폭격 추정 (/api/firms-fires)",
    noteKo:
      "근실시간 위성 열원 탐지. Cron → D1 → 공개 /firms 폴백. 지도 표기: NASA FIRMS.",
  },
  {
    id: "adsb",
    nameKo: "ADS-B",
    nameEn: "Automatic Dependent Surveillance–Broadcast",
    product: "adsb.lol · airplanes.live · ADSBexchange / adsb.fi",
    url: "https://www.adsbexchange.com/",
    layers: "군용기·민간 항적 (/api/adsb-mil, /api/adsb-traffic)",
    noteKo:
      "ADS-B 항적. 워커는 Worker IP 호환 소스(adsb.lol 등) 우선, 키 있으면 ADSBexchange. 군용 ICAO hex는 Bellingcat Turnstone(adsb-history) modes.csv로 보강. 출처: https://github.com/bellingcat/adsb-history.git · 지도 표기: ADS-B.",
  },
  {
    id: "marinetraffic",
    nameKo: "MarineTraffic",
    nameEn: "MarineTraffic AIS",
    product: "exportvessels · aisstream.io 폴백",
    url: "https://www.marinetraffic.com/",
    layers: "선박 AIS (/api/ais) · 위장선박 (/api/ais-disguised)",
    noteKo:
      "민간 화물·탱커·여객 등. MarineTraffic 키 실패 시 AISstream 폴백. 위장·다크플리트 시드는 AIS_Tracker(https://github.com/arandomguyhere/AIS_Tracker.git). 지도 표기: MarineTraffic · AIS.",
  },
];

/**
 * Conflict-view adapted source catalog.
 * URLs map to `/data/{profile}/*.json` static assets or `/api/*` routes in this app.
 */
export const NEWS_LAYER_SOURCE_CATALOG: NewsLayerSourceNote[] = [
  // Dynamic / real-time layers
  {
    layerId: "intel-hotspots",
    source: "Configurable GeoJSON feed",
    url: "/api/intel-hotspots",
    cadence: "Configured",
    attribution: "External provider",
    notes:
      "Intel/security hotspot events from a configurable GeoJSON endpoint (INTEL_HOTSPOTS_URL).",
    status: "shipped",
    ingest: "cached-api",
  },
  {
    layerId: "conflict-zones",
    source: "AI war-zone demo (local heuristics)",
    url: "/api/layers/conflict-zones",
    cadence: "2 min (120s TTL)",
    attribution: "Natural Earth + GDELT war clustering",
    notes:
      "Demo mode: no external AI API. Heuristically detects war zones from territorial disputes and recent combat news density.",
    status: "shipped",
    ingest: "cached-api",
  },
  {
    layerId: "military-activity",
    source: "ADS-B (군용기) + Bellingcat Turnstone hex DB",
    url: "/api/adsb-mil",
    cadence: "Cron warm ~10m · toggle on-demand D1",
    attribution:
      "ADS-B · adsb.lol / airplanes.live / ADSBexchange / adsb.fi · Military hex: https://github.com/bellingcat/adsb-history.git",
    notes:
      "Military aircraft via ADS-B. Cron → D1 `adsb_aircraft` (mode=mil). ICAO hex military flags enriched from Bellingcat/Turnstone modes.csv (adsb-history, MIT). User toggle reads D1 first; ?live=1 forces upstream.",
    status: "shipped",
    ingest: "cached-api",
  },
  {
    layerId: "reef-watch",
    source: "ReefWatch feature registry + OpenSky Network",
    url: "/api/reefwatch",
    cadence: "Client poll 3 min while ON · server cache 90s · one combined SCS bbox request",
    attribution:
      "ReefWatch (MIT) https://github.com/NinhGhoster/ReefWatch · OpenSky Network https://opensky-network.org/",
    notes:
      "Feature-centric SCS monitoring bridge. Renders 77 Spratly/Paracel features from ReefWatch target_features.json. Polls OpenSky once over the combined bbox (quick_check policy) and attributes aircraft only within ±0.15° (~16.7 km) of a feature. Not a live battlefield truth engine; Planet/imagery ingest stays optional upstream.",
    status: "shipped",
    ingest: "live-poll",
  },
  {
    layerId: "air-traffic",
    source: "ADS-B (민간 항적)",
    url: "/api/adsb-traffic",
    cadence: "Cron hub warm ~10m · toggle on-demand D1",
    attribution: "ADS-B · adsb.lol / airplanes.live / ADSBexchange / adsb.fi",
    notes:
      "Civilian ADS-B traffic (exclude dbFlags&1 and Bellingcat military hex). Cron warms hub grids into D1; viewport query prefers D1 bbox then live.",
    status: "shipped",
    ingest: "cached-api",
  },
  {
    layerId: "ais",
    source: "MarineTraffic (AIS)",
    url: "/api/ais",
    cadence: "Cron ~10m · toggle on-demand D1",
    attribution: "MarineTraffic · aisstream.io",
    notes:
      "Commercial AIS via MarineTraffic → D1 `ais_vessels`. Toggle reads D1 first; AISstream live fallback when MT unavailable.",
    status: "shipped",
    ingest: "cached-api",
  },
  {
    layerId: "disguised-vessels",
    source: "AIS_Tracker (위장·다크플리트 선박)",
    url: "/api/ais-disguised",
    cadence: "Static seed (OSINT watchlist)",
    attribution:
      "https://github.com/arandomguyhere/AIS_Tracker.git — vessels DB · dark_fleet.py · demo_data",
    notes:
      "Civilian vessels conducting military missions / dark fleet / arsenal-ship seed from AIS_Tracker. Seed positions + name/MMSI match against live AIS when available.",
    status: "shipped",
    ingest: "static-build",
  },
  {
    layerId: "tunnels",
    source: "멋진 신세계 submarine tunnel seed → D1",
    url: "/api/submarine-tunnels",
    cadence: "On demand (seeded once)",
    attribution: "멋진 신세계 logistics seed",
    notes:
      "Major undersea tunnels (Eurotunnel, Seikan, Marmaray, …). Stored in D1 `submarine_tunnels`; fetched only when layer toggled ON.",
    status: "shipped",
    ingest: "cached-api",
  },
  {
    layerId: "firms-fires",
    source: "NASA FIRMS (VIIRS NRT)",
    url: "/api/firms-fires",
    cadence: "Cron ~10m · viewport bbox",
    attribution: "NASA FIRMS",
    notes:
      "Near-real-time satellite fire detections (VIIRS NOAA-20 / SNPP NRT). Cron → D1 → /api/firms-fires. Map attribution: NASA FIRMS.",
    status: "shipped",
    ingest: "cached-api",
  },
  {
    layerId: "tzeva-adom",
    source: "Pikud HaOref (unofficial JSON)",
    url: "/api/tzeva-adom",
    cadence: "Client poll only while showTzevaAdom ON (stub 3s / live 15s); server cache ~2.5s",
    attribution: "Israel Home Front Command (Oref)",
    notes:
      "Tzeva Adom rocket/missile alerts via AlertsHistory.json — same feed as DavidTheExplorer/Tzeva-Adom-API. Geo-restricted to Israeli IP; use OREF_HISTORY_URL proxy abroad.",
    status: "shipped",
    ingest: "live-poll",
  },
  {
    layerId: "ukmto-incidents",
    source: "UKMTO / Royal Navy (unofficial endpoint)",
    url: "/api/ukmto",
    cadence: "Cron ~30 min min-interval (unofficial upstream, polled politely) → D1",
    attribution: "UK Maritime Trade Operations (Royal Navy) · Open Government Licence",
    notes:
      "Merchant vessel attack / boarding / hijack / suspicious-activity warnings (Red Sea, Gulf of Aden, Strait of Hormuz, etc.). No documented public API — endpoint identified via client JS bundle inspection. Not an official alert substitute; see README 비공식 엔드포인트 사용 원칙.",
    status: "shipped",
    ingest: "cached-api",
  },
  {
    layerId: "navarea-warnings",
    source: "JHOD NAVAREA XI · NGA NAVAREA IV/XII (public TXT)",
    url: "/api/navarea",
    cadence: "Cron self-throttle ~30 min (worker */10, NAVAREA min-interval) → D1 snapshot replace",
    attribution: "Japan Coast Guard (JHOD) · U.S. NGA Navigational Warnings",
    notes:
      "Sources publish event-driven into static TXT (no webhook). 멋진 신세계 polls; each successful poll recomputes the full in-force snapshot and replaces by region. IDs are region-prefixed (XI-26-0330, IV-26-0695). Optional ?region=XI filter. Prefer 15–30 min poll — not FIRMS/AIS cadence.",
    status: "shipped",
    ingest: "cached-api",
  },
  {
    layerId: "military-exercises",
    source: "NAVAREA exercise notices · news_stream keyword slice → D1 military_exercises",
    url: "/api/military-exercises",
    cadence: "Cron with NAVAREA/news ingest · client poll ~3 min (auto-alert even if layer off)",
    attribution: "Underlying NAVAREA / outlet credits per exercise sources_json",
    notes:
      "Normalized military exercise zones (cyan hatch). Confidence: announced / announced_osint / unverified; client may soft-bump to announced_rf when ADS-B/AIS points fall in bbox — RF is a bonus, not proof. DPRK/IR auto-alert does not force military ADS-B ON. See docs/exercise-alerts.md.",
    status: "shipped",
    ingest: "cached-api",
  },
  {
    layerId: "newfeeds-iran",
    source: "NewFeeds (ktoetotam/NewFeeds)",
    url: "/api/newfeeds-attacks?iran=1 · news via /api/news-stream",
    cadence: "5 min cache · attacks map + iran.json → bottom breaking",
    attribution:
      "NewFeeds · https://github.com/ktoetotam/NewFeeds (MIT) — underlying outlets retained per article",
    notes:
      "Iran-related geocoded attack/military events on the map (layer toggle). Iran state/regional headlines merge into /api/news-stream as Tier-3 state media and compete for the bottom breaking hero. Always credit NewFeeds when displayed.",
    status: "shipped",
    ingest: "cached-api",
  },
  {
    layerId: "neptun",
    source: "NEPTUN (neptun.in.ua)",
    url: "/api/neptun",
    cadence: "WebSocket stream · REST fallback 5s",
    attribution: "NEPTUN — Карта повітряних тривог України",
    notes:
      "Ukraine air threats (UAV, missile, KAB) and official air-raid alerts. Free public API, no key. Not an official alert system — informational only.",
    status: "shipped",
    ingest: "live-poll",
  },
  {
    layerId: "ucdp-events",
    source: "UCDP GED 26.1",
    url: "https://ucdpapi.pcr.uu.se/api/gedevents/26.1 → /data/{profile}/ucdp-events.json",
    cadence: "Build-time fetch (npm run data:ucdp) · annual GED releases",
    attribution: "Uppsala Conflict Data Program (UCDP) · GED API",
    notes:
      "Verified fatality-coded organized violence events from the UCDP Georeferenced Event Dataset. Fetched at build time with x-ucdp-access-token; each event requires ≥1 recorded fatality. Source: https://ucdp.uu.se/downloads/index.html · API: https://ucdpapi.pcr.uu.se",
    status: "shipped",
    ingest: "static-build",
  },
  {
    layerId: "space-launches",
    source: "The Space Devs (LL2)",
    url: "/api/space-launches",
    cadence: "1 hour",
    attribution: "The Space Devs",
    notes: "Recent orbital launches via Launch Library 2 free tier.",
    status: "shipped",
    ingest: "cached-api",
  },
  {
    layerId: "recon-satellites",
    source: "CelesTrak (T.S. Kelso)",
    url: "/api/satellites",
    cadence: "6–12 hours (TLE)",
    attribution: "Orbital elements: CelesTrak (T.S. Kelso)",
    notes:
      "GP TLEs from the military and earth-resources groups plus recon-family name queries, filtered by public recon-family patterns. Navigation, comms and early-warning series, debris, and TLEs older than 45 days are dropped. Positions computed client-side via SGP4; horizon ring is theoretical footprint, not imaging activity.",
    status: "shipped",
    ingest: "cached-api",
  },
  {
    layerId: "gps-interference",
    source: "GPSJam.org (John Wiseman)",
    url: "/api/gps-jam",
    cadence: "Daily CSV (~04:00 UTC) · CDN 6–12h",
    attribution: "GPS interference: GPSJam.org (John Wiseman) · ADS-B Exchange",
    notes:
      "Share of aircraft reporting GNSS anomalies per H3 res-4 cell. MIN_AIRCRAFT filter applied. Does NOT show jammer/equipment locations. Unofficial static feed; solo mode when ON.",
    status: "shipped",
    ingest: "cached-api",
  },
  {
    layerId: "cyber-incidents",
    source: "GDELT Geo 2.0",
    url: "/api/gdelt?theme=cyber",
    cadence: "2 minutes",
    attribution: "GDELT Project",
    notes: "Cyber attack / ransomware events via GDELT theme query.",
    status: "shipped",
    ingest: "cached-api",
  },
  {
    layerId: "election-events",
    source: "GDELT Geo 2.0",
    url: "/api/gdelt?theme=election",
    cadence: "2 hours",
    attribution: "GDELT Project",
    notes: "Election, vote, referendum events via GDELT.",
    status: "shipped",
    ingest: "cached-api",
  },

  // Static / mapped-existing layers
  {
    layerId: "military-bases",
    source: "Static build",
    url: "/data/{profile}/military-bases.json",
    cadence: "Project versioned",
    attribution: "OpenStreetMap / public datasets",
    notes: "Major military installations worldwide (static profile JSON).",
    status: "shipped",
    ingest: "mapped-existing",
  },
  {
    layerId: "nuclear-sites",
    source: "Static build",
    url: "/data/{profile}/nuclear-sites.json",
    cadence: "Project versioned",
    attribution: "IAEA / NTI / public datasets",
    notes: "Nuclear power plants and research reactors.",
    status: "shipped",
    ingest: "static-build",
  },
  {
    layerId: "safecast-radiation",
    source: "Safecast",
    url: "/api/safecast",
    cadence: "Hourly cached near priority nuclear sites",
    attribution: "Radiation: Safecast (api.safecast.org)",
    notes:
      "µSv/h gauges near Zaporizhzhia, Fukushima, Yongbyon, Dimona, Chernobyl, Kori, Sellafield when nuclear sites layer is on.",
    status: "shipped",
    ingest: "cached-api",
  },
  {
    layerId: "noaa-swpc",
    source: "NOAA SWPC",
    url: "/api/swpc",
    cadence: "~10 min (Kp / R-S-G scales)",
    attribution: "Space weather: NOAA SWPC",
    notes: "Planetary K-index and NOAA R/S/G scales as a status chip under the global index.",
    status: "shipped",
    ingest: "cached-api",
  },
  {
    layerId: "adsb-emergency",
    source: "adsb.lol /sqk/",
    url: "/api/adsb-emergency",
    cadence: "~45s poll",
    attribution: "ADS-B emergency squawk: adsb.lol",
    notes: "Squawk 7700/7600/7500 emergency contacts — auto flyTo + siren + banner.",
    status: "shipped",
    ingest: "cached-api",
  },
  {
    layerId: "missile-silos",
    source: "PLARF Silo Study (KMZ / shapefile)",
    url: "/api/layers/strategic-missile?dataset=silos",
    cadence: "Project versioned",
    attribution: "PLARF Silo Study · China missile silo construction 2019-2021",
    notes:
      "312 identified silos across the Yumen, Hami and Hanggin Banner fields, plus 560 candidate grid cells and 619 access-road segments.",
    status: "shipped",
    ingest: "static-build",
  },
  {
    layerId: "strategic-missile-bases",
    source: "RVSN order of battle (open-source curation)",
    url: "/api/layers/strategic-missile?dataset=bases",
    cadence: "Project versioned",
    attribution: "Russian Strategic Rocket Forces — open-source order of battle",
    notes:
      "27th/31st/33rd Missile Army garrisons with silo vs road-mobile basing. Garrison towns, not launch positions.",
    status: "shipped",
    ingest: "static-build",
  },
  {
    layerId: "missile-launch-tests",
    source: "NTI / CNS India and Pakistan Missile Launch Tracker",
    url: "/api/layers/strategic-missile?dataset=launches",
    cadence: "Tracker release versioned (v2026.1)",
    attribution: "NTI / CNS James Martin Center for Nonproliferation Studies",
    notes:
      "326 India/Pakistan launch tests since 1979 with facility coordinates, missile family, apogee and outcome.",
    status: "shipped",
    ingest: "static-build",
  },
  {
    layerId: "reference-monitor",
    source: "CSIS Beyond Parallel RSS · NTI WordPress REST",
    url: "/api/reference-monitor",
    cadence: "~6h poll (cron ingest)",
    attribution: "CSIS Beyond Parallel · Nuclear Threat Initiative",
    notes:
      "Watches both publishers for new or silently revised analysis, tags each item against our map topics (missile-silo, dprk, plarf …) and keeps only relevant items in D1.",
    status: "shipped",
    ingest: "live-poll",
  },
  {
    layerId: "basemap-openfreemap-liberty",
    source: "OpenFreeMap Liberty (MapLibre)",
    url: "https://tiles.openfreemap.org/styles/liberty",
    cadence: "Vector style CDN",
    attribution: "© OpenFreeMap · © OpenMapTiles · © OpenStreetMap contributors",
    notes:
      "Nav 「지형」 basemap — MapLibre-compatible OSM vector style with DEM (not satellite raster).",
    status: "shipped",
    ingest: "mapped-existing",
  },
  {
    layerId: "basemap-aws-terrarium",
    source: "AWS Terrain Tiles (Terrarium)",
    url: "https://registry.opendata.aws/terrain-tiles/",
    cadence: "Static DEM tiles",
    attribution: "Elevation © AWS Terrain Tiles (Terrarium)",
    notes: "MapLibre setTerrain DEM for intel/terrain exaggeration.",
    status: "shipped",
    ingest: "mapped-existing",
  },
  {
    layerId: "basemap-openfreemap-buildings",
    source: "OpenFreeMap",
    url: "https://openfreemap.org/",
    cadence: "Vector tiles",
    attribution: "© OpenFreeMap · © OpenStreetMap contributors",
    notes: "3D building fill-extrusion in 「지형」 mode at zoom ≥ 14.",
    status: "shipped",
    ingest: "mapped-existing",
  },
  {
    layerId: "ai-data-centers",
    source: "Local build + Wikidata SPARQL",
    url: "/api/layers/ai-data-centers",
    cadence: "4 hours",
    attribution: "Wikidata (CC0) / OpenStreetMap contributors (ODbL)",
    notes:
      "AI/cloud data center clusters from Wikidata entities and OSM facilities. Deterministic confidence and importance scoring. Clusters merge nearby sites within 50 km.",
    status: "shipped",
    ingest: "cached-api",
  },
  {
    layerId: "trade-routes",
    source: "Static build",
    url: "/data/{profile}/shipping-lanes.json",
    cadence: "Project versioned",
    attribution: "IMO / public datasets",
    notes: "Major global maritime trade routes (mapped to shipping-lanes).",
    status: "shipped",
    ingest: "mapped-existing",
  },
  {
    layerId: "logistics-risk",
    source: "IMF PortWatch (IMF/Oxford) · curated choke atlas",
    url: "/api/portwatch",
    cadence: "PortWatch weekly (Tue); atlas project-versioned",
    attribution: "Chokepoint transits: IMF PortWatch (IMF/Oxford)",
    notes:
      "Maritime chokepoints (Suez, Hormuz, Malacca, etc.). B-grade transit stress from IMF PortWatch daily volumes (7d vs 30d baseline); A-grade from UKMTO. Oil volatility (C) not connected. Hover/click shows LogisticsStressCard.",
    status: "shipped",
    ingest: "cached-api",
  },
  {
    layerId: "critical-nodes",
    source: "Critical Node Atlas (EkoA/chokepoints-project)",
    url: "src/data/vendor/chokepoints-nodes.json",
    cadence: "Project versioned (upstream MIT)",
    attribution: "Critical Node Atlas · MIT License",
    notes:
      "31 strategic chokepoints across maritime, cables, energy, financial, and tech layers. Shared by conflict and economy modes.",
    status: "shipped",
    ingest: "static-build",
  },
  {
    layerId: "oil-pipelines",
    source: "Global Energy Monitor (GEM)",
    url: "/data/{profile}/oil-pipelines.json",
    cadence: "Static build (GEM 2026-06)",
    attribution: "Global Energy Monitor (CC BY 4.0)",
    notes: "Oil and NGL pipeline segments from GEM GOIT tracker.",
    status: "shipped",
    ingest: "static-build",
  },
  {
    layerId: "gas-pipelines",
    source: "Global Energy Monitor (GEM)",
    url: "/data/{profile}/gas-pipelines.json",
    cadence: "Static build (GEM 2025-11)",
    attribution: "Global Energy Monitor (CC BY 4.0)",
    notes: "Gas transmission pipelines from GEM GGIT tracker.",
    status: "shipped",
    ingest: "static-build",
  },
  {
    layerId: "lng-terminals",
    source: "Global Energy Monitor (GEM)",
    url: "/data/{profile}/lng-terminals.json",
    cadence: "Static build (GEM 2025-09)",
    attribution: "Global Energy Monitor (CC BY 4.0)",
    notes: "LNG import/export terminal points from GEM GGIT.",
    status: "shipped",
    ingest: "static-build",
  },
  {
    layerId: "subsea-pipelines",
    source: "GEM offshore + EMODnet Human Activities",
    url: "/data/{profile}/subsea-pipelines.json",
    cadence: "Static build (GEM keywords + EMODnet WFS)",
    attribution:
      "Global Energy Monitor (CC BY 4.0); EMODnet Human Activities (European Commission)",
    notes:
      "Worldwide offshore/subsea oil·gas from GEM name/location heuristics, plus European seas from EMODnet WFS. Zoomed-in OSM underwater merges client-side.",
    status: "shipped",
    ingest: "static-build",
  },
  {
    layerId: "pipelines-osm",
    source: "OpenStreetMap (Overpass)",
    url: "/api/pipelines-osm",
    cadence: "On zoom (regional+), 1h cache",
    attribution: "© OpenStreetMap contributors (ODbL)",
    notes:
      "Viewport Overpass: man_made=pipeline (substance oil|gas|petroleum) and location=underwater|offshore|seabed. Merged with GEM/EMODnet when zoomed in.",
    status: "shipped",
    ingest: "cached-api",
  },
  {
    layerId: "economic-centers",
    source: "Local build + World Bank context",
    url: "/api/layers/economic-centers",
    cadence: "4 hours",
    attribution:
      "Wikidata (CC0) / OpenStreetMap contributors (ODbL) / World Bank Open Data (CC BY 4.0)",
    notes:
      "Major global economic hubs scored by finance infrastructure, trade gateway presence, urban scale, and country GDP.",
    status: "shipped",
    ingest: "cached-api",
  },
  {
    layerId: "world-stats",
    source: "Statistics of the World API",
    url: "/api/world-stats/countries",
    cadence: "1 hour cache (API Pro)",
    attribution: "Statistics of the World · World Bank WDI / IMF (provider terms apply)",
    notes:
      "Country GDP·population·trade·defense·inflation·growth cards for econ insight parchment and region panel. History shock + peer compare. Proxied with STATSOFTHEWORLD_API_KEY. Routes: /macro, /market-lamp, /compare, /rankings, /history. Bulk CSV: statisticsoftheworld.com/data.",
    status: "shipped",
    ingest: "cached-api",
  },
  {
    layerId: "critical-minerals",
    source: "Static build (mapped to resources)",
    url: "/data/{profile}/resources.json",
    cadence: "Project versioned",
    attribution: "USGS / public datasets",
    notes: "Key critical mineral deposits and processing sites (mapped to resources).",
    status: "shipped",
    ingest: "mapped-existing",
  },
  {
    layerId: "resource-deposits",
    source: "Curated strategic deposit footprints",
    url: "/data/{profile}/resource-deposits.json",
    cadence: "Static build (scripts/build-resource-deposits.js)",
    attribution: "Conflict View curated outlines (approximate extents)",
    notes:
      "Irregular Polygon footprints for major lithium/REE/uranium/titanium/copper belts. Not cadastral geology — thematic map extents. Shown with showResources.",
    status: "shipped",
    ingest: "static-build",
  },
  {
    layerId: "internet-exchanges",
    source: "Static build",
    url: "/data/{profile}/internet-exchanges.json",
    cadence: "Project versioned",
    attribution: "PeeringDB / public",
    notes: "Internet exchange points (IXPs).",
    status: "shipped",
    ingest: "static-build",
  },
  {
    layerId: "sanctions-entities",
    source: "OFAC SDN + UN + EU + UK",
    url: "/api/layers/sanctions-entities",
    cadence: "Daily (24h cache)",
    attribution: "US Treasury OFAC / UN Security Council / EU / UK Gov",
    notes:
      "Sanctioned individuals, organizations, vessels, aircraft from official bulk downloads with hybrid live-fetch + snapshot fallback.",
    status: "shipped",
    ingest: "cached-api",
  },
  {
    layerId: "refugee-camps",
    source: "Static build",
    url: "/data/{profile}/refugee-camps.json",
    cadence: "Project versioned",
    attribution: "UNHCR / public datasets",
    notes: "Major UNHCR-registered refugee settlements and camps.",
    status: "shipped",
    ingest: "static-build",
  },
  {
    layerId: "arms-embargo-zones",
    source: "Official lists · local build",
    url: "/api/layers/arms-embargo-zones",
    cadence: "Daily (24h cache)",
    attribution: "UN / EU / UK / US + Wikidata",
    notes:
      "Country-level arms embargo zones from official sources with Wikidata SPARQL fallback.",
    status: "shipped",
    ingest: "cached-api",
  },
  {
    layerId: "news-economy-rss",
    source: "Reuters / WSJ / CNBC / FT / Google News",
    url: "/api/news-stream?packages=geo-trader",
    cadence: "90s cache",
    attribution: "Each outlet RSS terms",
    notes:
      "Major-industry & company headlines for geo-trader: Big Tech/AI, semis (Nvidia·TSMC·ASML), EV/batteries, oil majors, shipping lines, plus market wires. Fetched via ALL_ECON_FEEDS.",
    status: "shipped",
    ingest: "live-poll",
  },
  {
    layerId: "telegram-osint",
    source: "IRONSIGHT (Nobler Works)",
    url: "/api/telegram-alerts",
    cadence: "Embed scrape · sync on demand",
    attribution: "Copyright (c) 2026 Nobler Works · MIT License",
    notes:
      "Public Telegram channel catalog derived from IRONSIGHT (MIT). Post content belongs to channel operators; viewer-only, not in LLM pipeline. See src/lib/licensing/ironsightPolicy.ts.",
    status: "shipped",
    ingest: "cached-api",
  },
  {
    layerId: "app-data",
    source: "Natural Earth + GDELT build",
    url: "/api/data-stream?file=app-data.json",
    cadence: "Static build · stream on demand",
    attribution: "Natural Earth · GDELT",
    notes:
      "Manifest app-data.json + countries/disputes/places chunks. First paint loads countries+disputes only; places.json deferred. gzip: npm run data:compress.",
    status: "shipped",
    ingest: "static-build",
  },
  {
    layerId: "dispute-zones-me",
    source: "IRONSIGHT regionBoxes → disputes.json → D1 hatch",
    url: "/api/render/dispute-paths",
    cadence: "Build / Cron warm · toggle on-demand D1",
    attribution: "Copyright (c) 2026 Nobler Works · MIT License (IRONSIGHT reference)",
    notes:
      "Middle East combat/tension boxes (IRONSIGHT iran-israel) merged into disputes.json. Hatch precomputed to D1 `dispute_hatch_paths`; client fetches on war/diplomatic toggle only.",
    status: "shipped",
    ingest: "cached-api",
  },
  {
    layerId: "viina-ukraine-control",
    source: "VIINA → D1 hatch snapshot",
    url: "/api/render/ukraine-control-paths",
    cadence: "Build / Cron warm · toggle on-demand D1",
    attribution: "VIINA · Open Database License (ODbL) v1.0",
    notes:
      "Ukraine control hatch precomputed (`ukraine:hatch:build`) into D1. Globe toggles fetch snapshot paths only — no client geometry hatch. VIINA raw stays private.",
    status: "shipped",
    ingest: "cached-api",
  },
  {
    layerId: "korea-missile-incidents",
    source: "GDELT live · DPRK missile dens",
    url: "/api/gdelt + src/data/koreaMissileIncidentsSeed.ts",
    cadence: "Live GDELT · layer toggle",
    attribution: "GDELT · open reporting / known launch anchors",
    notes:
      "주황 네온 점+물결. 상시 시드가 아니라 최신(24h) 미사일·발사 속보가 있을 때만 점등. 탄착군 미확정 — 발생 좌표 기준. 실시간 궤적·탄착은 우크라 NEPTUN.",
    status: "shipped",
    ingest: "live-api",
  },
  {
    layerId: "ukraine-strikes-russia",
    source: "GDELT live · 러시아 피격지 앵커",
    url: "/api/gdelt + src/data/russiaStrikeIncidentsSeed.ts",
    cadence: "Live GDELT · layer toggle",
    attribution: "GDELT · reported strikes on Russian targets (unverified)",
    notes:
      "우크라이나 → 러시아(및 점령지) 타격. 러시아는 공식 실시간 방공 경보를 공개하지 않아 궤적·탄착 불가 — 자주 피격되는 지점(벨고로드·쿠르스크·엥겔스·세바스토폴·정유소 등) 앵커에 최신(24h) GDELT 속보가 러시아 표적 지명과 함께 있을 때만 점등. 모두 「보도·미확인」. NEPTUN(우크라로 오는 위협)의 반대 방향.",
    status: "shipped",
    ingest: "live-api",
  },
  {
    layerId: "china-theater-incidents",
    source: "GDELT live · China theater dens (dyad layers)",
    url: "/api/gdelt + src/data/chinaTheaterIncidentsSeed.ts",
    cadence: "Live GDELT · layer toggles",
    attribution: "GDELT · theater dens for China↔Taiwan / Japan / Philippines / US↔China",
    notes:
      "빨간 네온 점 + 물방울 리플. 시드 앵커는 매칭용 — 최신(24h) GDELT 속보가 앵커 근처에 있을 때만 사건 좌표에 표시.",
    status: "shipped",
    ingest: "live-api",
  },
  {
    layerId: "hapi-conflict-casualties",
    source: "ACLED via HDX HAPI · conflict-events (political_violence fatalities)",
    url: "https://hapi.humdata.org/api/v2/coordination-context/conflict-events → /api/hapi-conflict-casualties",
    cadence: "Live HAPI fetch · ~30m cache · 4-month lookback",
    attribution:
      "Armed Conflict Location & Event Data Project (ACLED) · HDX HAPI · OCHA HDX · www.acleddata.com",
    notes:
      "원천: ACLED. 배포/질의: OCHA HDX HAPI conflict-events. Geopolitics: Ukraine frontline oblasts + Gaza/south Lebanon fatalities; Iran (IRN) admin1 events/fatalities; China/Taiwan political_violence event dens (often 0 fatalities). No wounded field. Docs: https://hapi.humdata.org/docs · Dataset: https://data.humdata.org/dataset/hdx-hapi-conflict-event · ACLED attribution: https://acleddata.com/attributionpolicy",
    status: "shipped",
    ingest: "cached-api",
  },
  {
    layerId: "nuclear-warheads",
    source: "Our World in Data — Nuclear warhead stockpiles",
    url: "https://ourworldindata.org/grapher/nuclear-warhead-stockpiles-lines",
    cadence: "Annual (OWID/FAS/SIPRI) · static seed",
    attribution: "Our World in Data · FAS Nuclear Notebook / SIPRI",
    notes:
      "각국 좌표 위 ICBM 아이콘 + 최신(2026) 핵탄두 보유 수. 보유 9개국(러·미·중·프·영·인·파·이스라엘·북한)만 표시, 폐기국(남아공)·세계 합계 제외.",
    status: "shipped",
    ingest: "static-build",
  },
  {
    layerId: "mediazona-casualties",
    source: "Mediazona × BBC (KIA) · CSIS estimate (WIA)",
    url: "/api/mediazona-casualties",
    cadence: "Homepage scrape · 1h cache · Kaggle panel seed fallback",
    attribution: "Mediazona · BBC Russian Service · CSIS (WIA est.) · Meduza",
    notes:
      "Reference API retained. Globe overlay now prefers HAPI active-front fatalities; Mediazona remains named RU KIA lower bound for methodology.",
    status: "shipped",
    ingest: "cached-api",
  },
  {
    layerId: "living-conflict-taiwan",
    source: "GDELT Doc 2.0 (query_tag=taiwan-tension) · optional Telegram OSINT",
    url: "/api/living-conflict/taiwan-strait",
    cadence: "Cron heuristic curate · daily · seed baseline always available",
    attribution: "GDELT Project · Telegram public channels (when available)",
    notes:
      "진행형 대만해협 타임라인. LLM 없이 점수·시간 상위 헤드라인을 1~2줄로 압축. 「자동 요약 · 오보 가능」 고지. 수동 검수는 시드/JSON 덮어쓰기.",
    status: "shipped",
    ingest: "cached-api",
  },
];

export function getSourceNote(layerId: string): NewsLayerSourceNote | undefined {
  return NEWS_LAYER_SOURCE_CATALOG.find((note) => note.layerId === layerId);
}

/** attribution · cadence caption for UI source lines */
export function catalogCaption(layerId: string): string {
  const note = getSourceNote(layerId);
  if (!note) return "";
  return `${note.attribution} · ${note.cadence}`;
}
