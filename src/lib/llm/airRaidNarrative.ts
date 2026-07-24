import { z } from "zod";
import { createHash } from "node:crypto";
import { getCached, setCached } from "@/lib/apiCache";
import {
  getAnthropicModel,
  getServerAnthropicApiKey,
  isLlmDailyLampEnabled,
} from "@/lib/llm/anthropicEnv";
import { callClaudeMessages } from "@/lib/llm/claudeMessages";
import {
  formatAlertIssuedAt,
  inferIsraelApproachHint,
} from "@/lib/airRaidBriefHints";

export type AirRaidBriefInput = {
  kind: "tzeva" | "neptun" | "newfeeds";
  lang: "ko" | "en";
  region: string;
  title?: string;
  lat: number;
  lng: number;
  /** 원문 발령 시각 문자열 (ISO·Oref 형식 등) */
  since?: string;
  activeCount?: number;
  /** 위협 유형 라벨 — 로켓·미사일 / UAV 등 */
  threatLabel?: string;
  /** 접근·발사 방면 추정 문장 (미확인이면 생략 가능) */
  approachFrom?: string;
  /** 주·구·시 등 상세 위치 */
  locationDetail?: string;
};

export type AirRaidBriefResult = {
  title: string;
  paragraphs: string[];
  llmEnhanced: boolean;
  model?: string;
};

const outputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  paragraphs: z.array(z.string().trim().min(1).max(1_100)).min(2).max(5),
});

const CACHE_TTL_MS = 30 * 60 * 1000;

function kindLabel(kind: AirRaidBriefInput["kind"], lang: "ko" | "en"): string {
  if (lang === "en") {
    if (kind === "tzeva") return "Israel Home Front Command (Tzeva Adom)";
    if (kind === "neptun") return "Ukraine NEPTUN air-raid network";
    return "Iran / NewFeeds attack desk";
  }
  if (kind === "tzeva") return "이스라엘 홈프론트 커맨드(체바 아돔)";
  if (kind === "neptun") return "우크라이나 NEPTUN 공습경보망";
  return "이란·NewFeeds 공격 보고";
}

function placePhrase(input: AirRaidBriefInput, ko: boolean): string {
  const detail = input.locationDetail?.trim();
  if (detail && detail !== input.region) {
    return ko
      ? `${input.region}(${detail}) 일대`
      : `the ${input.region} area (${detail})`;
  }
  return ko ? `${input.region} 일대` : `the ${input.region} area`;
}

/**
 * 템플릿 원고 — 단순 나열이 아니라 언제·어디·어느 방면·무엇을 줄글로 엮음.
 */
export function buildAirRaidDraft(input: AirRaidBriefInput): AirRaidBriefResult {
  const ko = input.lang !== "en";
  const source = kindLabel(input.kind, input.lang);
  const when = formatAlertIssuedAt(input.since, input.lang);
  const place = placePhrase(input, ko);
  const threat =
    input.threatLabel?.trim() ||
    (ko ? "공습·공중 위협" : "an air threat");
  const approach =
    input.approachFrom?.trim() ||
    (input.kind === "tzeva"
      ? inferIsraelApproachHint(input.lat, input.lng, input.lang)
      : ko
        ? "어느 방향에서 접근했는지는 이 경보 피드에 명시되어 있지 않습니다"
        : "The alert feed does not state which direction the threat approached from");
  const countNote =
    typeof input.activeCount === "number" && input.activeCount > 1
      ? ko
        ? ` 같은 시각 전후 활성 경보는 ${input.activeCount}건이 함께 집계되고 있습니다.`
        : ` Around the same window, ${input.activeCount} alerts are counted as active.`
      : "";
  const titleExtra = input.title?.trim();
  const titleNote =
    titleExtra && titleExtra !== input.region
      ? ko
        ? ` 경보 표기는 「${titleExtra}」입니다.`
        : ` The alert is titled "${titleExtra}".`
      : "";

  const title = ko
    ? `공습경보 · ${input.region}`
    : `Air-raid alert · ${input.region}`;

  const paragraphs = ko
    ? [
        `${when}부터 ${source}가 ${place}에 공습경보를 발령한 것으로 수신되었습니다.${titleNote}${countNote}`,
        `경보가 걸린 위치는 ${place}이며, 지도상 대략 위도 ${input.lat.toFixed(2)}·경도 ${input.lng.toFixed(2)} 부근입니다. 주민·대피 안내의 기준점은 이 구역입니다.`,
        `위협 성격은 「${threat}」 쪽으로 분류되어 있습니다. ${approach}. 누가 쐈는지·어떤 발사대인지는 공개 경보만으로 단정할 수 없어 미확인으로 둡니다.`,
        `지금 단계에서 우선할 것은 해당 위치의 엄폐·대피 지침이며, 추가 전언은 교차 확인 전까지 미확인으로 취급해야 합니다.`,
      ]
    : [
        `From ${when}, ${source} issued an air-raid alert for ${place}.${titleNote}${countNote}`,
        `The warned location is ${place}, roughly lat ${input.lat.toFixed(2)}, lng ${input.lng.toFixed(2)} on the map — that locality is the reference for shelter guidance.`,
        `The threat is classed as ${threat}. ${approach}. Who fired, and from which launcher, stays unverified on this public alert alone.`,
        `Shelter instructions for that location come first; treat further field claims as unverified until cross-checked.`,
      ];

  return { title, paragraphs, llmEnhanced: false };
}

