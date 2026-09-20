/**
 * Historical polity fill colors — distinct per polity, similar ethnic/cultural
 * groups share a hue band so the map reads as “families,” not noise.
 */

export type PolityPaint = {
  fill: string;
  stroke: string;
  fillOpacity: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** Stable 0..360 hue from an arbitrary id string. */
export function hashHue(key: string): number {
  let h = 2166136261;
  const s = key.trim().toLowerCase();
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 360;
}

export function hslToHex(h: number, s: number, l: number): string {
  const hh = ((h % 360) + 360) % 360;
  const ss = clamp(s, 0, 100) / 100;
  const ll = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * ll - 1)) * ss;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = ll - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hh < 60) {
    r = c;
    g = x;
  } else if (hh < 120) {
    r = x;
    g = c;
  } else if (hh < 180) {
    g = c;
    b = x;
  } else if (hh < 240) {
    g = x;
    b = c;
  } else if (hh < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  const to = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function paintFromHue(
  hue: number,
  opts?: { s?: number; l?: number; fillOpacity?: number },
): PolityPaint {
  const s = opts?.s ?? 52;
  const l = opts?.l ?? 48;
  return {
    fill: hslToHex(hue, s, l),
    stroke: hslToHex(hue, clamp(s + 10, 0, 70), clamp(l - 22, 18, 40)),
    fillOpacity: opts?.fillOpacity ?? 0.36,
  };
}

/**
 * Korea / peninsula family hues — same ethno-cultural band (warm amber–coral),
 * with small offsets so Goguryeo≠Baekje≠Silla still separate.
 */
const KOREA_FAMILY_HUE: Record<string, number> = {
  gojoseon: 38,
  goguryeo: 18,
  balhae: 26,
  jeongan: 30,
  baekje: 8,
  silla: 48,
  "unified-silla": 44,
  goryeo: 355,
  joseon: 32,
};

/** Neighbor / context fills — cooler, lower chroma. */
const CONTEXT_CLUSTER: Array<{ re: RegExp; hue: number }> = [
  { re: /당|당나라|tang|한\b|한나라|han\b|요\b|요나라|liao|금\b|jin\b|원\b|yuan|명\b|ming|청\b|qing|중국|china/i, hue: 0 },
  { re: /왜|일본|japan|yamato|wa\b/i, hue: 330 },
  { re: /말갈|여진|jurchen|mohe|만주|manchu/i, hue: 195 },
  { re: /몽골|mongol|거란|khitan/i, hue: 205 },
];

export function colorForKoreaFamily(
  family: string,
  opts?: { role?: string; layer?: string; nameBlob?: string },
): PolityPaint {
  const role = opts?.role || "korean";
  const isHypothesis = opts?.layer === "hypothesis";

  if (role === "context") {
    const blob = opts?.nameBlob || family;
    for (const c of CONTEXT_CLUSTER) {
      if (c.re.test(blob)) {
        return paintFromHue(c.hue, { s: 28, l: 42, fillOpacity: 0.22 });
      }
    }
    return paintFromHue(hashHue(family), { s: 22, l: 40, fillOpacity: 0.2 });
  }

  const baseHue =
    KOREA_FAMILY_HUE[family] ??
    (family.startsWith("id:") ? hashHue(family) : hashHue(`kr:${family}`));

  if (isHypothesis) {
    return paintFromHue(baseHue, { s: 58, l: 58, fillOpacity: 0.28 });
  }
  return paintFromHue(baseHue, { s: 55, l: 50, fillOpacity: 0.44 });
}

/**
 * Worldwide Cliopatria name → ethno-cultural hue band.
 * Order matters (more specific first). Unmatched → stable hash of name/wikidata.
 */
const CLIOPATRIA_CLUSTERS: Array<{ re: RegExp; hue: number }> = [
  // East Asia
  { re: /\b(china|chinese|han\b|tang\b|song\b|ming\b|qing\b|zhou\b|qin\b|yuan\b|liao\b|jin\b|xia\b|shu\b|wu\b|wei\b|yan\b)\b/i, hue: 5 },
  { re: /\b(japan|yamato|edo|tokugawa|meiji|ashikaga|kamakura|heian)\b/i, hue: 330 },
  { re: /\b(mongol|mongolia|yuan\b|golden\s*horde|ilkhan|chagatai)\b/i, hue: 200 },
  { re: /\b(tibet|tuyuhun|uyghur|uighur|xiongnu|xianbei|jurchen|manchu|khitan)\b/i, hue: 185 },
  { re: /\b(vietnam|dai\s*viet|annam|champa|khmer|angkor|siam|thai|ayutthaya|burma|myanmar|pyu)\b/i, hue: 145 },
  // South / Central Asia
  { re: /\b(india|maurya|gupta|mughal|delhi\s*sultanate|maratha|chola|vijayanagara|pallava|harappa)\b/i, hue: 40 },
  { re: /\b(persia|persian|achaemenid|sassan|sasan|parthia|iran|median|elam)\b/i, hue: 25 },
  { re: /\b(timurid|samarkand|bukhara|khwarezm|sogdia)\b/i, hue: 50 },
  // Middle East / North Africa
  { re: /\b(arab|caliphate|umayyad|abbasid|rashidun|fatimid|ayyubid|mamluk|saudi)\b/i, hue: 85 },
  { re: /\b(ottoman|seljuk|turk|turkish|ghaznavid|qajar)\b/i, hue: 160 },
  { re: /\b(egypt|egyptian|ptolemaic|nubia|kush|aksum|ethiopia)\b/i, hue: 70 },
  { re: /\b(israel|judah|judea|hebrew|phoenicia|canaan)\b/i, hue: 55 },
  // Europe
  { re: /\b(rome|roman|byzantin|latin\s*empire|holy\s*roman)\b/i, hue: 350 },
  { re: /\b(greece|greek|athen|sparta|macedon|hellen)\b/i, hue: 210 },
  { re: /\b(frank|france|french|caroling|capet|bourbon)\b/i, hue: 220 },
  { re: /\b(england|english|britain|british|anglo|norman|wales|scotland)\b/i, hue: 230 },
  { re: /\b(germany|german|prussia|holy\s*roman|habsburg|austria|bavaria|saxony)\b/i, hue: 45 },
  { re: /\b(spain|spanish|castile|aragon|visigoth|portugal|portuguese)\b/i, hue: 15 },
  { re: /\b(russia|rus\b|muscovy|moscow|soviet|kievan|novgorod)\b/i, hue: 250 },
  { re: /\b(poland|polish|lithuania|lithuanian|ukraine|cossack|bohemia|czech|hungary|magyar)\b/i, hue: 275 },
  { re: /\b(sweden|swedish|norway|norwegian|denmark|danish|viking|norse|iceland)\b/i, hue: 195 },
  { re: /\b(italy|italian|venice|genoa|florence|papal|naples|sicily)\b/i, hue: 310 },
  // Americas / Africa / Oceania
  { re: /\b(aztec|maya|inca|olmec|toltec|mississippian)\b/i, hue: 120 },
  { re: /\b(mali|songhai|ghana\b|benin|yoruba|zulu|kongo|swahili)\b/i, hue: 95 },
  { re: /\b(polynesia|hawaii|maori|tonga|samoa)\b/i, hue: 170 },
];

export type CliopatriaColorProps = {
  name?: string | null;
  wikidata?: string | null;
  seshatId?: string | null;
};

export function colorForCliopatriaPolity(props: CliopatriaColorProps): PolityPaint {
  const name = (props.name || "").trim();
  const key = name || props.wikidata || props.seshatId || "unknown";

  for (const c of CLIOPATRIA_CLUSTERS) {
    if (name && c.re.test(name)) {
      // Slight per-polity jitter inside the band so neighbors don't look identical
      const jitter = (hashHue(key) % 14) - 7;
      return paintFromHue(c.hue + jitter, { s: 48, l: 46, fillOpacity: 0.22 });
    }
  }

  return paintFromHue(hashHue(key), { s: 46, l: 48, fillOpacity: 0.2 });
}
