-- UKMTO 신규 피습 푸시를 이미 보낸 사건 (동시 크론 이중 발송 방지)
CREATE TABLE IF NOT EXISTS ukmto_push_sent (
  id TEXT PRIMARY KEY NOT NULL,
  sent_at TEXT NOT NULL
);
