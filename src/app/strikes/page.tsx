import type { Metadata } from "next";
import Link from "next/link";
import StrikesClient from "@/components/strikes/StrikesClient";

/**
 * `/strikes` — "어떤 배가 진짜 맞았나".
 * 대상: 해운 중소기업 운항·안전 담당자. 피격 경보(UKMTO) → 주변 AIS 항적 → 맞은 배 후보 → 그 해역 보험료.
 * 판정 문구 원칙은 src/lib/strikeMatch/scoreCandidates.ts 머리말 참고 (거리만으로 "맞았다" 금지).
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "피격 확인 — 어떤 배가 맞았나",
  description:
    "홍해·호르무즈 상선 피격 경보마다 주변 AIS 항적으로 실제 맞은 배 후보를 좁히고, 그 해역의 보도 기준 전쟁위험 보험료를 함께 보여줍니다.",
};

export default function StrikesPage() {
  return (
    <div className="doc-surface">
      <main className="mx-auto min-h-screen max-w-3xl px-4 py-12 text-white/80 sm:px-5">
        <nav className="mb-8 text-xs text-white/40">
          <Link href="/" className="underline underline-offset-4 hover:text-white/70">
            지구본
          </Link>
          <span className="mx-2">/</span>
          <span>피격 확인</span>
        </nav>
        <header>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">어떤 배가 맞았나</h1>
          <p className="mt-4 leading-relaxed text-white/70">
            상선 피격 경보가 뜨면 그 시각·그 지점 근처에 있던 배들의 AIS 항적을 모아, 실제로 맞은 배를 좁힙니다.
            선명이 경보와 맞으면 <b className="text-white">확인</b>, 사건 직후 멈추거나 방향을 틀거나 신호가 끊긴 배가
            하나로 좁혀지면 <b className="text-white">유력</b>, 근처에 있었다는 것뿐이면 단정하지 않습니다.
          </p>
        </header>
        <StrikesClient />
        <footer className="mt-14 border-t border-white/10 pt-6 text-xs leading-relaxed text-white/40">
          <p>
            사건: UKMTO(영국 해군 해상무역작전본부) 공개 경보. 항적: 공개 AIS 수신 기록(30분 간격) — 원양에서는 수신 공백이
            있어 &quot;기록 없음&quot;이 &quot;배가 없었다&quot;는 뜻은 아닙니다.
          </p>
          <p className="mt-2">이 페이지는 공식 항행 경보나 보험 견적이 아닙니다. 운항 판단은 선사·보험사 공식 채널과 함께 하세요.</p>
        </footer>
      </main>
    </div>
  );
}
