-- Bunker sentiment: STABLE vs HEAD TO BUNKER (UTC day · 1 vote per device)
CREATE TABLE IF NOT EXISTS bunker_sentiment_votes (
  vote_date TEXT NOT NULL,
  device_id TEXT NOT NULL,
  pick TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (vote_date, device_id)
);

CREATE INDEX IF NOT EXISTS idx_bunker_sentiment_date
  ON bunker_sentiment_votes (vote_date);
