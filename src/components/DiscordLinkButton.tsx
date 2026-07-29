"use client";

import type { LabelLanguage } from "@/lib/layerPrefs";
import { trackEvent } from "@/lib/trackClient";

const DISCORD_INVITE = process.env.NEXT_PUBLIC_DISCORD_INVITE ?? "";

/** 디스코드 초대 버튼 — NEXT_PUBLIC_DISCORD_INVITE 미설정 시 렌더 안 함 */
export function DiscordLinkButton({
  lang,
  className = "",
}: {
  lang: LabelLanguage;
  className?: string;
}) {
  if (!DISCORD_INVITE) return null;
  return (
    <a
      href={DISCORD_INVITE}
      target="_blank"
      rel="noreferrer noopener"
      onClick={() => trackEvent("discord_click", undefined, { lang })}
      aria-label={lang === "en" ? "Join our Discord" : "디스코드 참여"}
      className={`flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-indigo-300/25 bg-[#3b3f8f]/45 px-2.5 text-meta font-medium text-indigo-50/90 shadow-lg backdrop-blur-md transition hover:border-indigo-200/45 hover:bg-[#474cad]/55 ${className}`}
    >
      <span aria-hidden>💬</span>
      <span>{lang === "en" ? "Discord" : "디스코드"}</span>
    </a>
  );
}
