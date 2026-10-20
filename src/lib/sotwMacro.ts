/**
 * SOTW 딥 매크로 — 인플레·성장·실업·충격(히스토리) + 피어 비교 + 브리핑 문단.
 */

import type { LabelLanguage } from "@/lib/layerPrefs";
import {
  buildCountryCard,
  getSotwApiKey,
  pickSotwIndicator,
  resolveSotwCountryIso,
  sotwFetchJson,
  SOTW_ATTRIBUTION,
  type SotwCountryCard,
  type SotwCountryPayload,
  type SotwIndicatorRow,
} from "@/lib/sotw";

export type MacroSeriesPoint = { year: number; value: number };

export type MacroShock = {
  indicatorId: string;
  labelKo: string;
  labelEn: string;
  latest: number | null;
  latestYear: string | null;
  prev: number | null;
  prevYear: string | null;
  deltaPp: number | null;
  min: number | null;
  max: number | null;
  rangePp: number | null;
  series: MacroSeriesPoint[];
};

export type SotwMacroDeep = SotwCountryCard & {
  inflationPct: number | null;
  gdpGrowthPct: number | null;
  unemploymentPct: number | null;
  currentAccountPctGdp: number | null;
  govDebtPctGdp: number | null;
  exportsPctGdp: number | null;
  importsPctGdp: number | null;
  incomeLevel?: string;
  shocks: {
    inflation: MacroShock | null;
    growth: MacroShock | null;
  };
  peers: Array<{
    id: string;
    name: string;
    inflationPct: number | null;
    gdpGrowthPct: number | null;
    gdpPerCapitaUsd: number | null;
  }>;
  /** 양피지·등불용 서술 문단 */
  narrativeKo: string[];
  narrativeEn: string[];
};

type HistoryPayload = {
  data?: Array<{ year?: number | string; value?: number | null }>;
};

const INFLATION_IDS = ["FP.CPI.TOTL.ZG", "IMF.PCPIPCH", "AV.INFLATION"];
const GROWTH_IDS = ["NY.GDP.MKTP.KD.ZG", "IMF.NGDP_RPCH"];
const UNEMP_IDS = ["SL.UEM.TOTL.ZS"];
const CA_IDS = ["BN.CAB.XOKA.GD.ZS"];
const DEBT_IDS = ["GC.DOD.TOTL.GD.ZS"];
const EXP_IDS = ["NE.EXP.GNFS.ZS"];
const IMP_IDS = ["NE.IMP.GNFS.ZS"];

/** ISO3 → 비교 피어 (자국 제외) */
const PEER_ISO: Record<string, string[]> = {
  USA: ["CHN", "DEU"],
  CHN: ["USA", "JPN"],
  JPN: ["USA", "KOR"],
  KOR: ["JPN", "CHN"],
  DEU: ["USA", "FRA"],
  FRA: ["DEU", "USA"],
  GBR: ["USA", "DEU"],
  IND: ["CHN", "USA"],
  IDN: ["VNM", "CHN"],
  VNM: ["CHN", "IDN"],
  AUS: ["CHN", "USA"],
  CHL: ["USA", "AUS"],
  ARE: ["SAU", "USA"],
  SAU: ["ARE", "USA"],
  QAT: ["ARE", "USA"],
  SGP: ["MYS", "CHN"],
  MYS: ["SGP", "CHN"],
  HKG: ["CHN", "SGP"],
  NLD: ["DEU", "USA"],
  IRN: ["SAU", "TUR"],
  TUR: ["DEU", "USA"],
  UKR: ["POL", "DEU"],
  POL: ["DEU", "USA"],
  ISR: ["USA", "DEU"],
  EGY: ["SAU", "TUR"],
  YEM: ["SAU", "EGY"],
  PAN: ["USA", "MEX"],
  BRA: ["USA", "CHN"],
  MEX: ["USA", "CHN"],
  RUS: ["CHN", "DEU"],
  TWN: ["KOR", "JPN"],
  PHL: ["VNM", "CHN"],
  THA: ["VNM", "CHN"],
  NGA: ["ZAF", "USA"],
  ZAF: ["NGA", "USA"],
  CAN: ["USA", "CHN"],
};

