/**
 * 서체 저작권 고지 — 「데이터 출처 · 라이선스」 패널에 노출.
 *
 * ⚠️ **웹폰트 서빙과 저장소 커밋은 "사용"이 아니라 "배포"다.**
 *    SIL OFL 제2조는 폰트 파일을 재배포할 때 저작권 고지와 라이선스 전문을
 *    반드시 동봉하도록 요구한다. 이 파일은 그 고지의 UI 측 정본이고,
 *    라이선스 전문은 `public/licenses/` 에 있다.
 *
 * 폰트를 추가할 때는 **파일을 `src/app/fonts/` 에 넣기 전에** 아래 세 곳을 먼저 갱신할 것:
 *   1. 이 배열
 *   2. `public/licenses/fonts.md` (목록)
 *   3. `public/licenses/*.txt` (라이선스 전문 — 신규 라이선스인 경우)
 *
 * CDN 로드(next/font/google · jsDelivr)는 파일을 배포하지 않으므로 제외한다.
 * — Inter · Merriweather · JetBrains Mono · Wanted Sans
 *
 * @see docs/copyright-audit-2026-08-01.md — R-1
 * @see public/licenses/fonts.md
 */

export type FontLicense = "SIL OFL 1.1" | "무료 배포 (상업 이용 가능)";

export type FontAttribution = {
  /** 서체 이름 */
  family: string;
  /** 저작권자 */
  holder: string;
  license: FontLicense;
  /** 공식 배포처 */
  url: string;
  /** `src/app/fonts/` 내 파일명 */
  files: readonly string[];
  /** 이 서비스에서의 용도 */
  usage: string;
};

export const FONT_ATTRIBUTIONS: readonly FontAttribution[] = [
  {
    family: "Pretendard",
    holder: "Kil Hyung-jin",
    license: "SIL OFL 1.1",
    url: "https://github.com/orioncactus/pretendard",
    files: ["PretendardVariable.ttf"],
    usage: "지경학 내비게이션",
  },
  {
    family: "Geist / Geist Mono",
    holder: "The Geist Project Authors (Vercel)",
    license: "SIL OFL 1.1",
    url: "https://github.com/vercel/geist-font",
    files: ["GeistVF.woff", "GeistMonoVF.woff"],
    usage: "기본 UI · 모노스페이스",
  },
  {
    family: "리디바탕 (RIDIBatang)",
    holder: "리디주식회사",
    license: "SIL OFL 1.1",
    url: "https://ridicorp.com/ridibatang/",
    files: ["RIDIBatang.otf"],
    usage: "양피지 브리핑 필체",
  },
  {
    family: "Gmarket Sans",
    holder: "지마켓",
    license: "무료 배포 (상업 이용 가능)",
    url: "https://company.gmarket.co.kr/company/about/company/company--font.asp",
    files: ["GmarketSansLight.otf", "GmarketSansMedium.otf", "GmarketSansBold.otf"],
    usage: "뉴스 · 속보 헤드라인",
  },
  {
    family: "SB 어그로",
    holder: "샌드박스네트워크",
    license: "무료 배포 (상업 이용 가능)",
    url: "https://sandbox.co.kr/font",
    files: ["SBAgro-Bold.ttf"],
    usage: "전쟁구역 사상자 수치",
  },
] as const;

/** "Pretendard — Kil Hyung-jin · SIL OFL 1.1" */
export function formatFontCredit(credit: FontAttribution): string {
  return `${credit.family} — ${credit.holder} · ${credit.license}`;
}
