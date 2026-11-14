"use client";

import Link from "next/link";
import { pick } from "@/components/landing/landingCopy";
import { useLandingLanguage } from "@/lib/landingLanguage";

export function LandingOpenLink({ className }: { className: string }) {
  const lang = useLandingLanguage();
  return (
    <Link href="/" className={className}>
      {pick(lang, "지구본 열기", "Open the globe")}
    </Link>
  );
}