function emptyCard(partial: Partial<SotwMacroDeep> & Pick<SotwMacroDeep, "disabled" | "attribution">): SotwMacroDeep {
  return {
    gdpUsd: null,
    gdpPerCapitaUsd: null,
    tradePctGdp: null,
    population: null,
    milSpendPctGdp: null,
    inflationPct: null,
    gdpGrowthPct: null,
    unemploymentPct: null,
    currentAccountPctGdp: null,
    govDebtPctGdp: null,
    exportsPctGdp: null,
    importsPctGdp: null,
    shocks: { inflation: null, growth: null },
    peers: [],
    narrativeKo: [],
    narrativeEn: [],
    ...partial,
  };
}

function parseSeries(data: HistoryPayload["data"] | undefined): MacroSeriesPoint[] {
  if (!data?.length) return [];
  const out: MacroSeriesPoint[] = [];
  for (const row of data) {
    const year = Number(row.year);
    const value = row.value;
    if (!Number.isFinite(year) || typeof value !== "number" || !Number.isFinite(value)) continue;
    out.push({ year, value });
  }
  return out.sort((a, b) => a.year - b.year);
}

async function fetchHistorySeries(indicator: string, iso: string): Promise<MacroSeriesPoint[]> {
  try {
    const payload = await sotwFetchJson<HistoryPayload>("/api/v2/history", {
      searchParams: { indicator, country: iso },
      cacheKey: `sotw:hist:${indicator}:${iso}`,
      ttlMs: 6 * 60 * 60 * 1000,
    });
    return parseSeries(payload.data);
  } catch {
    try {
      const payload = await sotwFetchJson<HistoryPayload>(
        `/api/v1/history/${encodeURIComponent(indicator)}/${encodeURIComponent(iso)}`,
        { cacheKey: `sotw:hist:v1:${indicator}:${iso}`, ttlMs: 6 * 60 * 60 * 1000 },
      );
      return parseSeries(payload.data);
    } catch {
      return [];
    }
  }
}

function buildShock(
  series: MacroSeriesPoint[],
  indicatorId: string,
  labelKo: string,
  labelEn: string,
): MacroShock | null {
  if (series.length < 2) {
    if (series.length === 1) {
      const latest = series[0]!;
      return {
        indicatorId,
        labelKo,
        labelEn,
        latest: latest.value,
        latestYear: String(latest.year),
        prev: null,
        prevYear: null,
        deltaPp: null,
        min: latest.value,
        max: latest.value,
        rangePp: 0,
        series,
      };
    }
    return null;
  }
  const window = series.slice(-8);
  const latest = window[window.length - 1]!;
  const prev = window[window.length - 2]!;
  const values = window.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  return {
    indicatorId,
    labelKo,
    labelEn,
    latest: latest.value,
    latestYear: String(latest.year),
    prev: prev.value,
    prevYear: String(prev.year),
    deltaPp: latest.value - prev.value,
    min,
    max,
    rangePp: max - min,
    series: window,
  };
}

