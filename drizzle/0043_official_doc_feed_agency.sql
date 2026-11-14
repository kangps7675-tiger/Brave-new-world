-- 공식 문서 목록에 "문서를 낸 기관" 칸 추가(연방관보처럼 한 목록에 여러 기관이 섞이는 소스용). 예: Bureau of Industry and Security
ALTER TABLE official_doc_feed ADD COLUMN agency TEXT NOT NULL DEFAULT '';
