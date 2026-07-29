"use client";

import { useEffect, useState } from "react";
import { Z_ABOVE_NAV } from "@/lib/uiStack";
import { onLayerCapRejected, type LayerCapRejectedDetail } from "@/lib/layerCapNotice";
import type { LabelLanguage } from "@/lib/layerPrefs";
import { t } from "@/lib/uiStrings";

const VISIBLE_MS = 4_200;

type Props = {
  lang: LabelLanguage;
  /** 레이어 패널이 열려 있으면 숨김 — 패널은 자체 인라인 경고를 쓴다 (중복 방지) */
  suppressed?: boolean;
};

/**
 * 레이어 상한 거부 토스트 (P0-7).
 *
 * 레이어 패널 **밖**에서 레이어를 켜려다 상한에 걸린 경우를 담당한다.
 * 퀵 드롭다운 · 고정 토글 칩 · 「묻기」 · 프리셋 칩 등은 예전에
 * 아무 반응 없이 실패했다 — 사용자에게는 그냥 고장으로 보인다.
 *
 * 패널 안에서는 `LayerCategoryDraftHost`가 목록 위에 인라인 경고를 띄우므로
 * 여기서는 `suppressed`로 물러난다. 같은 말을 두 번 하지 않는다.
 */
export function LayerCapToast({ lang, suppressed = false }: Props) {
  const [detail, setDetail] = useState<LayerCapRejectedDetail | null>(null);

  useEffect(() => onLayerCapRejected(setDetail), []);

  useEffect(() => {
    if (!detail) return;
    const id = window.setTimeout(() => setDetail(null), VISIBLE_MS);
    return () => window.clearTimeout(id);
  }, [detail]);

  if (!detail || suppressed) return null;

  return (
    <div
      role="alert"
      className={`pointer-events-none fixed bottom-[calc(var(--bottom-intel-stack-clearance,3.25rem)+1rem+env(safe-area-inset-bottom,0px))] left-1/2 ${Z_ABOVE_NAV} w-[min(92vw,26rem)] -translate-x-1/2`}
    >
      <div className="rounded-xl border border-amber-400/40 bg-[#1a1204]/96 px-4 py-3 shadow-[0_18px_48px_rgba(0,0,0,0.5)] backdrop-blur-md">
        <p className="text-body font-semibold text-amber-50">
          {t("layerCapWarnTitle", lang)}
        </p>
        <p className="mt-1 text-caption leading-relaxed text-amber-100/85">
          {t("layerCapWarnBody", lang).replace("{cap}", String(detail.cap))}
        </p>
        {detail.ultraLite ? (
          <p className="mt-1 text-meta text-amber-200/70">{t("layerCapWarnUltra", lang)}</p>
        ) : null}
      </div>
    </div>
  );
}
