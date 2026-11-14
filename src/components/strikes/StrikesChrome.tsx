"use client";

import Link from "next/link";
import { pick } from "@/components/landing/landingCopy";
import { useLandingLanguage } from "@/lib/landingLanguage";

export function StrikesChrome({ children }: { children: React.ReactNode }) {
  const lang = useLandingLanguage();
  return (
    <div className="doc-surface">
      <main className="mx-auto min-h-screen max-w-3xl px-4 py-12 text-white/80 sm:px-5">
        <nav className="mb-8 text-xs text-white/40">
          <Link href="/" className="underline underline-offset-4 hover:text-white/70">
            {pick(lang, "지구본", "Globe")}
          </Link>
          <span className="mx-2">/</span>
          <span>{pick(lang, "피격 확인", "Strike check")}</span>
        </nav>
        <header>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {pick(lang, "어떤 배가 맞았나", "Which ship was hit")}
          </h1>
          <p className="mt-4 leading-relaxed text-white/70">
            {lang === "en" ? (
              <>
                When a merchant-ship attack alert arrives, we gather AIS tracks of ships that were nearby at that time and place, and narrow the vessel that was hit.
                If the name in the alert matches AIS, that is <b className="text-white">confirmed</b>. If one ship nearby stopped, turned, or went dark right after the event, that is{" "}
                <b className="text-white">likely</b>. Being nearby alone is not enough to say it was hit.
              </>
            ) : (
              <>
                상선 피격 경보가 뜨면 그 시각·그 지점 근처에 있던 배들의 AIS 항적을 모아, 실제로 맞은 배를 좁힙니다.
                선명이 경보와 맞으면 <b className="text-white">확인</b>, 사건 직후 멈추거나 방향을 틀거나 신호가 끊긴 배가
                하나로 좁혀지면 <b className="text-white">유력</b>, 근처에 있었다는 것뿐이면 단정하지 않습니다.
              </>
            )}
          </p>
        </header>
        {children}
        <footer className="mt-14 border-t border-white/10 pt-6 text-xs leading-relaxed text-white/40">
          <p>
            {pick(
              lang,
              "사건: UKMTO(영국 해군 해상무역작전본부) 공개 경보. 항적: 공개 AIS 수신 기록(30분 간격) — 원양에서는 수신 공백이 있어 \"기록 없음\"이 \"배가 없었다\"는 뜻은 아닙니다.",
              "Incidents: public UKMTO alerts. Tracks: public AIS position history (about every 30 minutes). In open ocean a gap in reception is not the same as “no ship was there”.",
            )}
          </p>
          <p className="mt-2">
            {pick(
              lang,
              "이 페이지는 공식 항행 경보나 보험 견적이 아닙니다. 운항 판단은 선사·보험사 공식 채널과 함께 하세요.",
              "This page is not an official navigational warning or an insurance quote. Use the line’s and the insurer’s official channels for the decision.",
            )}
          </p>
        </footer>
      </main>
    </div>
  );
}