function fmtPct(v: number | null | undefined, digits = 1): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(digits)}%`;
}

function fmtUsdCompact(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  if (Math.abs(v) >= 1e12) return `$${(v / 1e12).toFixed(1)}T`;
  if (Math.abs(v) >= 1e9) return `$${(v / 1e9).toFixed(0)}B`;
  return `$${v.toLocaleString()}`;
}

function shakeAdjective(rangePp: number | null, lang: "ko" | "en"): string {
  if (rangePp == null) return lang === "ko" ? "관측" : "observed";
  if (rangePp >= 8) return lang === "ko" ? "크게 흔들린" : "sharply shaken";
  if (rangePp >= 4) return lang === "ko" ? "뚜렷이 흔들린" : "noticeably swung";
  if (rangePp >= 2) return lang === "ko" ? "완만히 흔들린" : "moderately moved";
  return lang === "ko" ? "비교적 안정된" : "relatively steady";
}

function pickLevels(indicators: SotwIndicatorRow[] | undefined) {
  return {
    inflation: pickSotwIndicator(indicators, INFLATION_IDS),
    growth: pickSotwIndicator(indicators, GROWTH_IDS),
    unemp: pickSotwIndicator(indicators, UNEMP_IDS),
    ca: pickSotwIndicator(indicators, CA_IDS),
    debt: pickSotwIndicator(indicators, DEBT_IDS),
    exp: pickSotwIndicator(indicators, EXP_IDS),
    imp: pickSotwIndicator(indicators, IMP_IDS),
  };
}

function buildNarratives(args: {
  name: string;
  iso: string;
  inflationPct: number | null;
  gdpGrowthPct: number | null;
  unemploymentPct: number | null;
  currentAccountPctGdp: number | null;
  govDebtPctGdp: number | null;
  gdpUsd: number | null;
  gdpPerCapitaUsd: number | null;
  tradePctGdp: number | null;
  milSpendPctGdp: number | null;
  inflationShock: MacroShock | null;
  growthShock: MacroShock | null;
  peers: SotwMacroDeep["peers"];
}): { ko: string[]; en: string[] } {
  const {
    name,
    inflationPct,
    gdpGrowthPct,
    unemploymentPct,
    currentAccountPctGdp,
    govDebtPctGdp,
    gdpUsd,
    gdpPerCapitaUsd,
    tradePctGdp,
    milSpendPctGdp,
    inflationShock,
    growthShock,
    peers,
  } = args;

  const ko: string[] = [];
  const en: string[] = [];

  // Core snapshot — prose, not a metric dump
  ko.push(
    `${name} 이야기를 꺼내면, 먼저 경제의 몸집이 보입니다. GDP는 ${fmtUsdCompact(gdpUsd)}, 1인당 ${fmtUsdCompact(gdpPerCapitaUsd)} 근처에서 숨을 고르고, 성장 ${fmtPct(gdpGrowthPct)}·물가 ${fmtPct(inflationPct)}·실업 ${fmtPct(unemploymentPct)}이 오늘의 기온을 만듭니다.`,
  );
  en.push(
    `${name} opens with scale: GDP ${fmtUsdCompact(gdpUsd)}, about ${fmtUsdCompact(gdpPerCapitaUsd)} per person, with growth ${fmtPct(gdpGrowthPct)}, inflation ${fmtPct(inflationPct)}, and unemployment ${fmtPct(unemploymentPct)} setting the room temperature.`,
  );

  // Inflation shock narrative
  if (inflationShock?.latest != null && inflationShock.rangePp != null) {
    const adj = shakeAdjective(inflationShock.rangePp, "ko");
    const adjEn = shakeAdjective(inflationShock.rangePp, "en");
    const delta =
      inflationShock.deltaPp != null
        ? `직전년보다 ${fmtPct(inflationShock.deltaPp)}%p 움직였습니다`
        : "전년 대비로는 큰 출렁임이 없었습니다";
    const deltaEn =
      inflationShock.deltaPp != null
        ? `${fmtPct(inflationShock.deltaPp)}pp versus the prior year`
        : "little year-on-year drama";
    ko.push(
      `물가는 최근 ${inflationShock.series.length}년 창에서 ${adj} 흐름이었습니다. ${inflationShock.min?.toFixed(1)}%에서 ${inflationShock.max?.toFixed(1)}%까지 폭이 ${inflationShock.rangePp.toFixed(1)}%p나 벌어졌고, ${inflationShock.latestYear ?? "최근"}년에는 ${inflationShock.latest.toFixed(1)}%를 찍었습니다. ${delta}.`,
    );
    en.push(
      `Prices have looked ${adjEn} over the last ${inflationShock.series.length} years, swinging ${inflationShock.rangePp.toFixed(1)}pp from ${inflationShock.min?.toFixed(1)} to ${inflationShock.max?.toFixed(1)}. In ${inflationShock.latestYear ?? "the latest year"} they printed ${inflationShock.latest.toFixed(1)}% — ${deltaEn}.`,
    );
  } else if (inflationPct != null) {
    ko.push(`소비자물가는 대략 ${inflationPct.toFixed(1)}% 부근에서 이야기를 이어 갑니다.`);
    en.push(`Consumer prices hover around ${inflationPct.toFixed(1)}%.`);
  }

  // Growth shock
  if (growthShock?.latest != null && growthShock.rangePp != null) {
    const adj = shakeAdjective(growthShock.rangePp, "ko");
    const adjEn = shakeAdjective(growthShock.rangePp, "en");
    ko.push(
      `성장의 맥박은 ${adj} 편이었습니다. 최근 창 범위 ${growthShock.rangePp.toFixed(1)}%p 안에서, ${growthShock.latestYear ?? "최근"}년 실질 성장은 ${fmtPct(growthShock.latest)}${
        growthShock.deltaPp != null ? `로, 직전년 대비 ${fmtPct(growthShock.deltaPp)}%p` : ""
      }를 남겼습니다.`,
    );
    en.push(
      `Growth has felt ${adjEn} (window range ${growthShock.rangePp.toFixed(1)}pp). Latest ${growthShock.latestYear ?? ""} real growth: ${fmtPct(growthShock.latest)}${
        growthShock.deltaPp != null ? `, ${fmtPct(growthShock.deltaPp)}pp vs prior year` : ""
      }.`,
    );
  } else if (gdpGrowthPct != null) {
    ko.push(`실질 성장률은 약 ${fmtPct(gdpGrowthPct)}로, 이야기의 다음 문장을 고릅니다.`);
    en.push(`Real growth sits near ${fmtPct(gdpGrowthPct)}.`);
  }

  // External / fiscal
  const extBitsKo: string[] = [];
  const extBitsEn: string[] = [];
  if (tradePctGdp != null) {
    extBitsKo.push(`무역이 GDP의 ${tradePctGdp.toFixed(0)}%를 차지하고`);
    extBitsEn.push(`trade near ${tradePctGdp.toFixed(0)}% of GDP`);
  }
  if (currentAccountPctGdp != null) {
    extBitsKo.push(`경상수지는 GDP 대비 ${fmtPct(currentAccountPctGdp)}`);
    extBitsEn.push(`current account ${fmtPct(currentAccountPctGdp)} of GDP`);
  }
  if (govDebtPctGdp != null) {
    extBitsKo.push(`정부부채는 ${govDebtPctGdp.toFixed(0)}% 수준`);
    extBitsEn.push(`gov debt around ${govDebtPctGdp.toFixed(0)}% of GDP`);
  }
  if (milSpendPctGdp != null) {
    extBitsKo.push(`국방은 GDP의 ${milSpendPctGdp.toFixed(1)}%`);
    extBitsEn.push(`defense ${milSpendPctGdp.toFixed(1)}% of GDP`);
  }
  if (extBitsKo.length) {
    ko.push(`바깥으로 열린 창을 보면, ${extBitsKo.join(", ")}입니다.`);
    en.push(`Looking outward: ${extBitsEn.join("; ")}.`);
  }

  // Peer compare
  if (peers.length > 0) {
    const peerBits = peers
      .map((p) => `${p.name}(성장 ${fmtPct(p.gdpGrowthPct)}, 물가 ${fmtPct(p.inflationPct)})`)
      .join(", ");
    const peerBitsEn = peers
      .map((p) => `${p.name} (growth ${fmtPct(p.gdpGrowthPct)}, infl ${fmtPct(p.inflationPct)})`)
      .join(", ");
    const selfVs = peers[0];
    let compareKo = "";
    let compareEn = "";
    if (selfVs && inflationPct != null && selfVs.inflationPct != null) {
      const d = inflationPct - selfVs.inflationPct;
      compareKo =
        d > 0.4
          ? ` 물가 온도는 ${selfVs.name}보다 ${Math.abs(d).toFixed(1)}%p 높습니다.`
          : d < -0.4
            ? ` 물가 온도는 ${selfVs.name}보다 ${Math.abs(d).toFixed(1)}%p 낮습니다.`
            : ` 물가 온도는 ${selfVs.name}과 비슷한 방입니다.`;
      compareEn =
        d > 0.4
          ? ` Inflation runs ${Math.abs(d).toFixed(1)}pp hotter than ${selfVs.name}.`
          : d < -0.4
            ? ` Inflation runs ${Math.abs(d).toFixed(1)}pp cooler than ${selfVs.name}.`
            : ` Inflation is roughly in line with ${selfVs.name}.`;
    }
    ko.push(`옆자리 피어를 곁에 두면 — ${peerBits}.${compareKo}`);
    en.push(`Beside its peers — ${peerBitsEn}.${compareEn}`);
  }

  ko.push(`이 장면의 숫자는 ${SOTW_ATTRIBUTION} 기준입니다. 지표마다 시점과 정의가 다를 수 있으니, 표가 아니라 이야기의 소품으로 읽어 주세요.`);
  en.push(`Figures via ${SOTW_ATTRIBUTION} (World Bank / IMF family). Treat vintages as props in the story, not a ledger.`);

  return { ko, en };
}

async function fetchPeerSnapshot(iso: string): Promise<SotwMacroDeep["peers"][number] | null> {
  try {
    const payload = await sotwFetchJson<SotwCountryPayload>(
      `/api/v1/countries/${encodeURIComponent(iso)}`,
      { cacheKey: `sotw:country:${iso}` },
    );
    const levels = pickLevels(payload.indicators);
    const gdpPc = pickSotwIndicator(payload.indicators, ["NY.GDP.PCAP.CD", "IMF.NGDPDPC"]);
    return {
      id: payload.country?.id ?? iso,
      name: payload.country?.name ?? iso,
      inflationPct: levels.inflation.value,
      gdpGrowthPct: levels.growth.value,
      gdpPerCapitaUsd: gdpPc.value,
    };
  } catch {
    return null;
  }
}

/** 국가 힌트 → 딥 매크로 (히스토리 충격 + 피어 + 내러티브) */
export async function fetchSotwMacroDeep(hint: string): Promise<SotwMacroDeep> {
  if (!getSotwApiKey()) {
    return emptyCard({
      disabled: true,
      reason: "STATSOFTHEWORLD_API_KEY not set",
      attribution: SOTW_ATTRIBUTION,
    });
  }

  const iso = resolveSotwCountryIso(hint);
  if (!iso) {
    return emptyCard({
      disabled: false,
      name: hint,
      error: "unmapped country hint",
      attribution: SOTW_ATTRIBUTION,
    });
  }

  const payload = await sotwFetchJson<SotwCountryPayload>(
    `/api/v1/countries/${encodeURIComponent(iso)}`,
    { cacheKey: `sotw:country:${iso}` },
  );
  const base = buildCountryCard(payload, hint, iso);
  const levels = pickLevels(payload.indicators);

  const [inflSeries, growthSeries, ...peerRows] = await Promise.all([
    fetchHistorySeries("FP.CPI.TOTL.ZG", iso),
    fetchHistorySeries("NY.GDP.MKTP.KD.ZG", iso),
    ...(PEER_ISO[iso] ?? ["USA", "CHN"])
      .filter((p) => p !== iso)
      .slice(0, 2)
      .map((p) => fetchPeerSnapshot(p)),
  ]);

  const inflationShock = buildShock(inflSeries, "FP.CPI.TOTL.ZG", "인플레이션", "Inflation");
  const growthShock = buildShock(growthSeries, "NY.GDP.MKTP.KD.ZG", "실질 GDP 성장", "Real GDP growth");
  const peers = peerRows.filter((p): p is NonNullable<typeof p> => p != null);

  const inflationPct = levels.inflation.value ?? inflationShock?.latest ?? null;
  const gdpGrowthPct = levels.growth.value ?? growthShock?.latest ?? null;

  const yearHints: NonNullable<SotwCountryCard["yearHints"]> = { ...(base.yearHints ?? {}) };
  if (levels.inflation.year) yearHints.inflation = levels.inflation.year;
  if (levels.growth.year) yearHints.growth = levels.growth.year;
  if (levels.unemp.year) yearHints.unemployment = levels.unemp.year;

  const name = base.name ?? hint;
  const { ko, en } = buildNarratives({
    name,
    iso,
    inflationPct,
    gdpGrowthPct,
    unemploymentPct: levels.unemp.value,
    currentAccountPctGdp: levels.ca.value,
    govDebtPctGdp: levels.debt.value,
    gdpUsd: base.gdpUsd,
    gdpPerCapitaUsd: base.gdpPerCapitaUsd,
    tradePctGdp: base.tradePctGdp,
    milSpendPctGdp: base.milSpendPctGdp,
    inflationShock,
    growthShock,
    peers,
  });

  return {
    ...base,
    yearHints,
    incomeLevel: payload.country?.incomeLevel,
    inflationPct,
    gdpGrowthPct,
    unemploymentPct: levels.unemp.value,
    currentAccountPctGdp: levels.ca.value,
    govDebtPctGdp: levels.debt.value,
    exportsPctGdp: levels.exp.value,
    importsPctGdp: levels.imp.value,
    shocks: { inflation: inflationShock, growth: growthShock },
    peers,
    narrativeKo: ko,
    narrativeEn: en,
  };
}

/** 여러 국가 딥 매크로 (등불·비교용) — 병렬, 상한 4 */
export async function fetchSotwMacroDeepMany(hints: string[]): Promise<SotwMacroDeep[]> {
  const unique = [...new Set(hints.map((h) => h.trim()).filter(Boolean))].slice(0, 4);
  const rows = await Promise.all(unique.map((h) => fetchSotwMacroDeep(h)));
  return rows.filter((r) => !r.disabled && !r.error);
}

export function narrativeForLang(macro: SotwMacroDeep, lang: LabelLanguage): string[] {
  return lang === "en" ? macro.narrativeEn : macro.narrativeKo;
}

/** 시장 등불용 — 육하원칙 순서를 따르는 정례 브리핑 줄글 (라벨 나열 금지) */
export function composeMarketLampParagraphs(
  macros: SotwMacroDeep[],
  lang: LabelLanguage,
  opts?: { focusTitle?: string; koreanExtras?: string[] },
): string[] {
  if (macros.length === 0 && !(opts?.koreanExtras?.length)) return [];
  const out: string[] = [];
  const ko = lang !== "en";
  const names = macros.map((m) => m.name ?? m.id).filter(Boolean) as string[];
  const primary = macros[0];
  const yearHint =
    primary?.yearHints?.inflation ??
    primary?.yearHints?.growth ??
    primary?.shocks?.inflation?.latestYear ??
    primary?.shocks?.growth?.latestYear ??
    null;

  if (ko) {
    const where = opts?.focusTitle || names[0] || "세계 시장";
    const who = names.length > 0 ? names.join("·") : "시장 참여자";
    const when = yearHint ? `${yearHint}년 전후 거시 관측 창` : "금일 시장 관측 창";
    out.push(
      `보고드립니다. 기준 시점은 ${when}이며, 주요 관측 대상은 ${where}입니다. 집계에 포함된 주체는 ${who}입니다.`,
    );

    for (const extra of (opts?.koreanExtras ?? []).slice(0, 2)) {
      out.push(extra);
    }
    if (primary) {
      const infl = primary.inflationPct;
      const growth = primary.gdpGrowthPct;
      const whatBits: string[] = [];
      if (infl != null) whatBits.push(`물가 ${infl.toFixed(1)}%`);
      if (growth != null) whatBits.push(`성장 ${growth.toFixed(1)}%`);
      if (whatBits.length > 0) {
        out.push(
          `확인된 지표는 ${(primary.name ?? where)}의 ${whatBits.join("·")}입니다.`,
        );
      }
      const peer = primary.peers?.[0];
      if (peer && infl != null && peer.inflationPct != null) {
        const d = infl - peer.inflationPct;
        const why =
          Math.abs(d) < 0.4
            ? `${peer.name}과 물가 수준이 유사하여 동일 권역 흐름으로 읽습니다.`
            : d > 0
              ? `${peer.name}보다 물가가 ${Math.abs(d).toFixed(1)}%p 높아, 가격 경로를 우선 점검합니다.`
              : `${peer.name}보다 물가가 ${Math.abs(d).toFixed(1)}%p 낮아, 성장·외부 축을 함께 봅니다.`;
        out.push(`주목 배경은 다음과 같습니다. ${why}`);
      } else if (opts?.focusTitle) {
        out.push(
          `주목 배경은 「${opts.focusTitle}」이(가) 물자와 가격이 지나가는 병목이라는 점입니다.`,
        );
      }
    } else if (opts?.focusTitle) {
      out.push(
        `주목 배경은 「${opts.focusTitle}」 긴장이 에너지·물류·물가로 파급될 수 있다는 점입니다.`,
      );
    }

    out.push(
      "종합하면, 본 보고는 누가·언제·어디서·무엇을·왜·어떻게 순서로 확인된 사실만 정리한 것입니다. 수치는 Statistics of the World 기준이며 시리즈별 기준 시점이 다를 수 있습니다. 다음 보고는 자정 기준으로 갱신됩니다.",
    );
    return out;
  }

  const where = opts?.focusTitle || names[0] || "global markets";
  const who = names.length > 0 ? names.join(" & ") : "market actors";
  const when = yearHint ? `around ${yearHint}` : "this observation window";
  out.push(
    `Briefing. As of ${when}, the primary area of interest is ${where}. Actors in the aggregate: ${who}.`,
  );
  if (primary) {
    const bits: string[] = [];
    if (primary.inflationPct != null) bits.push(`inflation ${primary.inflationPct.toFixed(1)}%`);
    if (primary.gdpGrowthPct != null) bits.push(`growth ${primary.gdpGrowthPct.toFixed(1)}%`);
    if (bits.length) {
      out.push(`Recorded indicators for ${primary.name ?? where}: ${bits.join(" / ")}.`);
    }
  }
  out.push(
    "In summary, this report organizes verified observations in 5W1H order. Figures via Statistics of the World; vintages may vary. The next report updates at local midnight.",
  );
  return out;
}
