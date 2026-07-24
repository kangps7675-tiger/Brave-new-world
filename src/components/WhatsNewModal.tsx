"use client";

import { ParchmentLetter } from "@/components/ParchmentLetter";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { markAppUpdateSeen, type AppUpdate } from "@/lib/appUpdates";
import { trackEvent } from "@/lib/trackClient";

type Props = {
  lang: LabelLanguage;
  update: AppUpdate;
  onDismiss: () => void;
  onCta?: () => void;
};

/**
 * 업데이트 안내 — 등불·웰컴과 같은 양피지.
 * 문구가 길어져도 편지 본문으로 읽히게.
 */
export function WhatsNewModal({ lang, update, onDismiss, onCta }: Props) {
  const ko = lang !== "en";
  const paragraphs = ko ? update.paragraphsKo : update.paragraphsEn;
  const title = ko ? update.titleKo : update.titleEn;
  const wantsPlay = update.ctaAction === "play-hub" && Boolean(onCta);

  function finish(via: "dismiss" | "cta") {
    markAppUpdateSeen(update.id);
    trackEvent("whats_new_dismiss", { id: update.id, via }, { lang: ko ? "ko" : "en" });
    if (via === "cta" && wantsPlay && onCta) {
      onCta();
    }
    onDismiss();
  }

  return (
    <ParchmentLetter
      lang={lang}
      title={title}
      paragraphs={paragraphs}
      signOff={
        ko
          ? "우측 아래 ▶ 에서도 언제든 다시 열 수 있습니다."
          : "You can open play anytime from the ▶ button bottom-right."
      }
      backMark={ko ? "새 소식" : "What's new"}
      backSub={ko ? "멋진 신세계" : "Brave New World"}
      ctaLabel={
        wantsPlay
          ? ko
            ? (update.ctaKo ?? "한번 해보기")
            : (update.ctaEn ?? "Try it")
          : ko
            ? "알겠어요"
            : "Got it"
      }
      onContinue={() => finish(wantsPlay ? "cta" : "dismiss")}
      titleId="whats-new-title"
      zIndexClass="z-[10028]"
    />
  );
}
