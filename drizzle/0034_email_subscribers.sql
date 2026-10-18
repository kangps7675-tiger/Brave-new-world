-- 이메일 다이제스트 구독 (확인 전 pending, 확인 후 active, 해지 unsubscribed)
-- confirm_token 은 확인 뒤 NULL. unsub_token 은 매 메일의 수신 해지 링크에 쓴다.

CREATE TABLE IF NOT EXISTS email_subscribers (
  email TEXT PRIMARY KEY NOT NULL,
  lang TEXT NOT NULL DEFAULT 'ko',
  status TEXT NOT NULL DEFAULT 'pending',
  confirm_token TEXT,
  unsub_token TEXT NOT NULL,
  created_at TEXT NOT NULL,
  confirmed_at TEXT,
  unsubscribed_at TEXT,
  confirm_sent_at TEXT,
  consent_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_sub_confirm ON email_subscribers (confirm_token);
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_sub_unsub ON email_subscribers (unsub_token);
CREATE INDEX IF NOT EXISTS idx_email_sub_status ON email_subscribers (status);

-- 한국시간 날짜당 한 번. finished_at 이 없으면 10분 크론이 다시 시도한다.
CREATE TABLE IF NOT EXISTS email_digest_runs (
  window_date TEXT PRIMARY KEY NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  incident_count INTEGER NOT NULL DEFAULT 0,
  quote_count INTEGER NOT NULL DEFAULT 0,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  sent INTEGER NOT NULL DEFAULT 0,
  error TEXT
);
