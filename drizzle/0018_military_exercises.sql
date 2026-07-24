CREATE TABLE IF NOT EXISTS military_exercises (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  actors_json TEXT NOT NULL DEFAULT '[]',
  coalition TEXT,
  theater TEXT,
  lat REAL,
  lng REAL,
  geojson TEXT,
  starts_at TEXT,
  ends_at TEXT,
  announced_at TEXT,
  confidence TEXT NOT NULL DEFAULT 'announced',
  sources_json TEXT NOT NULL DEFAULT '[]',
  rf_gap_note TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  ingested_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_military_exercises_active
  ON military_exercises (active, announced_at);

CREATE INDEX IF NOT EXISTS idx_military_exercises_theater
  ON military_exercises (theater);

CREATE INDEX IF NOT EXISTS idx_military_exercises_geo
  ON military_exercises (lat, lng);
