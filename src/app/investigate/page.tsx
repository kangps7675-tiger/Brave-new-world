import type { Metadata } from "next";
import { brandName } from "@/lib/brand";
import { absoluteUrl } from "@/lib/siteUrl";
import { InvestigateForm } from "./InvestigateForm";
import { InvestigateChrome } from "./InvestigateChrome";

export const metadata: Metadata = {
  title: `Article check · ${brandName("en")}`,
  description:
    "Paste a breaking story. See what can be checked on the map — and what cannot.",
  alternates: { canonical: absoluteUrl("/investigate") },
  openGraph: {
    title: `Article check · ${brandName("en")}`,
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
      <InvestigateChrome>
        <InvestigateForm />
      </InvestigateChrome>
    </main>
  );
}
