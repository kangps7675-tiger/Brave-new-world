CREATE TABLE IF NOT EXISTS `us_carrier_snapshots` (
	`cache_key` text PRIMARY KEY NOT NULL,
	`payload_json` text NOT NULL,
	`carrier_count` integer DEFAULT 0 NOT NULL,
	`updated_count` integer DEFAULT 0 NOT NULL,
	`fetched_at` text NOT NULL,
	`source` text,
	`report_url` text,
	`ingested_at` text DEFAULT (datetime('now')) NOT NULL
);
