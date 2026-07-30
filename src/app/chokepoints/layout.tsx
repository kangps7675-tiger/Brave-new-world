/**
 * 초크포인트 문서 표면 레이아웃.
 *
 * 두 가지를 한다.
 *
 * 1. `lang="en"` — 루트 레이아웃의 `<html lang="ko">`를 이 서브트리에서만 덮는다.
 *    Next.js App Router는 `<html>`을 루트에서만 허용하므로 래퍼 요소에 건다.
 *    (HTML 사양상 유효하고, 크롤러·스크린리더 모두 서브트리 lang을 따른다.)
 *    이 페이지들의 독자는 영어권 검색·AI 인용이다. 지구본 본체의 한국어 UI와
 *    역할이 다르므로 언어 신호도 달라야 한다.
 *
 * 2. `.doc-surface` — body의 `user-select: none`(게임 셸)에서 빠져나온다.
 *    globals.css와 GameShellGuard.tsx의 예외 목록이 이 클래스와 한 쌍이다.
 */
export default function ChokepointsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div lang="en" className="doc-surface">
      {children}
    </div>
  );
}
