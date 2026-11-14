"use client";

import type { ReactNode } from "react";
import { pick } from "@/components/landing/landingCopy";
import { useLandingLanguage } from "@/lib/landingLanguage";

/** 현재 랜딩/레이어 언어에 맞춰 한 줄을 고른다. */
export function Tx({ ko, en }: { ko: string; en: string }) {
  return <>{pick(useLandingLanguage(), ko, en)}</>;
}

/** 영문 모드에서는 한국어 중복 줄을 숨긴다. */
export function KoOnly({ children }: { children: ReactNode }) {
  return useLandingLanguage() === "en" ? null : <>{children}</>;
}
