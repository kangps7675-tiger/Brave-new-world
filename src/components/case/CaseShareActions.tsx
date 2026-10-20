"use client";

import { useState } from "react";

type Props = {
  title: string;
  shareUrl: string;
};

export function CaseShareActions({ title, shareUrl }: Props) {
  const [copied, setCopied] = useState(false);

  const onShare = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title, url: shareUrl });
        return;
      }
    } catch {
      /* 취소·미지원 → 복사 */
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void onShare()}
      className="rounded-md border border-white/20 bg-white/5 px-3 py-2 text-sm text-slate-100 hover:bg-white/10"
    >
      {copied ? "링크 복사됨" : "결과 링크 공유"}
    </button>
  );
}
