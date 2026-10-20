"use client";

import { useCallback, useEffect, useState } from "react";
import { deriveInterestProfile } from "@/lib/interest/deriveInterestProfile";
import { getInterestStore } from "@/lib/interest/interestStore";
import { recommendFromInterest } from "@/lib/interest/recommendFromInterest";
import type {
  InterestProfile,
  InterestRecommendChip,
  InterestState,
} from "@/lib/interest/interestTypes";

function readProfile(mode: "conflict" | "economy"): {
  state: InterestState;
  profile: InterestProfile;
  chips: InterestRecommendChip[];
} {
  const state = getInterestStore().load();
  const profile = deriveInterestProfile(state);
  const chips = recommendFromInterest(profile, mode);
  return { state, profile, chips };
}

export function useInterestProfile(mode: "conflict" | "economy" = "conflict") {
  const [profile, setProfile] = useState<InterestProfile>(() =>
    typeof window === "undefined"
      ? { buckets: [], topTheaters: [], topThemes: [], topSymbols: [], eventCount: 0 }
      : readProfile(mode).profile,
  );
  const [chips, setChips] = useState<InterestRecommendChip[]>(() =>
    typeof window === "undefined" ? [] : readProfile(mode).chips,
  );

  const refresh = useCallback(() => {
    const next = readProfile(mode);
    setProfile(next.profile);
    setChips(next.chips);
  }, [mode]);

  useEffect(() => {
    refresh();
    const onUpdate = () => refresh();
    window.addEventListener("cv-interest-updated", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener("cv-interest-updated", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, [refresh]);

  return { profile, chips, refresh };
}
