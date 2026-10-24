"use client";

import Link from "next/link";
import { pick } from "@/components/landing/landingCopy";
import { useLandingLanguage } from "@/lib/landingLanguage";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";

export function InvestigateChrome({ children }: { children: React.ReactNode }) {
  const lang = useLandingLanguage();
  return (
    <div className="relative mx-auto flex min-h-screen max-w-xl flex-col px-4 pb-16 pt-10 sm:px-6">
      <header className="mb-10">
        <Link
          href="/"
          className="inline-block text-2xl font-semibold tracking-tight text-white sm:text-3xl"
          style={{ fontFamily: "var(--font-merriweather), Georgia, serif" }}
        >
          {BRAND_NAME[lang]}
        </Link>
        <p className="mt-2 max-w-[36ch] text-sm text-slate-400">{BRAND_TAGLINE[lang]}</p>
      </header>
      <section className="flex flex-1 flex-col">
        <h1
          className="text-[1.65rem] font-semibold leading-snug tracking-tight text-white sm:text-3xl"
          style={{ fontFamily: "var(--font-merriweather), Georgia, serif" }}
        >
          {lang === "en" ? (
            <>
              Check one line of a story
              <br />
              against the map
            </>
          ) : (
            <>
              기사 한 줄이 사실인지,
              <br />
              지도 위에서 확인합니다
            </>
          )}
        </h1>
        <p className="mt-3 max-w-[40ch] text-base leading-relaxed text-slate-300">
          {pick(
            lang,
            "URL이나 본문을 넣으면 어디서·언제 일어났는지 뽑고, 지금 확인할 수 있는 것과 없는 것을 나눠 보여 줍니다.",
            "Paste a URL or the body. Place and time are pulled out, then split into what the map can check and what it cannot.",
          )}
        </p>
        <div className="mt-8 rounded-lg border border-white/10 bg-black/45 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-sm sm:p-5">
          {children}
        </div>
        <ul className="mt-8 space-y-2 text-sm text-slate-500">
          <li>
            {pick(
              lang,
              "· 자동 결과는 대부분 「확인 못 함」에서 시작합니다.",
              "· An automatic result usually starts as “not confirmed”.",
            )}
          </li>
          <li>
            {pick(
              lang,
              "· 열점·공습·위성 근거는 관측 모드에서 편집자가 붙입니다.",
              "· Heat, air-raid, and satellite evidence is attached by an editor in observatory mode.",
            )}
          </li>
          <li>
            {pick(lang, "· 결과는 링크로 공유할 수 있습니다.", "· The result can be shared as a link.")}
          </li>
        </ul>
      </section>
    </div>
  );
}
