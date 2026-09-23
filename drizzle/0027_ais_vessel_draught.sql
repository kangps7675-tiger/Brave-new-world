-- ShipStaticData 기반 흘수(설계 상한)·목적지·선형 필드 추가
-- DWT 가중 물동량 프록시, 목적지 변경률 지표에 사용
ALTER TABLE ais_vessels ADD COLUMN draught REAL;
ALTER TABLE ais_vessels ADD COLUMN destination TEXT;
ALTER TABLE ais_vessels ADD COLUMN length_m REAL;
ALTER TABLE ais_vessels ADD COLUMN beam_m REAL;
