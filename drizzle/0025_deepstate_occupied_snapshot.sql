CREATE TABLE IF NOT EXISTS `deepstate_occupied_snapshots` (
	`cache_key` text PRIMARY KEY NOT NULL,
	`payload_json` text NOT NULL,
	`feature_count` integer DEFAULT 0 NOT NULL,
	`fetched_at` text NOT NULL,
	`source` text,
	`deepstate_id` integer,
	`ingested_at` text DEFAULT (datetime('now')) NOT NULL
);
