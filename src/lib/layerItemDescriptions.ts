/** 레이어 토글 호버용 한 줄 설명 (한국어) */
export const LAYER_ITEM_DESCRIPTIONS: Partial<Record<string, string>> = {
  "city-labels": "켜면 주요 도시의 이름이 지도 위에 표시됩니다.",
  rail: "켜면 주요 철도망이 지도에 빛으로 표시됩니다.",
  ukraine: "켜면 우크라이나 전선의 점령·접촉선 상황을 볼 수 있습니다.",
  neptun:
    "켜면 우크라이나를 향하는 러시아 드론·미사일의 실제 궤적을 볼 수 있습니다.",
  "neptun-previous-trails":
    "켜면 이전에 관측된 드론·미사일 궤적 잔상을 함께 볼 수 있습니다.",
  disputes: "켜면 전쟁·외교 긴장 구역을 표시합니다.",
  "war-zones": "켜면 실전투·폭격급 전쟁구역을 빨간 빗금 상자로 표시합니다.",
  "diplomatic-tension": "켜면 외교적 긴장구역을 주황 빗금 상자로 표시합니다.",
  "conflict-zones":
    "켜면 분쟁+GDELT 밀도로 추정한 전쟁지역 데모(외부 AI API 없음)를 표시합니다.",
  "arms-embargo": "켜면 무기 금수 조치가 적용된 구역을 표시합니다.",
  ucdp: "켜면 무력 충돌 사건(UCDP) 위치를 점으로 표시합니다.",
  "gdelt-war": "켜면 전투·군사 충돌 관련 뉴스 위치를 표시합니다.",
  "gdelt-diplomatic": "켜면 외교·회담 관련 뉴스 위치를 표시합니다.",
  "gdelt-alliance": "켜면 서방 동맹 마찰·IRN·중·러·북 축 관계 뉴스 위치를 표시합니다.",
  "gdelt-protest": "켜면 시위·사회 불안 관련 뉴스 위치를 표시합니다.",
  "axis-network":
    "켜면 이란·중국·러시아·북한 중심 외교·군수·하이브리드 관계망(스포크 포함)을 호로 표시합니다.",
  "telegram-osint": "켜면 공개 텔레그램 채널의 전장·전선 소식을 표시합니다.",
  "tzeva-adom": "켜면 이스라엘 로켓·공습 경보(체바 아돔) 발생 지역을 표시합니다.",
  "oil-pipelines": "켜면 주요 송유관 노선을 표시합니다.",
  "gas-pipelines": "켜면 주요 천연가스관 노선을 표시합니다.",
  "lng-terminals": "켜면 LNG(액화천연가스) 수출입 터미널 위치를 표시합니다.",
  "gem-coal-plants": "켜면 석탄 발전소를 표시합니다.",
  "gem-coal-mines": "켜면 석탄 광산을 표시합니다.",
  "gem-coal-terminals": "켜면 석탄 터미널을 표시합니다.",
  "gem-nuclear": "켜면 원자력 발전소를 표시합니다.",
  "gem-solar": "켜면 태양광 발전 단지를 표시합니다.",
  "gem-wind": "켜면 풍력 발전 단지를 표시합니다.",
  "gem-hydro": "켜면 수력 발전소를 표시합니다.",
  "gem-geothermal": "켜면 지열 발전소를 표시합니다.",
  "gem-bioenergy": "켜면 바이오에너지 발전 시설을 표시합니다.",
  "gem-oil-gas-plants": "켜면 석유·가스 화력 발전소를 표시합니다.",
  "gem-oil-gas-extraction": "켜면 석유·가스 채굴 지역을 표시합니다.",
  "gem-iron-ore": "켜면 철광산을 표시합니다.",
  "gem-cement": "켜면 시멘트 공장을 표시합니다.",
  "gem-steel": "켜면 철강 공장을 표시합니다.",
  "gem-chemicals": "켜면 화학 공장을 표시합니다.",
  resources: "켜면 주요 천연자원·광물 관련 거점을 표시합니다.",
  nuclear: "켜면 원자력 발전소·관련 시설 위치를 표시합니다.",
  shipping: "켜면 주요 해상 항로를 표시합니다.",
  cables: "켜면 주요 해저 통신 케이블 경로를 표시합니다.",
  tunnels:
    "켜면 주요 해저터널(유로터널·세이칸 등)을 표시합니다. 켜는 순간에만 조회합니다.",
  airports: "켜면 주요 공항 위치를 표시합니다.",
  ports: "켜면 주요 항구 위치를 표시합니다.",
  ixp: "켜면 인터넷 교환점(IXP) 위치를 표시합니다.",
  "logistics-risk": "켜면 해협·운하 등 해상 요충과 물류 거점을 표시합니다.",
  "critical-nodes":
    "켜면 해상·케이블·에너지·금융 등 핵심 인프라 병목을 표시합니다.",
  ais: "켜면 AIS 선박을 표시합니다. 지정학=군용 함정, 지경학=민간 화물·탱커·여객선.",
  "military-bases": "켜면 주요 군사기지 위치를 표시합니다.",
  "air-traffic":
    "켜면 민간 항공기 운항(ADS-B)을 표시합니다. 군용은 제외하며 지경학 모드 경제활동 레이어입니다.",
  "military-air":
    "켜면 군사 항공기(ADS-B) 실시간 항적을 기종별 실루엣으로 표시합니다. 클릭하면 상세.",
  intel: "켜면 정찰·감시 등 정보 수집 거점을 표시합니다.",
  refugee: "켜면 난민 캠프·대규모 인구 이동 관련 지점을 표시합니다.",
  firms:
    "켜면 NASA FIRMS 위성 열감지를 전장 권역(우크·중동·홍해·대만·한반도·남중국해 등) 주변만 표시합니다. 전쟁 뉴스 근처는 폭격·화재 추정으로 강조됩니다.",
  cyber: "켜면 사이버 공격·침해 관련 사건 위치를 표시합니다.",
  election: "켜면 선거·정치 리스크와 관련된 사건 위치를 표시합니다.",
  space: "켜면 우주 발사·관련 활동 위치를 표시합니다.",
  economic: "켜면 주요 경제·금융 중심지 위치를 표시합니다.",
  "ai-dc": "켜면 AI·데이터센터 관련 거점 위치를 표시합니다.",
  "east-asia-neon":
    "켜면 동아시아 대치·발사 지점(중국 주변 해역·북한 시험)을 표시합니다. 탄착은 표시하지 않습니다.",
  "china-taiwan-incidents": "켜면 중국–대만 대치·마찰 지점을 표시합니다.",
  "china-japan-incidents": "켜면 중국–일본 대치·마찰 지점을 표시합니다.",
  "china-philippines-incidents": "켜면 중국–필리핀 남중국해 해상 충돌 지점을 표시합니다.",
  "us-china-incidents": "켜면 미국–중국 군사 마찰 지점을 표시합니다.",
  "nk-missile-tests": "켜면 북한 미사일·무기 시험의 발사·실험 위치를 표시합니다.",
  "east-asia-adiz": "켜면 동아시아 방공식별구역(ADIZ)을 표시합니다.",
  "island-chains":
    "켜면 중국 도련선(적색 점선)과 미군 인도·태평양 방어선(청색 실선), 대만 화약고 펄스를 표시합니다. 기지에 마우스를 올리면 탐지 반경이 펼쳐집니다.",
  "newfeeds-iran": "켜면 이란·중동 공격 관련 보도 지점을 지도에 표시합니다.",
  "gdelt-ocean": "켜면 대양·해상 지정학 경쟁 관련 뉴스 위치를 표시합니다.",
  "energy-pipelines": "켜면 원유·가스 수송망(송유관·가스관·LNG)을 표시합니다.",
  "gem-resources": "켜면 발전·채굴·산업 시설을 자원 종류별로 표시합니다.",
  "energy-other": "켜면 광물 매장지와 원자력 시설을 표시합니다.",
  sanctions: "켜면 제재 대상 국가·기업과 관련된 지점을 표시합니다.",
};

export function getLayerItemDescription(itemId: string): string | undefined {
  return LAYER_ITEM_DESCRIPTIONS[itemId];
}
