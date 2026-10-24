import type { Metadata } from "next";
import { LandingOpenLink } from "@/components/landing/LandingOpenLink";
import { LandingContent, type EnterPlace } from "@/components/landing/LandingContent";
import { absoluteUrl } from "@/lib/siteUrl";

export const metadata: Metadata = {
  title: "Strait Desk — 정보기관 상황실처럼, 바다의 위험을 한눈에",
  description:
    "어느 배가 맞았는지, 그 바다가 지금 얼마나 위험한지, 전쟁위험 보험료는 얼마나 올랐는지. 피격 경보·선박 위치·항구 타격·항행경보를 3D 지구본 한 화면에. 공개 정보(OSINT) 기반, 가입 없이 무료.",
  alternates: { canonical: absoluteUrl("/landing") },
};

/** 공유·검색용 독립 랜딩. 첫 화면(/)에서는 같은 내용이 LandingCurtain으로 지구본 위에 덮인다. */
const ENTER_CLASS: Record<EnterPlace, string> = {
  nav: "rounded-md bg-[#f5c451] px-[18px] py-3 font-bold text-[#05080d] no-underline hover:bg-[#ffd772]",
  hero: "landing-cta-glow inline-flex h-[54px] items-center rounded-md bg-[#f5c451] px-7 text-[17px] font-bold text-[#05080d] no-underline hover:bg-[#ffd772]",
  footer:
    "inline-flex h-[54px] items-center rounded-md bg-[#f5c451] px-7 text-[17px] font-bold text-[#05080d] no-underline hover:bg-[#ffd772]",
};

export default function LandingPage() {
  return (
    <LandingContent
      renderEnter={(place) => (
        <LandingOpenLink className={ENTER_CLASS[place]} />
      )}
    />
  );
}
