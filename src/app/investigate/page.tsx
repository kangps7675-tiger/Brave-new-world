import type { Metadata } from "next";
import Link from "next/link";
import { brandName, BRAND_TAGLINE } from "@/lib/brand";
import { absoluteUrl } from "@/lib/siteUrl";
import { InvestigateForm } from "./InvestigateForm";

export const metadata: Metadata = {
  title: `기사 확인 · ${brandName("ko")}`,
  description:
    "속보·기사를 붙여 넣으면 장소와 시각을 뽑고, 지도로 확인된 것과 확인하지 못한 것을 나눠 보여 줍니다.",
  alternates: { canonical: absoluteUrl("/investigate") },
  openGraph: {
    title: `기사 확인 · ${brandName("en")}`,
    description:
      "Paste a breaking story. See what can be checked on the map — and what cannot.",
    url: absoluteUrl("/investigate"),
  },
};

/**
 * 일반 유저 진입면 — 넣기 → 자동 초안 결과 카드.
 * 센서 근거 첨부·편집은 관측 탭(편집 토큰)에서만.
 */
export default function InvestigatePage() {
  return (
    <main className="relative min-h-screen overflow-hidden text-slate-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% -10%, rgba(244,63,94,0.14) 0%, transparent 55%), radial-gradient(ellipse 50% 40% at 90% 80%, rgba(0,255,204,0.06) 0%, transparent 50%), #070b12",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.9) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative mx-auto flex min-h-screen max-w-xl flex-col px-4 pb-16 pt-10 sm:px-6">
        <header className="mb-10">
          <Link
            href="/"
            className="inline-block text-2xl font-semibold tracking-tight text-white sm:text-3xl"
            style={{ fontFamily: "var(--font-merriweather), Georgia, serif" }}
          >
            {brandName("ko")}
          </Link>
          <p className="mt-2 max-w-[36ch] text-sm text-slate-400">
            {BRAND_TAGLINE.ko}
          </p>
        </header>

        <section className="flex flex-1 flex-col">
          <h1
            className="text-[1.65rem] font-semibold leading-snug tracking-tight text-white sm:text-3xl"
            style={{ fontFamily: "var(--font-merriweather), Georgia, serif" }}
          >
            기사 한 줄이 사실인지,
            <br />
            지도 위에서 확인합니다
          </h1>
          <p className="mt-3 max-w-[40ch] text-base leading-relaxed text-slate-300">
            URL이나 본문을 넣으면 어디서·언제 일어났는지 뽑고, 지금 확인할 수
            있는 것과 없는 것을 나눠 보여 줍니다.
          </p>

          <div className="mt-8 rounded-lg border border-white/10 bg-black/45 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-sm sm:p-5">
            <InvestigateForm />
          </div>

          <ul className="mt-8 space-y-2 text-sm text-slate-500">
            <li>· 자동 결과는 대부분 「확인 못 함」에서 시작합니다.</li>
            <li>· 열점·공습·위성 근거는 관측 모드에서 편집자가 붙입니다.</li>
            <li>· 결과는 링크로 공유할 수 있습니다.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
