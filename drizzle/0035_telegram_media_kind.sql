-- 텔레그램 게시물 미디어 종류 (video | photo | none) — 영상 임베드 목록용
ALTER TABLE telegram_alerts ADD COLUMN media_kind TEXT;
CREATE INDEX IF NOT EXISTS idx_tg_media ON telegram_alerts (media_kind, received_at);
