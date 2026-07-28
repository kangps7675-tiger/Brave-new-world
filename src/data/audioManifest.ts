/**
 * 멋진 신세계 — 사운드 지휘소(Manifest)
 *
 * Freesound HQ mp3는 `/api/sound-stream` 프록시. `freesoundId`가 있으면 텍스트 검색보다 우선
 * (오매칭·잡음 차단). ID는 페이지 설명·태그를 기준으로 큐레이션한 값.
 *
 * ★ HARD RULES
 * - 폭음/폭격/폭발: 먼 대형 폭탄의 둔탁한 "쿵" (deep/muffled/thud) — 근접 crack·cinematic 금지
 * - 경보: 공습 사이렌은 로컬 Mega Siren 고정
 * - 경제/긴장/부가: 전부 freesoundId 고정 (검색 폴백만 보조)
 * - 볼륨 낮게 + 줌 연동 cap (원샷 ≤0.22~0.55, 앰비언트 ≤0.22)
 */

export type AudioCategory = "conflict" | "economy" | "ui" | "ambient" | "music";

export interface AudioEventDef {
  eventId: string;
  /** Freesound 텍스트 검색 폴백 (localSrc·freesoundId 실패 시) */
  freesoundQuery: string;
  /** 검증된 Freesound 사운드 ID — localSrc 없을 때 검색 스킵 */
  freesoundId?: number;
  /**
   * 로컬 정적 파일 (`public/` 기준). 있으면 Freesound보다 절대 우선.
   * 공습경보·전투 원샷처럼 오매칭 비용이 큰 이벤트는 반드시 로컬 고정.
   */
  localSrc?: string;
  volume: number;
  loop?: boolean;
  category: AudioCategory;
  /** 큐레이션 메모 (감사·유지보수) */
  note?: string;
}

