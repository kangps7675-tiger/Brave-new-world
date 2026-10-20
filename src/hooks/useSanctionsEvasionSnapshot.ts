"use client";

import { useEffect, useState } from "react";
import {
  getSanctionsEvasionEntry,
  refreshSanctionsEvasion,
  subscribeSanctionsEvasion,
  type SanctionsEvasionEntry,
} from "@/lib/sanctionsEvasionStore";

/**
 * SES(제재 회피 강도) 단일 소스 훅 — GTS의 useWorldTensionSnapshot과 동일 패턴.
 */
export function useSanctionsEvasionSnapshot(): SanctionsEvasionEntry {
  const [current, setCurrent] = useState<SanctionsEvasionEntry>(() =>
    getSanctionsEvasionEntry(),
  );

  useEffect(() => {
    setCurrent(getSanctionsEvasionEntry());
    const unsubscribe = subscribeSanctionsEvasion(setCurrent);
    if (!getSanctionsEvasionEntry().snapshot) {
      refreshSanctionsEvasion();
    }
    return unsubscribe;
  }, []);

  return current;
}
