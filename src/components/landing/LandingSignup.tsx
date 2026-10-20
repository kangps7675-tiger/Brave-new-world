"use client";

import { useState, type FormEvent } from "react";
import { EMAIL_CONSENT } from "@/lib/emailConsent";

/**
 * 랜딩 하단 메일 신청. 기존 `/api/email/subscribe`(하루 한 번 메일, 확인 링크 이중 동의)를 그대로 쓴다.
 * `company` 칸은 봇 걸러내기용 숨은 칸이다 — 실제 회사명 입력으로 쓰지 말 것.
 */
export function LandingSignup() {
  const [consent, setConsent] = useState(false);
  const [phase, setPhase] = useState<"idle" | "sending" | "sent" | "invalid" | "down" | "consent">("idle");
  const copy = EMAIL_CONSENT.ko;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (phase === "sending") return;
    if (!consent) {
      setPhase("consent");
      return;
    }
    const data = new FormData(event.currentTarget);
    setPhase("sending");
    try {
      const res = await fetch("/api/email/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(data.get("email") ?? ""),
          lang: "ko",
          company: String(data.get("company") ?? ""),
          consent: true,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (json.error === "consent_required") return setPhase("consent");
      if (res.status === 400 || json.error === "invalid email") return setPhase("invalid");
      if (!res.ok || json.ok === false) return setPhase("down");
      setPhase("sent");
    } catch {
      setPhase("down");
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="relative flex min-w-0 flex-[1_1_380px] flex-col gap-[18px] rounded-xl border border-white/12 bg-[#0a141f] p-8"
    >
      <div>
        <h3 className="m-0 text-xl font-semibold text-white">매일 한 번, 메일로 받기</h3>
        <p className="mt-2 text-[15px] leading-relaxed text-[#a3b3bf]">
          새로 공격받은 배 소식과, 기사에 보도된 전쟁위험 보험료(전쟁 지역을 지나는 배가 따로 내는 보험료)를 하루 한 번 보내 드려요.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="landing-email" className="text-[15px] font-semibold text-white">
          업무용 이메일
        </label>
        <input
          id="landing-email"
          name="email"
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          placeholder="name@company.com"
          onChange={() => phase !== "sending" && setPhase("idle")}
          className="h-[50px] rounded-md border border-white/25 bg-[#05080d] px-3.5 text-base text-white outline-none placeholder:text-[#6b7b88] focus:border-[#5eead4]"
        />
      </div>
      <label className="flex items-start gap-2 text-[15px] leading-snug text-[#d7e0e6]">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => {
            setConsent(e.target.checked);
            if (phase === "consent") setPhase("idle");
          }}
          className="mt-1 h-4 w-4 shrink-0 accent-[#f5c451]"
        />
        <span>{copy.label}</span>
      </label>
      <ul className="m-0 list-disc space-y-1 pl-5 text-caption leading-relaxed text-[#8796a3]">
        {copy.items.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <input
        tabIndex={-1}
        name="company"
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />
      <button
        type="submit"
        disabled={phase === "sending"}
        className="h-[54px] rounded-md border border-white/25 bg-transparent text-[17px] font-semibold text-white hover:border-white/60 disabled:opacity-60"
      >
        {phase === "sending" ? "보내는 중…" : "메일 받기"}
      </button>
      <p aria-live="polite" className="m-0 min-h-[1.25rem] text-sm leading-relaxed">
        {phase === "sent" && (
          <span className="text-[#5eead4]">
            받은편지함에서 확인 링크를 눌러 주세요. 이미 신청하셨다면 메일이 다시 가지 않습니다.
          </span>
        )}
        {phase === "consent" && <span className="text-[#fca5a5]">{copy.required}</span>}
        {phase === "invalid" && <span className="text-[#fca5a5]">이메일 주소를 다시 확인해 주세요.</span>}
        {phase === "down" && (
          <span className="text-[#fca5a5]">지금은 신청을 받지 못하고 있어요. 잠시 뒤 다시 시도해 주세요.</span>
        )}
      </p>
    </form>
  );
}
