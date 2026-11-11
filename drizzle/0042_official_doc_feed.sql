-- 공식 문서 자동 수집 목록 — 각국 정부·기구가 낸 성명·공동성명·팩트시트·회담 요약의 "새 글 알림".
-- 원문은 저장하지 않는다(제목·링크·요약 280자·읽힌 지명 태그만). 원문 스냅샷은 사람이 승인한
-- src/data/officialDocs.index.json 쪽이 따로 맡는다. id = 링크 해시.

CREATE TABLE IF NOT EXISTS official_doc_feed (
  id TEXT PRIMARY KEY NOT NULL,
  issuer_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  weight TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  published_at TEXT,
  summary TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '',
  feed TEXT NOT NULL,
  ingested_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_official_doc_feed_pub
  ON official_doc_feed (published_at);
CREATE INDEX IF NOT EXISTS idx_official_doc_feed_issuer
  ON official_doc_feed (issuer_id, published_at);

-- 폴링 스로틀용 1행 + 피드별 마지막 결과(어느 사이트가 워커에서 막히는지 보려고)
CREATE TABLE IF NOT EXISTS official_doc_poll (
  feed TEXT PRIMARY KEY NOT NULL,
  checked_at TEXT NOT NULL,
  ok INTEGER NOT NULL DEFAULT 0,
  items INTEGER NOT NULL DEFAULT 0,
  error TEXT
);
