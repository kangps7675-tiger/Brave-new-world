-- NAVAREA in-force maritime warning geometries (JHOD / NGA TXT → snapshot replace)
-- id includes region prefix (e.g. XI-26-0330, IV-26-0695) to avoid collisions
CREATE TABLE IF NOT EXISTS navarea_features (
  id TEXT PRIMARY KEY NOT NULL,
  region TEXT NOT NULL,
  source TEXT NOT NULL,
  warning_date TEXT NOT NULL,
  area_hint TEXT,
  description TEXT NOT NULL,
  geometry_type TEXT NOT NULL,
  geojson TEXT NOT NULL,
  radius_nm REAL,
  lat REAL,
  lng REAL,
  ingested_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_navarea_region
  ON navarea_features (region);

CREATE INDEX IF NOT EXISTS idx_navarea_date
  ON navarea_features (warning_date);

CREATE INDEX IF NOT EXISTS idx_navarea_geo
  ON navarea_features (lat, lng);
