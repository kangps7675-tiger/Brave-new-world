-- UKMTO 사건을 우리가 처음 확인한 시각 (ingested_at은 폴링마다 덮어써서 '마지막 확인'이 된다)
ALTER TABLE ukmto_incidents ADD COLUMN first_seen_at TEXT;
