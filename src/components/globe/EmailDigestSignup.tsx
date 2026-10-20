"use client";

import { useState, type FormEvent } from "react";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { EMAIL_CONSENT } from "@/lib/emailConsent";

/**
 * 하루 한 번 메일. 확인 링크를 누르기 전에는 발송되지 않는다.
 */
export function EmailDigestSignup({ lang }: { lang: LabelLanguage }) {
  const en = lang === "en";
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [consent, setConsent] = useState(false);
  const [phase, setPhase] = useState<"idle" | "sending" | "sent" | "invalid" | "down" | "consent">("idle");
  const copy = EMAIL_CONSENT[en ? "en" : "ko"];

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (phase === "sending") return;
    if (!consent) {
      setPhase("consent");
      return;
    }
    const data = new FormData(event.currentTarget);
    const company = String(data.get("company") ?? "");
    const address = String(data.get("email") ?? "");
    setPhase("sending");
    try {
      const res = await fetch("/api/email/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: address, lang: en ? "en" : "ko", company, consent: true }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (json.error === "consent_required") {
        setPhase("consent");
        return;
      }
      if (res.status === 400 || json.error === "invalid email") {
        setPhase("invalid");
        return;
      }
      if (!res.ok || json.ok === false) {
        setPhase("down");
        return;
      }
      setPhase("sent");
    } catch {
      setPhase("down");
    }
  }

  return (
    <section
      aria-label={en ? "Email digest" : "이메일 구독"}
      className="pointer-events-auto w-full max-w-[20rem] rounded-md border border-amber-600/35 bg-[#120e08]/92"
    >
      <form onSubmit={onSubmit} className="px-2.5 py-2">
        <h3 className="text-meta font-semibold tracking-tight text-amber-100">
          {en ? "Daily email" : "하루 한 번 메일"}
        </h3>
        <p className="mt-0.5 text-micro leading-snug text-amber-200/55">
          {en
            ? "New ship incidents and war-risk figures as reported. Nothing is sent until you open the confirmation link."
            : "새 피격 사건과 보도 기준 보험료. 확인 메일의 링크를 눌러야 발송이 시작됩니다."}
        </p>
        <label className="sr-only" htmlFor="email-digest-address">
          {en ? "Email" : "이메일"}
        </label>
        <div className="mt-1.5 flex gap-1">
          <input
            id="email-digest-address"
            name="email"
            type="email"
            required
            maxLength={254}
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (phase !== "sending") setPhase("idle");
            }}
            placeholder={en ? "email" : "이메일"}
            className="min-w-0 flex-1 rounded-sm border border-amber-600/30 bg-black/30 px-2 py-1 text-micro text-amber-50 outline-none placeholder:text-amber-200/35 focus:border-amber-400/60"
          />
          <button
            type="submit"
            disabled={phase === "sending"}
            className="shrink-0 rounded-sm bg-amber-700/80 px-2 py-1 text-micro font-medium text-amber-50 hover:bg-amber-600/90 disabled:opacity-60"
          >
            {phase === "sending" ? (en ? "Sending…" : "보내는 중…") : en ? "Subscribe" : "구독"}
          </button>
        </div>
        <label className="mt-1.5 flex items-start gap-1.5 text-micro leading-snug text-amber-100/85">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => {
              setConsent(e.target.checked);
              if (phase === "consent") setPhase("idle");
            }}
            className="mt-0.5 shrink-0 accent-amber-500"
          />
          <span>{copy.label}</span>
        </label>
        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-micro leading-snug text-amber-200/50">
          {copy.items.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <input
          tabIndex={-1}
          name="company"
          autoComplete="off"
          aria-hidden="true"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="absolute -left-[9999px] h-0 w-0 opacity-0"
        />
        {phase === "sent" ? (
          <p className="mt-1.5 text-micro leading-snug text-amber-100/80">
            {en
              ? "Check your inbox and open the confirmation link. If you already subscribe, no second mail is sent."
              : "받은편지함에서 확인 링크를 눌러 주세요. 이미 구독 중이면 메일이 다시 가지 않습니다."}
          </p>
        ) : null}
        {phase === "consent" ? (
          <p className="mt-1.5 text-micro text-rose-200/90">{copy.required}</p>
        ) : null}
        {phase === "invalid" ? (
          <p className="mt-1.5 text-micro text-rose-200/90">{en ? "Check the email address." : "이메일 주소를 확인해 주세요."}</p>
        ) : null}
        {phase === "down" ? (
          <p className="mt-1.5 text-micro text-rose-200/90">
            {en ? "Subscriptions are not available right now." : "지금은 구독을 받지 못합니다. 잠시 뒤 다시 시도해 주세요."}
          </p>
        ) : null}
      </form>
    </section>
  );
}
