"use client";

type TheaterDetailCtaProps = {
  label: string;
  onClick: () => void;
};

export function TheaterDetailCta({ label, onClick }: TheaterDetailCtaProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[42%] z-[100] flex justify-center px-4">
      <button
        type="button"
        onClick={onClick}
        className="theater-detail-cta pointer-events-auto max-w-md rounded-2xl border border-amber-300/35 bg-gradient-to-b from-amber-950/90 to-slate-950/92 px-5 py-3.5 text-center shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md transition hover:border-amber-200/55 hover:brightness-110 active:scale-[0.98]"
      >
        <p className="text-sm font-semibold leading-snug text-amber-50">{label}</p>
        <p className="mt-1 text-meta text-amber-200/60">클릭하면 해당 전장 구역으로 확대됩니다</p>
      </button>
    </div>
  );
}
