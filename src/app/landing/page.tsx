import type { Metadata } from "next";
import Link from "next/link";
import { LandingContent, type EnterPlace } from "@/components/landing/LandingContent";
import { absoluteUrl } from "@/lib/siteUrl";

export const metadata: Metadata = {
  title: "Brave New World — 이 바다, 지금 지나가도 될까요?",
  description:
    "피격 선박, 해역 상황, 전쟁위험 보험료, 해상 날씨, 지정학 뉴스를 해역별로 한 화면에 모았습니다. 모든 판정에 근거와 한계를 함께 적습니다.",
  alternates: { canonical: absoluteUrl("/landing") },
};

/** 공유·검색용 독립 랜딩. 첫 방문 화면에서는 같은 내용이 LandingCurtain으로 지구본 위에 덮인다. */
const ENTER_CLASS: Record<EnterPlace, string> = {
  nav: "rounded-md bg-[#0E1A24] px-[18px] py-3 font-semibold text-white no-underline hover:bg-[#1B2C38]",
  hero: "inline-flex h-[52px] items-center rounded-md bg-[#C2410C] px-6 text-base font-semibold text-white no-underline hover:bg-[#A8380A]",
  footer:
    "mt-8 inline-flex h-[52px] items-center rounded-md bg-[#0E1A24] px-6 text-base font-semibold text-white no-underline hover:bg-[#1B2C38]",
};

export default function LandingPage() {
  return (
    <LandingContent
      renderEnter={(place) => (
        <Link href="/" className={ENTER_CLASS[place]}>
          지구본 보기
        </Link>
      )}
    />
  );
}
