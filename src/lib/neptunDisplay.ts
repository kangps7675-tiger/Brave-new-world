import type { NeptunConfidence, NeptunThreat, NeptunThreatType } from "@/lib/neptun";
import { translateText } from "@/lib/koreanTranslate";
import type { LabelLanguage } from "@/lib/layerPrefs";

export const NEPTUN_TYPE_LABEL_KO: Record<NeptunThreatType, string> = {
  uav: "드론 (샤헤드)",
  recon: "정찰 드론",
  missile: "순항 미사일",
  ballistic: "탄도 미사일",
  kab: "유도폭탄",
  mig31k: "전투기 미사일",
  unknown: "공중 위협",
};

export const NEPTUN_TYPE_LABEL_EN: Record<NeptunThreatType, string> = {
  uav: "UAV (Shahed)",
  recon: "Recon drone",
  missile: "Cruise missile",
  ballistic: "Ballistic missile",
  kab: "Guided bomb",
  mig31k: "Fighter-launched missile",
  unknown: "Air threat",
};

export const NEPTUN_CONFIDENCE_LABEL_KO: Record<NeptunConfidence, string> = {
  low: "낮음",
  medium: "보통",
  high: "높음",
};

export const NEPTUN_CONFIDENCE_LABEL_EN: Record<NeptunConfidence, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export function neptunTypeLabel(type: string, lang: LabelLanguage = "ko"): string {
  const table = lang === "en" ? NEPTUN_TYPE_LABEL_EN : NEPTUN_TYPE_LABEL_KO;
  return table[type as NeptunThreatType] ?? table.unknown;
}

export function neptunConfidenceLabel(level: NeptunConfidence, lang: LabelLanguage = "ko"): string {
  const table = lang === "en" ? NEPTUN_CONFIDENCE_LABEL_EN : NEPTUN_CONFIDENCE_LABEL_KO;
  return table[level] ?? level;
}

export async function localizeNeptunThreatCopy(
  threat: Pick<NeptunThreat, "title" | "region" | "district" | "locality" | "explanationShort">,
  lang: LabelLanguage,
): Promise<{
  title: string;
  location: string;
  explanation: string | null;
}> {
  const location = [threat.locality, threat.district, threat.region].filter(Boolean).join(" · ");

  const [title, loc, explanation] = await Promise.all([
    threat.title
      ? translateText(threat.title, lang)
      : Promise.resolve(neptunTypeLabel("unknown", lang)),
    location ? translateText(location, lang) : Promise.resolve(""),
    threat.explanationShort
      ? translateText(threat.explanationShort, lang)
      : Promise.resolve(null),
  ]);

  return {
    title: title || threat.title || neptunTypeLabel("unknown", lang),
    location: loc || location,
    explanation: explanation ?? threat.explanationShort ?? null,
  };
}

export async function localizeNeptunAlertName(name: string, lang: LabelLanguage): Promise<string> {
  if (!name.trim()) return name;
  return translateText(name, lang);
}
