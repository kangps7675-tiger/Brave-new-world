-- 웹 푸시 구독 (PWA). endpoint가 고유키 — 만료/410 시 삭제.
CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint TEXT NOT NULL PRIMARY KEY,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  lang TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_updated
  ON push_subscriptions (updated_at);
