"use client";

import { HoverHint } from "@/components/HoverHint";
import { useLocale } from "@/contexts/LocaleContext";

type EconomySupplyChainFixedToggleProps = {
  showUsDfc: boolean;
  showChinaBri: boolean;
  onUsDfcChange: (checked: boolean) => void;
  onChinaBriChange: (checked: boolean) => void;
  usLinkCount: number;
  chinaLinkCount: number;
  /** 우측 세로 레일용 — 체크박스를 세로로 쌓는다 */
  vertical?: boolean;
};

export function EconomySupplyChainFixedToggle({
  showUsDfc,
  showChinaBri,
  onUsDfcChange,
  onChinaBriChange,
  usLinkCount,
  chinaLinkCount,
  vertical = false,
}: EconomySupplyChainFixedToggleProps) {
  const { lang } = useLocale();

  if (vertical) {
    return (
      <div className="pointer-events-auto flex flex-col items-end gap-2">
        <HoverHint
          placement="left"
          title={lang === "en" ? "U.S. DFC Network" : "미국 DFC 개발금융망"}
          detail={
            lang === "en"
              ? "Toggle U.S. Development Finance Corporation project arcs"
              : "미국 국제개발금융공사(DFC) 프로젝트 연결선 표시"
          }
        >
          <label
            className={`flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 text-xs shadow-lg backdrop-blur-md transition ${
              showUsDfc
                ? "border-blue-300/55 bg-[#0a1830]/95 text-blue-50 hover:border-blue-200/70"
                : "border-blue-300/35 bg-[#0a1830]/92 text-blue-100/90 hover:border-blue-200/50"
            }`}
          >
            <input
              type="checkbox"
              checked={showUsDfc}
              onChange={(event) => onUsDfcChange(event.target.checked)}
              className="h-4 w-4 shrink-0 accent-blue-500"
            />
            <span className="font-medium tracking-tight whitespace-nowrap">
              {lang === "en" ? "U.S. DFC" : "미국 DFC"}
            </span>
            {usLinkCount > 0 ? (
              <span className="rounded-full bg-blue-500/25 px-1.5 py-0.5 text-micro font-semibold text-blue-100">
                {usLinkCount}
              </span>
            ) : null}
          </label>
        </HoverHint>
        <HoverHint
          placement="left"
          title={lang === "en" ? "China Belt and Road" : "중국 일대일로"}
          detail={
            lang === "en"
              ? "Toggle Belt and Road trade connectivity arcs"
              : "일대일로 무역·운송 연결선 표시"
          }
        >
          <label
            className={`flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 text-xs shadow-lg backdrop-blur-md transition ${
              showChinaBri
                ? "border-amber-300/55 bg-[#0a1830]/95 text-amber-50 hover:border-amber-200/70"
                : "border-amber-300/35 bg-[#0a1830]/92 text-amber-100/90 hover:border-amber-200/50"
            }`}
          >
            <input
              type="checkbox"
              checked={showChinaBri}
              onChange={(event) => onChinaBriChange(event.target.checked)}
              className="h-4 w-4 shrink-0 accent-amber-400"
            />
            <span className="font-medium tracking-tight whitespace-nowrap">
              {lang === "en" ? "Belt & Road" : "일대일로"}
            </span>
            {chinaLinkCount > 0 ? (
              <span className="rounded-full bg-amber-400/25 px-1.5 py-0.5 text-micro font-semibold text-amber-100">
                {chinaLinkCount}
              </span>
            ) : null}
          </label>
        </HoverHint>
      </div>
    );
  }

  return (
    <div className="pointer-events-auto flex max-w-[calc(100vw-5.5rem)] flex-wrap items-center gap-x-3 gap-y-1.5 rounded-2xl border border-sky-300/35 bg-[#0a1830]/92 px-3.5 py-2 text-xs text-sky-50 shadow-lg backdrop-blur-md">
      <label className="flex cursor-pointer items-center gap-2 whitespace-nowrap">
        <input
          type="checkbox"
          checked={showUsDfc}
          onChange={(event) => onUsDfcChange(event.target.checked)}
          className="h-4 w-4 shrink-0 accent-blue-500"
        />
        <span className="font-medium text-blue-100">
          {lang === "en" ? "U.S. DFC Network" : "미국 DFC 개발금융망"}
        </span>
        {showUsDfc && usLinkCount > 0 ? (
          <span className="rounded-full bg-blue-500/20 px-1.5 py-0.5 text-micro font-semibold text-blue-100">
            {usLinkCount}
          </span>
        ) : null}
      </label>
      <span className="hidden h-4 w-px bg-white/15 sm:block" aria-hidden="true" />
      <label className="flex cursor-pointer items-center gap-2 whitespace-nowrap">
        <input
          type="checkbox"
          checked={showChinaBri}
          onChange={(event) => onChinaBriChange(event.target.checked)}
          className="h-4 w-4 shrink-0 accent-amber-400"
        />
        <span className="font-medium text-amber-100">
          {lang === "en" ? "China Belt and Road" : "중국 일대일로"}
        </span>
        {showChinaBri && chinaLinkCount > 0 ? (
          <span className="rounded-full bg-amber-400/20 px-1.5 py-0.5 text-micro font-semibold text-amber-100">
            {chinaLinkCount}
          </span>
        ) : null}
      </label>
    </div>
  );
}
