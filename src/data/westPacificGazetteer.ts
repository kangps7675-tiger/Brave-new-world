/**
 * 서태평양 해군 관측용 지명 사전.
 * kind:
 *  - point: 섬/기지 — 상대거리 계산 기준점
 *  - axis: 해협/통로 — 대표점 + 넓은 불확실성
 *  - sea: 광역 해역 — mapEligible 기본 false
 */

export type GazetteerKind = "point" | "axis" | "sea";

export type GazetteerEntry = {
  id: string;
  nameKo: string;
  nameEn: string;
  /** 영·일·한 별칭 (정규화 매칭용, 소문자) */
  aliases: string[];
  lat: number;
  lng: number;
  kind: GazetteerKind;
  /** 기본 위치 불확실성 반경(km) */
  defaultPrecisionKm: number;
};

export const WEST_PACIFIC_GAZETTEER: GazetteerEntry[] = [
  {
    id: "kume-island",
    nameKo: "구메섬",
    nameEn: "Kume Island",
    aliases: ["kume island", "kumejima", "구메섬", "久米島"],
    lat: 26.34,
    lng: 126.8,
    kind: "point",
    defaultPrecisionKm: 8,
  },
  {
    id: "okinawa-island",
    nameKo: "오키나와 본섬",
    nameEn: "Okinawa Island",
    aliases: ["okinawa", "okinawa island", "오키나와", "沖縄本島", "沖縄"],
    lat: 26.5,
    lng: 127.9,
    kind: "point",
    defaultPrecisionKm: 25,
  },
  {
    id: "miyako-island",
    nameKo: "미야코섬",
    nameEn: "Miyako Island",
    aliases: ["miyako", "miyako island", "미야코섬", "宮古島"],
    lat: 24.8,
    lng: 125.3,
    kind: "point",
    defaultPrecisionKm: 10,
  },
  {
    id: "miyako-strait",
    nameKo: "미야코 해협",
    nameEn: "Miyako Strait",
    aliases: ["miyako strait", "미야코 해협", "宮古海峡", "between okinawa and miyako"],
    lat: 25.0,
    lng: 126.9,
    kind: "axis",
    defaultPrecisionKm: 55,
  },
  {
    id: "tsushima-strait",
    nameKo: "쓰시마 해협",
    nameEn: "Tsushima Strait",
    aliases: ["tsushima strait", "쓰시마 해협", "対馬海峡"],
    lat: 34.0,
    lng: 129.5,
    kind: "axis",
    defaultPrecisionKm: 50,
  },
  {
    id: "osumí-strait",
    nameKo: "오스미 해협",
    nameEn: "Osumi Strait",
    aliases: ["osumi strait", "ōsumi strait", "오스미 해협", "大隅海峡", "kuchi no erabu"],
    lat: 30.9,
    lng: 130.7,
    kind: "axis",
    defaultPrecisionKm: 40,
  },
  {
    id: "yonaguni",
    nameKo: "요나구니섬",
    nameEn: "Yonaguni Island",
    aliases: ["yonaguni", "요나구니", "与那国島"],
    lat: 24.45,
    lng: 122.98,
    kind: "point",
    defaultPrecisionKm: 8,
  },
  {
    id: "iriomote",
    nameKo: "이리오모테섬",
    nameEn: "Iriomote Island",
    aliases: ["iriomote", "이리오모테", "西表島"],
    lat: 24.35,
    lng: 123.85,
    kind: "point",
    defaultPrecisionKm: 10,
  },
  {
    id: "kuchi-no-erabu",
    nameKo: "구치노에라부섬",
    nameEn: "Kuchinoerabu Island",
    aliases: ["kuchinoerabu", "kuchi no erabu", "구치노에라부", "口永良部島"],
    lat: 30.47,
    lng: 130.2,
    kind: "point",
    defaultPrecisionKm: 8,
  },
  {
    id: "okinotorishima",
    nameKo: "오키노토리시마",
    nameEn: "Okinotorishima",
    aliases: ["okinotorishima", "okinotori", "오키노토리", "沖ノ鳥島"],
    lat: 20.42,
    lng: 136.08,
    kind: "point",
    defaultPrecisionKm: 15,
  },
  {
    id: "iwo-jima",
    nameKo: "이오지마",
    nameEn: "Iwo Jima",
    aliases: ["iwo jima", "iwoto", "이오지마", "硫黄島", "south iwo jima"],
    lat: 24.78,
    lng: 141.32,
    kind: "point",
    defaultPrecisionKm: 12,
  },
  {
    id: "yokosuka",
    nameKo: "요코스카",
    nameEn: "Yokosuka",
    aliases: ["yokosuka", "요코스카", "横須賀"],
    lat: 35.29,
    lng: 139.67,
    kind: "point",
    defaultPrecisionKm: 5,
  },
  {
    id: "guam",
    nameKo: "괌",
    nameEn: "Guam",
    aliases: ["guam", "괌", "apagra harbor"],
    lat: 13.44,
    lng: 144.65,
    kind: "point",
    defaultPrecisionKm: 20,
  },
  {
    id: "qingdao",
    nameKo: "칭다오",
    nameEn: "Qingdao",
    aliases: ["qingdao", "칭다오", "青岛"],
    lat: 36.06,
    lng: 120.38,
    kind: "point",
    defaultPrecisionKm: 12,
  },
  {
    id: "sanya-yulin",
    nameKo: "산야 유린 기지",
    nameEn: "Yulin Naval Base",
    aliases: ["yulin", "sanya", "산야", "유린", "榆林"],
    lat: 18.21,
    lng: 109.58,
    kind: "point",
    defaultPrecisionKm: 10,
  },
  {
    id: "philippine-sea",
    nameKo: "필리핀해",
    nameEn: "Philippine Sea",
    aliases: ["philippine sea", "필리핀해"],
    lat: 20.0,
    lng: 135.0,
    kind: "sea",
    defaultPrecisionKm: 250,
  },
  {
    id: "south-china-sea",
    nameKo: "남중국해",
    nameEn: "South China Sea",
    aliases: ["south china sea", "scs", "남중국해", "南シナ海"],
    lat: 15.0,
    lng: 114.0,
    kind: "sea",
    defaultPrecisionKm: 280,
  },
  {
    id: "east-china-sea",
    nameKo: "동중국해",
    nameEn: "East China Sea",
    aliases: ["east china sea", "동중국해", "東シナ海"],
    lat: 30.0,
    lng: 125.0,
    kind: "sea",
    defaultPrecisionKm: 200,
  },
  {
    id: "yellow-sea",
    nameKo: "황해",
    nameEn: "Yellow Sea",
    aliases: ["yellow sea", "황해"],
    lat: 35.0,
    lng: 123.0,
    kind: "sea",
    defaultPrecisionKm: 180,
  },
  {
    id: "sea-of-japan",
    nameKo: "동해",
    nameEn: "Sea of Japan",
    aliases: ["sea of japan", "east sea", "동해", "日本海"],
    lat: 39.0,
    lng: 135.0,
    kind: "sea",
    defaultPrecisionKm: 220,
  },
];

function normalizeAlias(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[’']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function findGazetteerEntry(placeName: string | null | undefined): GazetteerEntry | null {
  if (!placeName) return null;
  const needle = normalizeAlias(placeName);
  if (!needle) return null;

  for (const entry of WEST_PACIFIC_GAZETTEER) {
    if (normalizeAlias(entry.nameEn) === needle || normalizeAlias(entry.nameKo) === needle) {
      return entry;
    }
    for (const alias of entry.aliases) {
      if (needle === normalizeAlias(alias) || needle.includes(normalizeAlias(alias))) {
        return entry;
      }
    }
  }

  // 부분 포함 (긴 별칭 우선)
  let best: GazetteerEntry | null = null;
  let bestLen = 0;
  for (const entry of WEST_PACIFIC_GAZETTEER) {
    for (const alias of [entry.nameEn, entry.nameKo, ...entry.aliases]) {
      const a = normalizeAlias(alias);
      if (a.length >= 4 && needle.includes(a) && a.length > bestLen) {
        best = entry;
        bestLen = a.length;
      }
    }
  }
  return best;
}

export function gazetteerLabel(entry: GazetteerEntry, lang: "ko" | "en"): string {
  return lang === "en" ? entry.nameEn : entry.nameKo;
}
