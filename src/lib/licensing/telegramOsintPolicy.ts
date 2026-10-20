/**
 * Telegram OSINT — LLM / 뉴스 파이프라인 분리 · 전문 비공개 정책
 *
 * 채널 목록 출처: IRONSIGHT (MIT, Nobler Works) — src/lib/licensing/ironsightPolicy.ts
 * @see docs/copyright-checklist.md
 */

/** 절대 규칙 (한국어) */
export const TELEGRAM_OSINT_ABSOLUTE_RULE_KO =
  "텔레그램 OSINT 게시물 전문은 제품에 넣지 않는다. 공개로는 약 절반 스니펫만 보이고, 나머지는 t.me CTA(또는 클릭 후 공식 embed)로만 연다. AI 요약 프롬프트의 컨텍스트로도 절대 넣지 않는다.";

export const TELEGRAM_OSINT_POLICY = {
  /** AI 요약·상관분석 프롬프트에 Telegram 텍스트 주입 금지 */
  forbidInLlmContext: true,
  /** 게시물 전문을 제품 화면·공개 JSON에 넣지 않음 — 절반 스니펫만 */
  forbidDisplayPostBody: true,
  /** 공개 미리보기는 원문의 약 절반(상한 있음) */
  publicSnippetHalf: true,
  /** 원문 열람은 t.me CTA(또는 사용자 클릭 후 공식 embed)만 */
  accessViaCtaOnly: true,
  /** 사람이 읽는 링크 데스크 UI만 허용 */
  displaySurface: ["TelegramOsintPanel", "IntelNewsSheet.telegram"] as const,
  /** /api/news-stream · buildNewsStream 과 별도 트랙 */
  separateFromNewsPipeline: true,
} as const;

export const TELEGRAM_OSINT_CHECKLIST = [
  "Telegram 속보는 Intel 뉴스창 Telegram / 텔레그램 영상 탭 또는 지구본 TelegramOsintPanel에서 표시",
  "게시물 전문은 공개하지 않음 — 공개 API는 약 절반 스니펫(+ textTruncated), 원문은 messageUrl CTA",
  "NewsStreamProvider · buildNewsStream · translateNewsStreamPayload · AI digest에 Telegram 본문 미포함",
  "AI 분석·요약 프롬프트에 Telegram 텍스트 미전달",
  "telegramTranslate는 내부 ingest 전용 — 공개 응답에는 전문 번역을 내보내지 않음 (UI 번역하기 CTA는 절반 스니펫만 온디맨드)",
  "영상은 재호스팅하지 않고 t.me 공식 embed를 사용자 클릭 시에만 로드",
] as const;

/**
 * Telegram 미디어(영상·사진) — 재호스팅 금지 정책
 *
 * 채널 게시물 텍스트와 별개로, 영상·사진 원본 파일 자체의 저작권 문제가 있다.
 * 재게시된 전선 영상은 텔레그램 채널 운영자 소유가 아닌 경우가 많고(드론 조종사·현지
 * 병사·국영매체 등에서 재유통), 파일을 다운로드해 자체 서버/R2/CDN에 올리는 순간
 * 무단 복제·재배포 리스크가 생긴다. 항상 텔레그램 공식 공개 임베드만 사용한다.
 *
 * @see docs/copyright-checklist.md — "Telegram 미디어 (영상·사진) — 재호스팅 금지"
 */
export const TELEGRAM_MEDIA_ABSOLUTE_RULE_KO =
  "영상·사진 원본 파일을 다운로드하거나 자체 스토리지(R2/S3 등)에 재호스팅하지 않는다. 항상 텔레그램 공식 공개 임베드(t.me/.../{id}?embed=1)를 iframe으로 그대로 띄우며, 사용자가 직접 클릭했을 때만 로드한다.";

export const TELEGRAM_MEDIA_POLICY = {
  /** 파일 다운로드·자체 스토리지 재호스팅 금지 — 항상 t.me 공식 embed iframe만 사용 */
  forbidRehosting: true,
  /** 자동재생·자동 프리로드 금지 — 사용자 클릭 후에만 iframe 마운트 */
  requireUserClickToLoad: true,
  /** 그래픽 콘텐츠(전장·폭격 영상) 경고 문구 필수 */
  requireGraphicContentWarning: true,
  /** 미검토 — 임베드 자체를 차단하는 비공개 채널 케이스는 변호사 미검토 */
  legalReviewed: false,
} as const;
