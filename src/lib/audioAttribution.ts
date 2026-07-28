/**
 * Freesound 저작권 고지 — CC0은 명시 의무 없음(목록에서 제외).
 * CC-BY / CC-BY-NC 만 수록. URL·저작자·작품명·라이선스 필수.
 *
 * 출처: freesound.org 각 사운드 페이지 (라이선스·업로더 확인일 2026-07).
 */

export type FreesoundLicense = "CC-BY" | "CC-BY-NC";

export type FreesoundAttribution = {
  freesoundId: number;
  title: string;
  author: string;
  license: FreesoundLicense;
  url: string;
  /** 매니페스트 eventId (참고) */
  eventIds: string[];
};

/** 저작물 명시가 필요한 음원만 (CC0 제외) */
export const FREESOUND_ATTRIBUTIONS: readonly FreesoundAttribution[] = [
  // ── 신규 인프라 클릭 ──────────────────────────────────────────
  {
    freesoundId: 789950,
    title: "Starting of jet engine",
    author: "DerrickMckinnon",
    license: "CC-BY",
    url: "https://freesound.org/s/789950/",
    eventIds: ["aircraft-military"],
  },
  {
    freesoundId: 843948,
    title: "Riverside",
    author: "freekit",
    license: "CC-BY",
    url: "https://freesound.org/s/843948/",
    eventIds: ["ais-merchant"],
  },
  {
    freesoundId: 189860,
    title: "NOAA 19 satellite",
    author: "saphe",
    license: "CC-BY",
    url: "https://freesound.org/s/189860/",
    eventIds: ["recon-satellite"],
  },
  {
    freesoundId: 113606,
    title: "WALLA_airport.wav",
    author: "costaipsa",
    license: "CC-BY",
    url: "https://freesound.org/s/113606/",
    eventIds: ["airport-walla"],
  },
  {
    freesoundId: 44823,
    title: "dronnee.aif",
    author: "tim.kahn",
    license: "CC-BY",
    url: "https://freesound.org/s/44823/",
    eventIds: ["chokepoint-drone"],
  },
  {
    freesoundId: 130017,
    title: "Crane ship unloading sand 1.wav",
    author: "abuurman",
    license: "CC-BY",
    url: "https://freesound.org/s/130017/",
    eventIds: ["logistics-hub-crane"],
  },
  {
    freesoundId: 693576,
    title:
      "Sea dramatics on cliffs around Zawn Wells, near Land's End (lower position)",
    author: "Philip_Goddard",
    license: "CC-BY-NC",
    url: "https://freesound.org/s/693576/",
    eventIds: ["shipping-lane-sea"],
  },
  {
    freesoundId: 474404,
    title: "tunnel traffic ambience 190610_0020.ogg",
    author: "klankbeeld",
    license: "CC-BY",
    url: "https://freesound.org/s/474404/",
    eventIds: ["submarine-tunnel-ambience"],
  },
  {
    freesoundId: 530974,
    title: "Wind energy plant inside atmo",
    author: "TimoSchmied",
    license: "CC-BY",
    url: "https://freesound.org/s/530974/",
    eventIds: ["nuclear-plant"],
  },
  {
    freesoundId: 58823,
    title: "ab6b 60 industrial.mp3",
    author: "ERH",
    license: "CC-BY-NC",
    url: "https://freesound.org/s/58823/",
    eventIds: ["oil-gas-plant"],
  },
  {
    freesoundId: 410422,
    title: "Wide shot of Open-pit Mining processing plant.wav",
    author: "jb_stems",
    license: "CC-BY-NC",
    url: "https://freesound.org/s/410422/",
    eventIds: ["coal-mining"],
  },
  {
    freesoundId: 768932,
    title: "crowd military mexican army college marching chanting",
    author: "jerry.berumen",
    license: "CC-BY",
    url: "https://freesound.org/s/768932/",
    eventIds: ["mil-base-crowd"],
  },
  {
    freesoundId: 135836,
    title: "horror ambience 14.wav",
    author: "klankbeeld",
    license: "CC-BY",
    url: "https://freesound.org/s/135836/",
    eventIds: ["missile-silo"],
  },

  // ── 기존 매니페스트 (CC0 제외) ────────────────────────────────
  {
    freesoundId: 840902,
    title: "mortar bomb fireworks New Year Netherlands 918 pm 251231_0059",
    author: "klankbeeld",
    license: "CC-BY",
    url: "https://freesound.org/s/840902/",
    eventIds: ["frontline-fpv-detonation"],
  },
  {
    freesoundId: 161806,
    title: "remix #2 of 42024__digifishmusic__missile-strike.wav",
    author: "Timbre",
    license: "CC-BY-NC",
    url: "https://freesound.org/s/161806/",
    eventIds: ["frontline-bombing"],
  },
  {
    freesoundId: 587014,
    title: "Something dark",
    author: "Victor_Natas",
    license: "CC-BY",
    url: "https://freesound.org/s/587014/",
    eventIds: ["breaking-dark-bed"],
  },
  {
    freesoundId: 612277,
    title: "10835 big fire loop.wav",
    author: "Robinhood76",
    license: "CC-BY-NC",
    url: "https://freesound.org/s/612277/",
    eventIds: ["firms-exercise"],
  },
  {
    freesoundId: 620324,
    title: "Campfire crackling - Loop",
    author: "marb7e",
    license: "CC-BY",
    url: "https://freesound.org/s/620324/",
    eventIds: ["firms-wildfire-crackle"],
  },
  {
    freesoundId: 159470,
    title: "05-Bakken_Distant-Ambience.wav",
    author: "JorgenJak",
    license: "CC-BY",
    url: "https://freesound.org/s/159470/",
    eventIds: ["construction-ambient"],
  },
  {
    freesoundId: 610761,
    title: "Computer Server Room Ambience Loop.wav",
    author: "DeVern",
    license: "CC-BY",
    url: "https://freesound.org/s/610761/",
    eventIds: ["datacenter-hum"],
  },
  {
    freesoundId: 833599,
    title: "Bright Synth Ping / UI Bell Tone",
    author: "subquire",
    license: "CC-BY",
    url: "https://freesound.org/s/833599/",
    eventIds: ["flyto-arrive", "parchment-flyaway"],
  },
  {
    freesoundId: 458586,
    title: "UI, Mechanical, Notification, 01, FX.wav",
    author: "InspectorJ",
    license: "CC-BY",
    url: "https://freesound.org/s/458586/",
    eventIds: ["mode-switch", "ui-click"],
  },
  {
    freesoundId: 413749,
    title: "UI Confirmation Alert, D1.wav",
    author: "InspectorJ",
    license: "CC-BY",
    url: "https://freesound.org/s/413749/",
    eventIds: ["boot-ready"],
  },
  {
    freesoundId: 140891,
    title: "WrappingPaper1 wrap_home_Jan2012.aif",
    author: "jgeralyn",
    license: "CC-BY",
    url: "https://freesound.org/s/140891/",
    eventIds: ["parchment-fold"],
  },
] as const;

export function formatFreesoundCredit(a: FreesoundAttribution): string {
  return `"${a.title}" by ${a.author} — ${a.url} (${a.license})`;
}
