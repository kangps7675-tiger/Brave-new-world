"use client";

import dynamic from "next/dynamic";
import type { RuntimeConfig } from "@/lib/runtimeConfig.types";
import { initRuntimeConfig } from "@/lib/runtimeConfig.client";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const SeaDashboard = dynamic(() => import("@/components/sea/SeaDashboard"), {
  ssr: false,
  loading: () => (
    <div className="flex h-dvh w-full items-center justify-center bg-black text-sm text-white/50">
      해역 정보를 불러오는 중…
    </div>
  ),
});

export function SeaBoot({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  initRuntimeConfig(runtimeConfig);
  return (
    <ErrorBoundary>
      <SeaDashboard />
    </ErrorBoundary>
  );
}
