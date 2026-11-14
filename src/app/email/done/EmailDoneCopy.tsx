"use client";

import Link from "next/link";
import { pick } from "@/components/landing/landingCopy";
import { useLandingLanguage } from "@/lib/landingLanguage";

const COPY: Record<string, { ko: { title: string; body: string }; en: { title: string; body: string } }> = {
  confirmed: {
    ko: {
      title: "구독이 확인되었습니다",
      body: "새 피격 사건과 보도 기준 전쟁위험 보험료를 하루 한 번 보내 드립니다. 보험료는 시세가 아니라 기사에 실린 수치입니다.",
    },
    en: {
      title: "Subscription confirmed",
      body: "You will get one email a day with new ship incidents and reported war-risk figures. Those figures are from articles, not a live market price.",
    },
  },
  unsubscribed: {
    ko: { title: "수신을 해지했습니다", body: "더 이상 메일이 가지 않습니다." },
    en: { title: "You have unsubscribed", body: "No further emails will be sent." },
  },
  invalid: {
    ko: { title: "링크가 유효하지 않습니다", body: "이미 확인했거나 주소가 바뀌었을 수 있습니다." },
    en: { title: "This link is not valid", body: "It may already have been used, or the address may have changed." },
  },
};

export function EmailDoneCopy({ result }: { result?: string }) {
  const lang = useLandingLanguage();
  const row = COPY[result ?? ""] ?? COPY.invalid!;
  const copy = row[lang];
  return (
    <>
      <h1 className="mt-2 text-2xl font-semibold">{copy.title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-amber-100/80">{copy.body}</p>
      <Link href="/" className="mt-8 text-sm text-amber-200 underline underline-offset-4">
        {pick(lang, "지도로 돌아가기", "Back to the globe")}
      </Link>
    </>
  );
}
