-- UKMTO (Royal Navy) merchant vessel attack / hijack / suspicious activity snapshots
CREATE TABLE IF NOT EXISTS ukmto_incidents (
  id TEXT PRIMARY KEY NOT NULL,
  incident_number INTEGER,
  incident_type_name TEXT NOT NULL,
  incident_type_level INTEGER,
  pin_colour TEXT,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  region TEXT,
  place TEXT,
  vessel_name TEXT,
  vessel_type TEXT,
  vessel_under_pirate_control INTEGER NOT NULL DEFAULT 0,
  crew_held INTEGER,
  detail TEXT,
  utc_date_of_incident TEXT,
  utc_date_created TEXT,
  ingested_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ukmto_geo
  ON ukmto_incidents (lat, lng);

CREATE INDEX IF NOT EXISTS idx_ukmto_date
  ON ukmto_incidents (utc_date_of_incident);
