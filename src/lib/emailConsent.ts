/**
 * 이메일 구독 동의 문구 — 수집 항목·목적·보관·해지·거부 결과를 한 번에 보여 준다.
 * 화면(구독 칸)과 확인 메일이 같은 문구를 쓰도록 여기서만 관리한다.
 * ※ 법적 검토를 거친 문구가 아니다. 서비스 개시 전에 개인정보 처리방침과 함께 검토할 것.
 */
export const EMAIL_CONSENT = {
  ko: {
    label: "이메일 수집·이용에 동의합니다 (필수)",
    items: [
      "수집 항목: 이메일 주소, 언어 설정, 동의 시각",
      "이용 목적: 새 선박 피격 사건과 보도 기준 전쟁위험 보험료를 하루 한 번 발송",
      "보관 기간: 구독을 해지할 때까지. 해지 후에는 다시 구독하지 않는 한 발송하지 않으며, 주소는 중복 방지를 위해 해지 상태로 남을 수 있습니다",
      "동의를 거부할 수 있으며, 거부하면 메일을 받을 수 없습니다. 모든 메일 하단의 링크로 언제든 해지할 수 있습니다",
    ],
    required: "동의에 체크해 주세요.",
  },
  en: {
    label: "I agree to the collection and use of my email (required)",
    items: [
      "Collected: email address, language, time of consent",
      "Purpose: one daily email with new ship incidents and reported war-risk figures",
      "Retention: until you unsubscribe. After that nothing is sent unless you subscribe again; the address may remain marked as unsubscribed to prevent duplicates",
      "You may decline; without consent you cannot receive the email. Every email has an unsubscribe link",
    ],
    required: "Please tick the consent box.",
  },
} as const;