export const AUDIO_MANIFEST = {
  // ── Conflict: 경보 · 충격 ────────────────────────────────────────

  /** 이스라엘 적색 경보 — 다성 중형 공습사이렌 (Chrysler Victory 계열, 묵직) */
  "tzeva-red-alert": {
    eventId: "tzeva-red-alert",
    freesoundQuery: "heavy air raid siren",
    localSrc: "/audio/air-attack-siren.mp3",
    volume: 0.88,
    category: "conflict",
    note: "로컬 Mega Siren (3-tone) · Freesound 미사용",
  },

  /** 이스라엘 경보 해제 — 동일 사이렌을 짧게·작게 */
  "tzeva-all-clear": {
    eventId: "tzeva-all-clear",
    freesoundQuery: "heavy air raid siren",
    localSrc: "/audio/air-attack-siren.mp3",
    volume: 0.34,
    category: "conflict",
    note: "해제용 · 적색보다 작게 · 로컬 고정",
  },

  /**
   * NEPTUN 탄착(드론·미사일·KAB 등) — 원거리 미사일 요격/폭파
   * https://freesound.org/s/741267/ · the_yura · CC0
   */
  "neptun-impact": {
    eventId: "neptun-impact",
    freesoundQuery: "distant missile explosion war",
    freesoundId: 741267,
    volume: 0.78,
    category: "conflict",
    note: "FS#741267 Destruction of the missile · CC0 · 원거리 폭발 · 전선 FPV 연쇄 크게",
  },

  /** Shahed/UAV — qubodup DJI 호버 (짧은 프로펠러) */
  "neptun-uav-flyby": {
    eventId: "neptun-uav-flyby",
    freesoundQuery: "drone propeller buzz soft",
    freesoundId: 854382,
    volume: 0.24,
    category: "conflict",
    note: "FS#854382 qubodup · UAV 호버/프로펠러",
  },

  /**
   * 전선 FPV/UAV 통과 — 파도형 음량 후 하드컷→폭발
   * https://freesound.org/s/537598/ · PostProdDog · CC0
   */
  "frontline-fpv-drone": {
    eventId: "frontline-fpv-drone",
    freesoundQuery: "uav unmanned surveillance drone propeller",
    freesoundId: 537598,
    volume: 0.12,
    category: "conflict",
    note: "FS#537598 PostProdDog UAV unmanned surveillance drone 2 · CC0 · 풀볼륨 비행→하드스톱→즉시 폭발",
  },

  /**
   * FPV 하드컷 직후 박격포/폭발 bang (짧게, 조금 크게)
   * https://freesound.org/s/840902/ · klankbeeld · CC BY 4.0
   */
  "frontline-fpv-detonation": {
    eventId: "frontline-fpv-detonation",
    freesoundQuery: "mortar bomb fireworks bang echo",
    freesoundId: 840902,
    volume: 0.82,
    category: "conflict",
    note: "FS#840902 klankbeeld mortar bomb · BY 4.0 · FPV 하드스톱 직후 bang · 크게",
  },

  /**
   * 탄도 — 진입 whoosh + 폭발
   * https://freesound.org/s/719426/ · zapsplat.com · CC0
   */
  "neptun-ballistic": {
    eventId: "neptun-ballistic",
    freesoundQuery: "missile bomb incoming whoosh explosion",
    freesoundId: 719426,
    volume: 0.36,
    category: "conflict",
    note: "FS#719426 zapsplat Missile or bomb incoming whoosh and explosion · CC0",
  },

  /**
   * 우크라 공습 경보 — 동일 묵직 다성 공습사이렌
   */
  "neptun-air-alert": {
    eventId: "neptun-air-alert",
    freesoundQuery: "heavy air raid siren",
    localSrc: "/audio/air-attack-siren.mp3",
    volume: 0.86,
    category: "conflict",
    note: "로컬 Mega Siren (3-tone) · Freesound 미사용",
  },

  /**
   * A급 속보(alert 히어로) 타전 — SOS 모스 + 스태틱
   * https://freesound.org/s/395815/ · daytripper · CC BY 4.0
   */
  "hero-breaking": {
    eventId: "hero-breaking",
    freesoundQuery: "SOS Mayday Morse Code shortwave static",
    freesoundId: 395815,
    volume: 0.34,
    category: "conflict",
    note: "FS#395815 daytripper SOS Mayday Morse · BY 4.0 · A급 속보 타전",
  },

  /**
   * 속보·양피지 타전 깔개 — 어두운 드론 (모스와 겹침)
   * https://freesound.org/s/587014/ · Victor_Natas · CC BY 4.0
   */
  "breaking-dark-bed": {
    eventId: "breaking-dark-bed",
    freesoundQuery: "something dark ominous drone",
    freesoundId: 587014,
    volume: 0.22,
    category: "conflict",
    note: "FS#587014 Victor_Natas Something dark · BY 4.0 · 등불/양피지 속보 모스와 겹침",
  },

  /**
   * 전선 총격 — 원거리 교전 (기관총·박격포·소총 혼합).
   * https://freesound.org/s/404334/ Firefight · TheBuilder15 · CC0
   */
  "frontline-gunfire": {
    eventId: "frontline-gunfire",
    freesoundQuery: "distant machine gun firefight",
    freesoundId: 404334,
    localSrc: "/audio/combat-firefight-distant.mp3",
    volume: 0.4,
    category: "conflict",
    note: "FS#404334 TheBuilder15 Firefight · CC0 · 원거리 MG/박격포",
  },

  /**
   * 원거리 SMG 연사.
   * https://freesound.org/s/417690/ · SuperPhat · CC0
   */
  "frontline-gunfire-distant-auto": {
    eventId: "frontline-gunfire-distant-auto",
    freesoundQuery: "distant rapid fire sub machine gun",
    freesoundId: 417690,
    localSrc: "/audio/combat-mg-distant-smg.mp3",
    volume: 0.36,
    category: "conflict",
    note: "FS#417690 SuperPhat distant SMG · CC0",
  },

  /**
   * 전선 폭격
   * https://freesound.org/s/161806/ · Timbre · CC BY-NC 4.0
   */
  "frontline-bombing": {
    eventId: "frontline-bombing",
    freesoundQuery: "missile strike explosion remix",
    freesoundId: 161806,
    volume: 0.44,
    category: "conflict",
    note: "FS#161806 Timbre missile-strike remix · BY-NC · 폭격",
  },

  /**
   * 전선 포격 단발
   * https://freesound.org/s/486039/ · craigsmith · CC0
   */
  "frontline-artillery-shot": {
    eventId: "frontline-artillery-shot",
    freesoundQuery: "large guns artillery inside building",
    freesoundId: 486039,
    volume: 0.42,
    category: "conflict",
    note: "FS#486039 craigsmith Large Guns Heard from Inside Building · CC0 · 포격",
  },

  /** 다련장로켓(MLRS) 살보 */
  "frontline-mlrs": {
    eventId: "frontline-mlrs",
    freesoundQuery: "multiple rocket launcher salvo",
    localSrc: "/audio/combat-mlrs.wav",
    volume: 0.5,
    category: "conflict",
    note: "로컬 MLRS 살보 · 저빈도",
  },

  /** GDELT war — 원거리 교전 스팅 (Firefight 짧게) */
  "gdelt-war-sting": {
    eventId: "gdelt-war-sting",
    freesoundQuery: "distant machine gun firefight",
    freesoundId: 404334,
    localSrc: "/audio/combat-firefight-distant.mp3",
    volume: 0.26,
    category: "conflict",
    note: "FS#404334 · GDELT 스팅 · ~2.5s 컷",
  },

  /** GDELT protest — 먼 군중 (총성과 구분) */
  "gdelt-protest-sting": {
    eventId: "gdelt-protest-sting",
    freesoundQuery: "distant crowd protest chant",
    freesoundId: 360758,
    volume: 0.26,
    category: "conflict",
    note: "FS#360758 dnlburnett Taxi protest distant · 군중/시위",
  },

  /** 분쟁 고긴장 — 저음 긴장 rumble (한반도·일반 고긴장) */
  "dispute-tension-high": {
    eventId: "dispute-tension-high",
    freesoundQuery: "low ominous rumble tension soft loop",
    freesoundId: 593785,
    volume: 0.12,
    loop: true,
    category: "ambient",
    note: "FS#593785 steaq Ominous Rumble · 한반도/고긴장 구역",
  },

  /**
   * 대만해협 긴장 — 시계 틱 트레일러 톤
   * https://freesound.org/s/264065/ · Paul368 · CC0
   */
  "taiwan-strait-tension": {
    eventId: "taiwan-strait-tension",
    freesoundQuery: "ticking clock tension trailer",
    freesoundId: 264065,
    volume: 0.14,
    loop: true,
    category: "ambient",
    note: "FS#264065 Paul368 Ticking Clock tension · CC0 · 대만해협",
  },

  /**
   * FIRMS 폭격 추정 — 원거리 미사일/폭발
   * https://freesound.org/s/741267/ · the_yura · CC0
   */
  "firms-combat-burst": {
    eventId: "firms-combat-burst",
    freesoundQuery: "distant missile explosion war",
    freesoundId: 741267,
    volume: 0.4,
    category: "conflict",
    note: "FS#741267 Destruction of the missile · CC0 · FIRMS 전투 열감지",
  },

  /**
   * FIRMS 사격장/잔불 계열 — 큰 불 루프
   * https://freesound.org/s/612277/ · Robinhood76 · BY-NC 4.0
   */
  "firms-exercise": {
    eventId: "firms-exercise",
    freesoundQuery: "big fire burning loop",
    freesoundId: 612277,
    volume: 0.1,
    loop: true,
    category: "ambient",
    note: "FS#612277 Robinhood76 big fire loop · BY-NC",
  },

  /** 미분류 FIRMS — 먼 잔불 (자동 재생 OFF) */
  "firms-wildfire-crackle": {
    eventId: "firms-wildfire-crackle",
    freesoundQuery: "distant campfire crackle soft",
    freesoundId: 620324,
    volume: 0.07,
    category: "ambient",
    note: "FS#620324 marb7e Campfire crackling Loop · 산불/잔불",
  },

  /** Telegram OSINT — 무전기 종료 스퀠치 */
  "telegram-live-burst": {
    eventId: "telegram-live-burst",
    freesoundQuery: "radio static burst short walkie",
    freesoundId: 524205,
    volume: 0.28,
    category: "conflict",
    note: "FS#524205 · 무전 스퀠치",
  },

  /** 사이버 — 디지털 UI 글리치/에러 톤 */
  "cyber-incident": {
    eventId: "cyber-incident",
    freesoundQuery: "digital glitch alarm short",
    freesoundId: 423166,
    volume: 0.3,
    category: "conflict",
    note: "FS#423166 plasterbrain Minimalist Sci-Fi UI Error · 디지털 톤",
  },

  // ── Music (BGM) ──────────────────────────────────────────────────

  /**
   * 대시보드 배경음악 — 웅웅거리는 앰비언트 드론이 아니라 실제 멜로디/구성이 있는 트랙.
   * 상황별 ambient(전선·긴장·항모 등)와 별개 채널로 계속 흐름 — 카메라·뷰어모드가
   * 바뀌어도 끊기지 않음(SoundEffectsBridge에서 playBgm으로 한 번만 트리거).
   * 파일 미배치 — public/audio/dashboard-bgm.mp3 로 넣으면 바로 재생됨.
   */
  "dashboard-bgm": {
    eventId: "dashboard-bgm",
    freesoundQuery: "cinematic tension score no vocals loopable",
    localSrc: "/audio/dashboard-bgm.mp3",
    volume: 0.16,
    loop: true,
    category: "music",
    note: "파일 미배치 — 상업적 이용 가능한 무보컬 시네마틱 스코어(Pixabay Music 등)를 유저가 직접 소싱",
  },

  // ── Ambient ──────────────────────────────────────────────────────

  /** 전선 줌 — 먼 포격 rumble 베드 (루프) */
  "frontline-artillery-ambient": {
    eventId: "frontline-artillery-ambient",
    freesoundQuery: "distant artillery rumble soft loop",
    localSrc: "/audio/combat-frontline-bed.wav",
    volume: 0.14,
    loop: true,
    category: "ambient",
    note: "로컬 전선 rumble · 간헐 원샷과 함께",
  },

  /** 항모 갑판 */
  "carrier-deck-ambient": {
    eventId: "carrier-deck-ambient",
    freesoundQuery: "aircraft carrier flight deck ambient",
    freesoundId: 162449,
    volume: 0.14,
    loop: true,
    category: "ambient",
    note: "FS#162449 qubodup Jet launches/recoveries on carrier · 갑판 앰비언스",
  },

  // ── Economy ──────────────────────────────────────────────────────

  /** 티커 급등 — NYSE 거래소 벨 */
  "ticker-spike": {
    eventId: "ticker-spike",
    freesoundQuery: "stock exchange trading bell ring",
    freesoundId: 380490,
    volume: 0.4,
    category: "economy",
    note: "FS#380490 tahur1976 NYSEBell · 거래소 벨",
  },

  /** VIX — 시장 경고 (알람 비프)
   * https://freesound.org/s/369880/ · SpliceSound
   */
  "vix-spike": {
    eventId: "vix-spike",
    freesoundQuery: "alarm clock beep close",
    freesoundId: 369880,
    volume: 0.28,
    category: "economy",
    note: "FS#369880 SpliceSound Alarm clock beep · VIX 경고",
  },

  /** 유가 급등 · LNG 터미널 클릭 — 산업 압력/파이프 히스 (CC0) */
  "oil-spike": {
    eventId: "oil-spike",
    freesoundQuery: "steam pipe pressure release hiss short",
    freesoundId: 234782,
    volume: 0.3,
    category: "economy",
    note: "FS#234782 wubitog Steam/hiss · CL=F/BZ=F SPIKE + LNG 클릭 · CC0",
  },

  // ── Infra / mobility click oneshots ─────────────────────────────

  /** 민간기 겹침 A — 항공기 패스 */
  "aircraft-civil-pass": {
    eventId: "aircraft-civil-pass",
    freesoundQuery: "airplane flyby pass",
    freesoundId: 424831,
    volume: 0.28,
    category: "ambient",
    note: "FS#424831 sctang Airplane · CC0 · 민간기 클릭(겹침)",
  },
  /** 민간기 겹침 B — PA */
  "aircraft-civil-pa": {
    eventId: "aircraft-civil-pa",
    freesoundQuery: "airplane cabin pa announcement",
    freesoundId: 177560,
    volume: 0.2,
    category: "ambient",
    note: "FS#177560 festivus31 Airplane PA · CC0 · 민간기 클릭(겹침)",
  },
  /** 군용기 */
  "aircraft-military": {
    eventId: "aircraft-military",
    freesoundQuery: "jet engine start military",
    freesoundId: 789950,
    volume: 0.34,
    category: "conflict",
    note: "FS#789950 DerrickMckinnon Starting of jet engine · CC-BY",
  },
  /** AIS 상선 */
  "ais-merchant": {
    eventId: "ais-merchant",
    freesoundQuery: "riverside water boat ambient",
    freesoundId: 843948,
    volume: 0.26,
    category: "ambient",
    note: "FS#843948 freekit Riverside · CC-BY · AIS 상선 클릭",
  },
  /** 항모 클릭 저음 깔개 (갑판 앰비언트 아래) */
  "carrier-radio-bed": {
    eventId: "carrier-radio-bed",
    freesoundQuery: "carrier frequency radio hum",
    freesoundId: 806273,
    volume: 0.14,
    category: "ambient",
    note: "FS#806273 R2dxu Carrier frequency · CC0 · 항모 클릭 저음",
  },
  /** 군용 잠수함 */
  "mil-submarine": {
    eventId: "mil-submarine",
    freesoundQuery: "sailing vessel at sea ambient",
    freesoundId: 177036,
    volume: 0.28,
    category: "conflict",
    note: "FS#177036 Trebblofang sailing-vessel-at-sea · CC0",
  },
  /** 위장·다크플리트 */
  "disguised-vessel": {
    eventId: "disguised-vessel",
    freesoundQuery: "rescue vessel engine",
    freesoundId: 510902,
    volume: 0.26,
    category: "conflict",
    note: "FS#510902 Lydmakeren Rescue_vessel_engine · CC0",
  },
  /** 정찰위성 */
  "recon-satellite": {
    eventId: "recon-satellite",
    freesoundQuery: "NOAA satellite telemetry beep",
    freesoundId: 189860,
    volume: 0.24,
    category: "conflict",
    note: "FS#189860 saphe NOAA 19 satellite · CC-BY",
  },
  /** 공항 */
  "airport-walla": {
    eventId: "airport-walla",
    freesoundQuery: "airport terminal walla ambient",
    freesoundId: 113606,
    volume: 0.3,
    category: "ambient",
    note: "FS#113606 costaipsa WALLA_airport · CC-BY",
  },
  /** 초크포인트 */
  "chokepoint-drone": {
    eventId: "chokepoint-drone",
    freesoundQuery: "low drone tension ambient",
    freesoundId: 44823,
    volume: 0.22,
    category: "ambient",
    note: "FS#44823 tim.kahn dronnee · CC-BY",
  },
  /** 물류 허브 */
  "logistics-hub-crane": {
    eventId: "logistics-hub-crane",
    freesoundQuery: "crane ship unloading sand",
    freesoundId: 130017,
    volume: 0.3,
    category: "ambient",
    note: "FS#130017 abuurman Crane ship unloading · CC-BY",
  },
  /** 항로 */
  "shipping-lane-sea": {
    eventId: "shipping-lane-sea",
    freesoundQuery: "sea cliffs waves dramatic",
    freesoundId: 693576,
    volume: 0.24,
    category: "ambient",
    note: "FS#693576 Philip_Goddard Sea dramatics · CC-BY-NC",
  },
  /** 철도 */
  "rail-freight": {
    eventId: "rail-freight",
    freesoundQuery: "freight train pass rail clacks",
    freesoundId: 455775,
    volume: 0.32,
    category: "ambient",
    note: "FS#455775 kyles freight train pass · CC0",
  },
  /** 해저터널 */
  "submarine-tunnel-ambience": {
    eventId: "submarine-tunnel-ambience",
    freesoundQuery: "tunnel traffic ambience",
    freesoundId: 474404,
    volume: 0.26,
    category: "ambient",
    note: "FS#474404 klankbeeld tunnel traffic · CC-BY",
  },
  /** 해저 파이프라인 */
  "subsea-pipeline": {
    eventId: "subsea-pipeline",
    freesoundQuery: "water pipe flow",
    freesoundId: 554314,
    volume: 0.24,
    category: "ambient",
    note: "FS#554314 finneganmilla water pipe · CC0",
  },
  /** 원전 */
  "nuclear-plant": {
    eventId: "nuclear-plant",
    freesoundQuery: "energy plant inside atmo",
    freesoundId: 530974,
    volume: 0.22,
    category: "ambient",
    note: "FS#530974 TimoSchmied Wind energy plant · CC-BY · 원전/발전",
  },
  /** 석유·가스 플랜트 */
  "oil-gas-plant": {
    eventId: "oil-gas-plant",
    freesoundQuery: "industrial plant ambient",
    freesoundId: 58823,
    volume: 0.26,
    category: "economy",
    note: "FS#58823 ERH ab6b industrial · CC-BY-NC",
  },
  /** 석탄 광산·채굴·터미널 */
  "coal-mining": {
    eventId: "coal-mining",
    freesoundQuery: "open pit mining plant",
    freesoundId: 410422,
    volume: 0.28,
    category: "economy",
    note: "FS#410422 jb_stems Open-pit Mining · CC-BY-NC",
  },
  /** 철광·철강·시멘트·화학 */
  "heavy-industry": {
    eventId: "heavy-industry",
    freesoundQuery: "scrapyard industrial ambient",
    freesoundId: 157714,
    volume: 0.28,
    category: "economy",
    note: "FS#157714 geogblog Solways Scrapyard · CC0",
  },
  /** 해저케이블 */
  "submarine-cable": {
    eventId: "submarine-cable",
    freesoundQuery: "digital data bolts glitch short",
    freesoundId: 829569,
    volume: 0.22,
    category: "ambient",
    note: "FS#829569 tboneaudio Data Bolts · CC0",
  },
  /** 군사기지 겹침 A — 헬기 */
  "mil-base-heli": {
    eventId: "mil-base-heli",
    freesoundQuery: "helicopter pass",
    freesoundId: 741812,
    volume: 0.26,
    category: "conflict",
    note: "FS#741812 inspire153 Helicopter · CC0 · 기지 클릭(겹침)",
  },
  /** 군사기지 겹침 B — 군중/행진 */
  "mil-base-crowd": {
    eventId: "mil-base-crowd",
    freesoundQuery: "military crowd marching chant",
    freesoundId: 768932,
    volume: 0.2,
    category: "conflict",
    note: "FS#768932 jerry.berumen military marching · CC-BY · 기지 클릭(겹침)",
  },
  /** 군사기지 겹침 C — 기갑 */
  "mil-base-armor": {
    eventId: "mil-base-armor",
    freesoundQuery: "tank moving armor",
    freesoundId: 329800,
    volume: 0.24,
    category: "conflict",
    note: "FS#329800 greatmganga t26_moving · CC0 · 기지 클릭(겹침)",
  },
  /** 미사일 사일로 */
  "missile-silo": {
    eventId: "missile-silo",
    freesoundQuery: "horror ambience low tense",
    freesoundId: 135836,
    volume: 0.22,
    category: "conflict",
    note: "FS#135836 klankbeeld horror ambience 14 · CC-BY",
  },
  /** 탄도미사일 통과 */
  "ballistic-travel": {
    eventId: "ballistic-travel",
    freesoundQuery: "ballistic missile travel whoosh",
    freesoundId: 501328,
    volume: 0.36,
    category: "conflict",
    note: "FS#501328 Asteroiderer ballistic_travel · CC0 · NEPTUN 탄도·시험장",
  },

  /** 항만 레이어 앰비언스 */
  "port-ambient": {
    eventId: "port-ambient",
    freesoundQuery: "harbor seaport ambient waves ships",
    freesoundId: 254130,
    volume: 0.13,
    loop: true,
    category: "ambient",
    note: "FS#254130 clif_creates Harbor Ambience 2 · 항구/파도/선박",
  },

  /**
   * 경제 중심지 앰비언스
   * https://freesound.org/s/159470/ · JorgenJak · Bakken distant ambience
   */
  "construction-ambient": {
    eventId: "construction-ambient",
    freesoundQuery: "distant urban ambience park soft",
    freesoundId: 159470,
    volume: 0.12,
    loop: true,
    category: "ambient",
    note: "FS#159470 JorgenJak Bakken Distant Ambience · 경제중심",
  },

  /** 파이프라인 */
  "pipeline-hum": {
    eventId: "pipeline-hum",
    freesoundQuery: "industrial pump hum low continuous",
    freesoundId: 453514,
    volume: 0.14,
    loop: true,
    category: "ambient",
    note: "FS#453514 kyles industrial hums hiss water treatment · 펌프/배관",
  },

  /** 데이터센터 */
  "datacenter-hum": {
    eventId: "datacenter-hum",
    freesoundQuery: "server room fan cooling hum",
    freesoundId: 610761,
    volume: 0.11,
    loop: true,
    category: "ambient",
    note: "FS#610761 DeVern Computer Server Room Ambience Loop · 서버룸 팬",
  },

  /** 제재 — 도장 찍는 소리 */
  "sanctions-stamp": {
    eventId: "sanctions-stamp",
    freesoundQuery: "rubber stamp paper thud",
    freesoundId: 470710,
    volume: 0.28,
    category: "economy",
    note: "FS#470710 I.fekry traditional stamp · 행정 도장",
  },

  /** 경제 알림 — 시세 차임 (전쟁 사이렌·NYSE 벨과 분리) */
  "economy-alert": {
    eventId: "economy-alert",
    freesoundQuery: "soft chime notification market",
    freesoundId: 571511,
    volume: 0.34,
    category: "economy",
    note: "FS#571511 LegitCheese Soft-Notifications LowDing · 부드러운 차임",
  },

  // ── UI ───────────────────────────────────────────────────────────

  /** Fly-to 착지 — 짧은 UI 핑 (시네마틱 과장 금지) */
  "flyto-arrive": {
    eventId: "flyto-arrive",
    freesoundQuery: "soft ui whoosh short",
    freesoundId: 833599,
    volume: 0.16,
    category: "ui",
    note: "FS#833599 subquire Bright Synth Ping · 짧은 UI 착지",
  },

  /** 모드 전환 */
  "mode-switch": {
    eventId: "mode-switch",
    freesoundQuery: "soft ui transition swipe",
    freesoundId: 458586,
    volume: 0.22,
    category: "ui",
    note: "FS#458586 InspectorJ UI Mechanical Notification · 전환",
  },

  /** 부트 완료 */
  "boot-ready": {
    eventId: "boot-ready",
    freesoundQuery: "soft ui power on chime",
    freesoundId: 413749,
    volume: 0.2,
    category: "ui",
    note: "FS#413749 InspectorJ UI Confirmation Alert · 준비 차임",
  },

  /** 레이어 클릭 */
  "ui-click": {
    eventId: "ui-click",
    freesoundQuery: "soft ui button click",
    freesoundId: 458586,
    volume: 0.14,
    category: "ui",
    note: "FS#458586 InspectorJ mechanical notification · 최소 클릭",
  },

  /** 패널 열기 */
  "panel-open": {
    eventId: "panel-open",
    freesoundQuery: "soft ui panel open",
    freesoundId: 419493,
    volume: 0.14,
    category: "ui",
    note: "FS#419493 plasterbrain Bell Chime Alert · 패널",
  },

  /** 로드 오류 */
  "load-error": {
    eventId: "load-error",
    freesoundQuery: "soft error beep ui",
    freesoundId: 423169,
    volume: 0.28,
    category: "ui",
    note: "FS#423169 plasterbrain PC Game UI Error · 소프트 에러",
  },

  /** 스트림 끊김 — 무전 클릭/스퀠치 */
  "stream-disconnect": {
    eventId: "stream-disconnect",
    freesoundQuery: "radio click disconnect short",
    freesoundId: 524205,
    volume: 0.24,
    category: "ui",
    note: "FS#524205 · 무전 끊김 스퀠치",
  },

  /**
   * 양피지 펼침 — 봉투/종이 바스락
   * https://freesound.org/s/360646/ · Mafon2 · CC0
   */
  "parchment-unfold": {
    eventId: "parchment-unfold",
    freesoundQuery: "paper envelope unfold rustle",
    freesoundId: 360646,
    volume: 0.38,
    category: "ui",
    note: "FS#360646 Mafon2 Paper drawn with rustle · CC0 · 양피지 펼침",
  },

  /**
   * 양피지 접힘·상승 — 포장지 구기고 접는 소리
   * https://freesound.org/s/140891/ · jgeralyn · CC BY 3.0
   */
  "parchment-fold": {
    eventId: "parchment-fold",
    freesoundQuery: "wrapping paper crumple fold packaging",
    freesoundId: 140891,
    volume: 0.42,
    category: "ui",
    note: "FS#140891 jgeralyn WrappingPaper1 · BY 3.0 · 양피지 접어 올라갈 때",
  },

  /**
   * 양피지 날아감 — 짧은 whoosh (접기 직후 체인)
   * https://freesound.org/s/833599/ · subquire · (flyto와 동일 계열)
   */
  "parchment-flyaway": {
    eventId: "parchment-flyaway",
    freesoundQuery: "soft whoosh paper flutter short",
    freesoundId: 833599,
    volume: 0.22,
    category: "ui",
    note: "FS#833599 · 양피지 날아가는 whoosh",
  },
} as const satisfies Record<string, AudioEventDef>;

export type AudioEventId = keyof typeof AUDIO_MANIFEST;

export function getAudioEvent(eventId: AudioEventId): AudioEventDef {
  return AUDIO_MANIFEST[eventId];
}

export function listAudioEventsByCategory(category: AudioCategory): AudioEventDef[] {
  return (Object.values(AUDIO_MANIFEST) as AudioEventDef[]).filter(
    (def) => def.category === category,
  );
}

/** 루프 앰비언스 — 동시 재생 시 하나만 */
export const AMBIENT_EVENT_IDS = (Object.values(AUDIO_MANIFEST) as AudioEventDef[])
  .filter((def) => Boolean(def.loop))
  .map((def) => def.eventId as AudioEventId);
