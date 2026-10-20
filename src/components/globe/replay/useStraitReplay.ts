"use client";

import { useEffect, useState } from "react";
import type { StraitId, StraitReplayResponse } from "@/lib/straitReplay/types";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty"; data: StraitReplayResponse }
  | { status: "ready"; data: StraitReplayResponse };

export function useStraitReplay(
  straitId: StraitId | null,
  eventId: string | null,
  enabled: boolean,
): State {
  const [state, setState] = useState<State>({ status: "idle" });

  useEffect(() => {
    if (!enabled || !straitId) {
      setState({ status: "idle" });
      return;
    }
    let cancelled = false;
    setState({ status: "loading" });
    const qs = new URLSearchParams({ straitId });
    if (eventId) qs.set("eventId", eventId);
    fetch(`/api/strait-replay?${qs}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as StraitReplayResponse;
      })
      .then((data) => {
        if (cancelled) return;
        if (!data.event) {
          setState({ status: "empty", data });
          return;
        }
        setState({ status: "ready", data });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          status: "error",
          message: err instanceof Error ? err.message : "error",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [straitId, eventId, enabled]);

  return state;
}
