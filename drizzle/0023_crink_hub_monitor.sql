-- CRINK hub monitor: geo + thumb columns on reference_monitor_items
ALTER TABLE reference_monitor_items ADD COLUMN hub TEXT;
ALTER TABLE reference_monitor_items ADD COLUMN place_id TEXT;
ALTER TABLE reference_monitor_items ADD COLUMN lat REAL;
ALTER TABLE reference_monitor_items ADD COLUMN lng REAL;
ALTER TABLE reference_monitor_items ADD COLUMN image_url TEXT;
ALTER TABLE reference_monitor_items ADD COLUMN thumb_credit TEXT;

CREATE INDEX IF NOT EXISTS idx_reference_monitor_hub
  ON reference_monitor_items (hub, published_at);
