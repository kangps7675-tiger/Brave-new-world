import type { Metadata } from "next";
import StrikesClient from "@/components/strikes/StrikesClient";
import { StrikesChrome } from "@/components/strikes/StrikesChrome";

/**
 * `/strikes` — "어떤 배가 진짜 맞았나".
 * 대상: 해운 중소기업 운항·안전 담당자. 피격 경보(UKMTO) → 주변 AIS 항적 → 맞은 배 후보 → 그 해역 보험료.
 * 판정 문구 원칙은 src/lib/strikeMatch/scoreCandidates.ts 머리말 참고 (거리만으로 "맞았다" 금지).
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Strike check — which ship was hit",
  description:
    "For each merchant-ship attack alert in the Red Sea and Hormuz, nearby AIS tracks narrow the vessel that was hit, with the reported war-risk premium for that sea.",
};

export default function StrikesPage() {
  return (
    <StrikesChrome>
      <StrikesClient />
    </StrikesChrome>
  );
}
