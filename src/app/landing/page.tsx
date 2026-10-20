import type { Metadata } from "next";
import Link from "next/link";
import { LandingContent, type EnterPlace } from "@/components/landing/LandingContent";
import { absoluteUrl } from "@/lib/siteUrl";

export const metadata: Metadata = {
  title: "Brave New World — 정보기관 상황실에 앉은 듯한 현장감",
  description:
    "어디에 미사일이 떨어졌는지, 어느 바다에서 배가 공격받았는지, 누가 어느 땅을 차지했는지. 세계의 전쟁과 분쟁 소식을 3D 지구본 하나에 실시간으로 겹쳐 보여 드립니다. 공개 정보(OSINT) 기반, 가입 없이 무료.",
  alternates: { canonical: absoluteUrl("/landing") },
};

/** 공유·검색용 독립 랜딩. 첫 화면(/)에서는 같은 내용이 LandingCurtain으로 지구본 위에 덮인다. */
const ENTER_CLASS: Record<EnterPlace, string> = {
  nav: "rounded-md bg-[#f5c451] px-[18px] py-3 font-bold text-[#05080d] no-underline hover:bg-[#ffd772]",
  hero: "inline-flex h-[54px] items-center rounded-md bg-[#f5c451] px-7 text-[17px] font-bold text-[#05080d] no-underline hover:bg-[#ffd772]",
  footer:
    "inline-flex h-[54px] items-center rounded-md bg-[#f5c451] px-7 text-[17px] font-bold text-[#05080d] no-underline hover:bg-[#ffd772]",
};

export default function LandingPage() {
  return (
    <LandingContent
      renderEnter={(place) => (
        <Link href="/" className={ENTER_CLASS[place]}>
          지구본 열기
        </Link>
      )}
    />
  );
}
