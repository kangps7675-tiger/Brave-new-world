-- 공식 문서 제목·요약의 한국어/영어 번역(워커가 새 문서를 저장한 뒤 채운다). 빈 문자열 = 아직 없음, 번역 시도 횟수는 3번까지만.
ALTER TABLE official_doc_feed ADD COLUMN title_ko TEXT NOT NULL DEFAULT '';
ALTER TABLE official_doc_feed ADD COLUMN title_en TEXT NOT NULL DEFAULT '';
ALTER TABLE official_doc_feed ADD COLUMN summary_ko TEXT NOT NULL DEFAULT '';
ALTER TABLE official_doc_feed ADD COLUMN summary_en TEXT NOT NULL DEFAULT '';
ALTER TABLE official_doc_feed ADD COLUMN translate_tries INTEGER NOT NULL DEFAULT 0;
