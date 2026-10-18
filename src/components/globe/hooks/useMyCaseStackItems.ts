"use client";

import { useEffect, useState } from "react";
import { fetchCaseFile } from "@/lib/caseFile/clientApi";
import { readMyCaseIds } from "@/lib/caseFile/clientSession";
import { stackItemFromCase, type StackItem } from "@/lib/incidentStack/build";

/** 이 브라우저에서 연 케이스를 사건 스택 행으로. 지워졌거나 좌표 없는 케이스는 건너뛴다. */
export function useMyCaseStackItems(): StackItem[] {
  const [items, setItems] = useState<StackItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const ids = readMyCaseIds();
      const rows = await Promise.all(
        ids.map((id) =>
          fetchCaseFile(id)
            .then((r) => stackItemFromCase(r.caseFile))
            .catch(() => null),
        ),
      );
      if (!cancelled) setItems(rows.filter((x): x is StackItem => x !== null));
    };
    void load();
    const onChange = () => void load();
    window.addEventListener("bnw:my-cases", onChange);
    return () => {
      cancelled = true;
      window.removeEventListener("bnw:my-cases", onChange);
    };
  }, []);

  return items;
}
