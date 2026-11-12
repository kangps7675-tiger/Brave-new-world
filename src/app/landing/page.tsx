import type { Metadata } from "next";
import { LandingContent } from "@/components/landing/LandingContent";
import { BRAND_NAME } from "@/lib/brand";
import { absoluteUrl } from "@/lib/siteUrl";

export const metadata: Metadata = {
  title: `${BRAND_NAME.ko} — 지정학 속보, 어디까지 확인됐을까`,
  description:
    "지정학 속보의 보도 출처와 위치를 다른 공개 자료와 대조합니다. 확인 상태와 전선, 다음 공식 일정, 헌법 원문을 3D 지구본에서 가입 없이 볼 수 있습니다.",
  alternates: { canonical: absoluteUrl("/landing") },
};

/** 공유·검색용 독립 랜딩. 첫 화면(/)에서는 같은 내용이 LandingCurtain으로 지구본 위에 덮인다. */
export default function LandingPage() {
  return <LandingContent />;
}
