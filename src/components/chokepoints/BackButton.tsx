"use client";

import { useRouter } from "next/navigation";

/**
 * 해협 안내 페이지 왼쪽 위에 떠 있는 뒤로가기.
 * 사이트 안에서 들어왔으면 브라우저 뒤로(랜딩·지구본으로 복귀), 직접 열었으면 첫 화면으로 간다.
 */
export function BackButton() {
  const router = useRouter();
  const onClick = () => {
    let internal = false;
    try {
      internal = !!document.referrer && new URL(document.referrer).origin === window.location.origin;
    } catch {
      internal = false;
    }
    if (internal && window.history.length > 1) router.back();
    else router.push("/");
  };
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="뒤로 가기"
      className="fixed left-4 top-4 z-50 inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-white/25 bg-[#0a141f]/90 pl-4 pr-5 font-[inherit] text-body font-semibold text-white shadow-[0_6px_20px_rgba(0,0,0,0.45)] backdrop-blur hover:border-white/60"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M11 3 L5 9 L11 15" />
      </svg>
      뒤로 가기
    </button>
  );
}
