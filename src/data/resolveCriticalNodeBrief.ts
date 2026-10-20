import {
  criticalNodeForEconNavId,
  getCriticalNode,
  CRITICAL_NODES_ATTRIBUTION,
  type CriticalNode,
} from "@/data/criticalNodes";
import type {
  EconInsightBrief,
  EconInsightMarketLink,
  InsightRiskLevel,
} from "@/data/econInsightBriefs";
import { resolveEconInsightBrief } from "@/data/econInsightBriefs";

function riskFromNode(node: CriticalNode): InsightRiskLevel {
  if (node.risk === "critical") return "CRITICAL";
  if (node.risk === "high") return "HIGH";
  return "STABLE";
}

function briefFromCriticalNode(node: CriticalNode): EconInsightBrief {
  const marketLinks: EconInsightMarketLink[] = [];
  return {
    navId: node.id,
    titleKo: node.name,
    titleEn: node.name,
    riskLevel: riskFromNode(node),
    impactLine: node.flow || node.metric || node.plain.slice(0, 96),
    marketLinks,
    paragraphs: [
      node.plain,
      `무엇을 통제하나 — ${node.what}`,
      `왜 중요한가 — ${node.why}`,
      `단절되면 — ${node.disruption}`,
      ...(node.realEvent ? [`실제 사건 — ${node.realEvent}`] : []),
      CRITICAL_NODES_ATTRIBUTION,
    ],
    countryHint: node.country,
    criticalNodeId: node.id,
  };
}

/** Nav·레이어 클릭 공용 — 큐레이션 브리프 우선, 없으면 Critical Node Atlas */
export function resolveCriticalNodeBrief(opts: {
  navId?: string | null;
  criticalNodeId?: string | null;
}): EconInsightBrief | null {
  if (opts.navId) {
    const curated = resolveEconInsightBrief(opts.navId);
    if (curated) return curated;
    const mapped = criticalNodeForEconNavId(opts.navId);
    if (mapped) return briefFromCriticalNode(mapped);
  }
  if (opts.criticalNodeId) {
    const byNav = resolveEconInsightBrief(opts.criticalNodeId);
    if (byNav) return byNav;
    const node = getCriticalNode(opts.criticalNodeId);
    if (node) return briefFromCriticalNode(node);
  }
  return null;
}
