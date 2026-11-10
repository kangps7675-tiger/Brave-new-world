import type { Metadata } from "next";
import { LandingContent } from "@/components/landing/LandingContent";
import { absoluteUrl } from "@/lib/siteUrl";

export const metadata: Metadata = {
  title: "conflict-view — 정보기관 상황실처럼, 전선과 일정을 한눈에",
  description:
    "어느 전선이 움직였는지, 다음 공식 일정은 언제인지, 그 나라 헌법에는 뭐라고 적혀 있는지. 전선 속보·선거·당대회·헌법 원문을 3D 지구본 한 화면에. 공개 정보 기반, 가입 없이 바로 볼 수 있습니다.",
  alternates: { canonical: absoluteUrl("/landing") },
};

/** 공유·검색용 독립 랜딩. 첫 화면(/)에서는 같은 내용이 LandingCurtain으로 지구본 위에 덮인다. */
export default function LandingPage() {
  return <LandingContent />;
}
