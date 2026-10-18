import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "이메일 · 멋진 신세계",
  robots: { index: false, follow: false },
};

const COPY: Record<string, { title: string; body: string }> = {
  confirmed: {
    title: "구독이 확인되었습니다",
    body: "새 피격 사건과 보도 기준 전쟁위험 보험료를 하루 한 번 보내 드립니다. 보험료는 시세가 아니라 기사에 실린 수치입니다.",
  },
  unsubscribed: {
    title: "수신을 해지했습니다",
    body: "더 이상 메일이 가지 않습니다.",
  },
  invalid: {
    title: "링크가 유효하지 않습니다",
    body: "이미 확인했거나 주소가 바뀌었을 수 있습니다.",
  },
};

export default function EmailDonePage({
  searchParams,
}: {
  searchParams: { result?: string };
}) {
  const copy = COPY[searchParams.result ?? ""] ?? COPY.invalid!;
  return (
    <main className="mx-auto flex min-h-[70dvh] max-w-md flex-col justify-center px-6 text-amber-50">
      <p className="text-xs tracking-wide text-amber-200/60">멋진 신세계</p>
      <h1 className="mt-2 text-2xl font-semibold">{copy.title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-amber-100/80">{copy.body}</p>
      <Link href="/" className="mt-8 text-sm text-amber-200 underline underline-offset-4">
        지도로 돌아가기
      </Link>
    </main>
  );
}
