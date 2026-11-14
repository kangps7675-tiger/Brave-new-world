-- 공식 문서 원본 파일(PDF) 보관과 웹 아카이브 보관본 주소.
-- file_key = R2(DATA_BUCKET)의 객체 키. 빈 문자열 = 아직 없음. file_tries 99 = 이 문서에는 받을 PDF가 없음(더 시도하지 않는다).
ALTER TABLE official_doc_feed ADD COLUMN file_key TEXT NOT NULL DEFAULT '';
ALTER TABLE official_doc_feed ADD COLUMN file_type TEXT NOT NULL DEFAULT '';
ALTER TABLE official_doc_feed ADD COLUMN file_bytes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE official_doc_feed ADD COLUMN file_sha256 TEXT NOT NULL DEFAULT '';
ALTER TABLE official_doc_feed ADD COLUMN file_fetched_at TEXT NOT NULL DEFAULT '';
ALTER TABLE official_doc_feed ADD COLUMN file_source_url TEXT NOT NULL DEFAULT '';
ALTER TABLE official_doc_feed ADD COLUMN file_tries INTEGER NOT NULL DEFAULT 0;
ALTER TABLE official_doc_feed ADD COLUMN archive_url TEXT NOT NULL DEFAULT '';
ALTER TABLE official_doc_feed ADD COLUMN archive_tries INTEGER NOT NULL DEFAULT 0;
