"use client";

/** 레이아웃 크기 스켈레톤 — CLS 방지 (P3-3) */

export function PanelSkeletonLines({
  rows = 4,
  className = "",
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 p-2 ${className}`} aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-lg bg-white/5"
          style={{ height: i === 0 ? 28 : 48 + (i % 3) * 8 }}
        />
      ))}
    </div>
  );
}

export function PanelSkeletonGrid({
  count = 4,
  minHeight = 88,
  className = "",
}: {
  count?: number;
  minHeight?: number;
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-2 gap-2 p-2 ${className}`} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl bg-white/5"
          style={{ minHeight }}
        />
      ))}
    </div>
  );
}

export function IntelChipSkeletonRow({ count = 5 }: { count?: number }) {
  return (
    <div className="flex gap-2 overflow-hidden px-1 py-1" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="h-9 w-24 shrink-0 animate-pulse rounded-full bg-white/5"
        />
      ))}
    </div>
  );
}