function extractJson(text: string): unknown {
  const unfenced = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const start = unfenced.indexOf("{");
  const end = unfenced.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Claude JSON 응답을 찾지 못했습니다.");
  return JSON.parse(unfenced.slice(start, end + 1));
}

/**
 * 공습경보 순간 브리핑 — 언제·어디·어느 방면·무엇을 줄글로.
 * 실패 시 템플릿 원고 그대로.
 */
export async function rewriteAirRaidBrief(
  input: AirRaidBriefInput,
): Promise<AirRaidBriefResult> {
  const draft = buildAirRaidDraft(input);
  if (!isLlmDailyLampEnabled()) return draft;

  const apiKey = getServerAnthropicApiKey();
  if (!apiKey) return draft;

  const digest = createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex")
    .slice(0, 20);
  const cacheKey = `claude-air-raid-v2:${input.kind}:${input.lang}:${digest}`;
  const cached = getCached<AirRaidBriefResult>(cacheKey);
  if (cached) return cached;

  const korean = input.lang === "ko";
  const system = korean
    ? [
        "당신은 국가 상황실의 공습경보 속보 브리핑관이다.",
        "단순 정보 나열이 아니라, 확인된 핵심을 짧은 줄글로 이어 쓰라.",
        "반드시 다음을 본문에 자연스럽게 녹여라: (1) 언제부터 발령됐는지 (2) 경보 위치는 어디인지 (3) 어느 쪽에서 날아오는지·접근 방면(미확인이면 미확인이라고) (4) 위협 유형이 무엇인지.",
        "입력에 없는 발사 주체·무기·전과를 단정하지 마라. 모르는 것은 '미확인'으로 명시하라.",
        "좌표는 문장 속에 녹이되 '위도 n, 경도 n'만 단독 나열하지 마라.",
        "건조한 공식 문체. 감상적 비유 금지. JSON만 출력 {title, paragraphs}.",
      ].join("\n")
    : [
        "You are the duty officer delivering an air-raid flash briefing.",
        "Write short connected prose — not a bullet dump.",
        "Weave in: (1) when the alert started (2) where the warned location is (3) which direction it came from / approach (or say unverified) (4) what kind of threat.",
        "Do not invent attackers, launchers, or battle outcomes. Mark gaps as unverified.",
        "Embed coordinates in prose; do not dump bare lat/lng lines.",
        "Official tone only. Return JSON only {title, paragraphs}.",
      ].join("\n");

  const result = await callClaudeMessages({
    apiKey,
    model: getAnthropicModel(),
    maxTokens: 1100,
    system,
    user: JSON.stringify({
      task: korean
        ? "제목 1개와 문단 2~4개. 언제·어디·방면·위협유형을 줄글로."
        : "One title and 2-4 paragraphs weaving when/where/approach/threat type.",
      facts: {
        kind: input.kind,
        region: input.region,
        locationDetail: input.locationDetail ?? null,
        title: input.title ?? null,
        issuedAt: formatAlertIssuedAt(input.since, input.lang),
        lat: input.lat,
        lng: input.lng,
        threatLabel: input.threatLabel ?? null,
        approachFrom: input.approachFrom ?? null,
        activeCount: input.activeCount ?? null,
      },
      draft: { title: draft.title, paragraphs: draft.paragraphs },
    }),
  });

  if (!result.ok) return draft;

  try {
    const parsed = outputSchema.parse(extractJson(result.text));
    const enhanced: AirRaidBriefResult = {
      ...parsed,
      llmEnhanced: true,
      model: result.model,
    };
    setCached(cacheKey, enhanced, CACHE_TTL_MS);
    return enhanced;
  } catch {
    return draft;
  }
}
