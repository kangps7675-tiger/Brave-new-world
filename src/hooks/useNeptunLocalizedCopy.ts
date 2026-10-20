"use client";

import { useEffect, useState } from "react";
import type { NeptunAlertRegion, NeptunLiveThreat } from "@/lib/neptun";
import { localizeNeptunAlertName, localizeNeptunThreatCopy } from "@/lib/neptunDisplay";
import type { LabelLanguage } from "@/lib/layerPrefs";

type ThreatCopy = {
  title: string;
  location: string;
  explanation: string | null;
};

export function useNeptunLocalizedCopy(
  threats: NeptunLiveThreat[],
  alerts: NeptunAlertRegion[],
  lang: LabelLanguage,
) {
  const [threatCopy, setThreatCopy] = useState<Record<string, ThreatCopy>>({});
  const [alertNames, setAlertNames] = useState<Record<string, string>>({});
  const [alertOblasts, setAlertOblasts] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const nextThreat: Record<string, ThreatCopy> = {};
      for (const threat of threats) {
        nextThreat[threat.id] = await localizeNeptunThreatCopy(threat, lang);
      }

      const nextAlert: Record<string, string> = {};
      const nextOblast: Record<string, string> = {};
      for (const alert of alerts) {
        nextAlert[alert.key] = await localizeNeptunAlertName(alert.name, lang);
        if (alert.oblast) {
          nextOblast[alert.key] = await localizeNeptunAlertName(alert.oblast, lang);
        }
      }

      if (!cancelled) {
        setThreatCopy(nextThreat);
        setAlertNames(nextAlert);
        setAlertOblasts(nextOblast);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [alerts, lang, threats]);

  return { threatCopy, alertNames, alertOblasts };
}
