/**
 * Telegram OSINT — LLM / 뉴스 파이프라인 분리 정책
 *
 * 채널 목록 출처: IRONSIGHT (MIT, Nobler Works) — src/lib/licensing/ironsightPolicy.ts
 * @see docs/copyright-checklist.md
 */

/** 절대 규칙 (한국어) */
export const TELEGRAM_OSINT_ABSOLUTE_RULE_KO =
  "텔레그램 OSINT 콘텐츠는 AI 요약 프롬프트의 컨텍스트로 절대 넣지 않는다. 사람이 읽는 raw 피드(Intel 뉴스창 Telegram 탭 · TelegramOsintPanel)로만 존재하고, LLM 파이프라인과는 완전히 분리된 별도 트랙으로 유지한다.";

export const TELEGRAM_OSINT_POLICY = {
  /** AI 요약·상관분석 프롬프트에 Telegram 텍스트 주입 금지 */
  forbidInLlmContext: true,
  /** 사람이 읽는 raw 피드 UI만 허용 */
  displaySurface: ["TelegramOsintPanel", "IntelNewsSheet.telegram"] as const,
  /** /api/news-stream · buildNewsStream 과 별도 트랙 */
  separateFromNewsPipeline: true,
} as const;

export const TELEGRAM_OSINT_CHECKLIST = [
  "Telegram 속보는 Intel 뉴스창 Telegram / 텔레그램 영상 탭 또는 지구본 TelegramOsintPanel에서 표시",
  "NewsStreamProvider · buildNewsStream · translateNewsStreamPayload · AI digest에 Telegram 본문 미포함",
  "AI 분석·요약 프롬프트에 Telegram 텍스트 미전달",
  "telegramTranslate는 패널 표시용 한국어 변환만 — 뉴스 LLM 경로와 무관",
  "영상은 재호스팅하지 않고 t.me 공식 embed를 사용자 클릭 시에만 로드",
] as const;
