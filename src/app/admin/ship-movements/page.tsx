"use client";

import { useCallback, useEffect, useState } from "react";

type AdminItem = {
  id: string;
  titleKo: string;
  titleEn: string;
  locationLabelKo: string | null;
  locationLabelEn: string | null;
  missingLocationNoteKo: string | null;
  missingLocationNoteEn: string | null;
  locationStatus: string;
  mapEligible: number;
  lat: number | null;
  lng: number | null;
  precisionKm: number | null;
  source: string;
  sourceUrl: string;
  reviewStatus: string;
  vesselName: string | null;
  hullNumber: string | null;
  evidenceJson: string;
};

export default function ShipMovementsAdminPage() {
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [items, setItems] = useState<AdminItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ship-movements/admin?status=pending", {
        credentials: "include",
      });
      const data = (await res.json()) as {
        ok?: boolean;
        authed?: boolean;
        items?: AdminItem[];
        error?: string;
      };
      if (res.status === 401) {
        setAuthed(false);
        setItems([]);
        return;
      }
      if (!res.ok) throw new Error(data.error || "load failed");
      setAuthed(true);
      setItems(data.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load failed");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function login() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ship-movements/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "login", secret }),
      });
      if (!res.ok) throw new Error("login failed");
      setAuthed(true);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "login failed");
    } finally {
      setBusy(false);
    }
  }

  async function review(
    item: AdminItem,
    reviewStatus: "approved" | "rejected" | "needs_place",
    patch?: Partial<AdminItem> & { mapEligibleBool?: boolean },
  ) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ship-movements/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "review",
          id: item.id,
          reviewStatus,
          titleKo: patch?.titleKo ?? item.titleKo,
          titleEn: patch?.titleEn ?? item.titleEn,
          locationLabelKo: patch?.locationLabelKo ?? item.locationLabelKo,
          locationLabelEn: patch?.locationLabelEn ?? item.locationLabelEn,
          lat: patch?.lat ?? item.lat,
          lng: patch?.lng ?? item.lng,
          mapEligible:
            patch?.mapEligibleBool ??
            (patch?.mapEligible != null ? patch.mapEligible === 1 : item.mapEligible === 1),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "review failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "review failed");
    } finally {
      setBusy(false);
    }
  }

  if (!authed) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-slate-100">
        <h1 className="text-xl font-semibold">주간 함선 이동기 · 검토</h1>
        <p className="mt-2 text-sm text-slate-400">
          SHIP_MOVEMENT_ADMIN_SECRET 로 로그인합니다.
        </p>
        <input
          type="password"
          className="mt-4 w-full rounded border border-slate-600 bg-slate-900 px-3 py-2"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="admin secret"
        />
        <button
          type="button"
          disabled={busy || !secret}
          onClick={() => void login()}
          className="mt-3 rounded bg-cyan-600 px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          로그인
        </button>
        {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 text-slate-100">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">검토 큐 (pending)</h1>
        <button
          type="button"
          className="text-sm text-slate-400 underline"
          onClick={() => void load()}
        >
          새로고침
        </button>
      </div>
      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
      <p className="mt-2 text-xs text-slate-500">
        정렬: ambiguous → unresolved → missing → broad → … · 승인 시 한글·영문 제목 필수
      </p>
      <ul className="mt-6 space-y-4">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-xl border border-slate-700 bg-slate-900/70 p-4"
          >
            <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-slate-400">
              <span>{item.locationStatus}</span>
              <span>·</span>
              <span>{item.source}</span>
              <span>·</span>
              <span>mapEligible={item.mapEligible}</span>
            </div>
            <p className="mt-2 font-medium">{item.titleKo}</p>
            <p className="text-sm text-slate-300">{item.titleEn}</p>
            <p className="mt-1 text-xs text-slate-400">
              {item.vesselName || "—"} {item.hullNumber ? `(${item.hullNumber})` : ""} ·{" "}
              {item.locationLabelKo || item.missingLocationNoteKo || "위치 없음"}
            </p>
            <p className="text-xs text-slate-500">
              {item.lat != null && item.lng != null
                ? `${item.lat.toFixed(3)}, ${item.lng.toFixed(3)} ±${item.precisionKm ?? "?"}km`
                : "coords null"}
            </p>
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-xs text-cyan-300 underline"
            >
              원문
            </a>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                className="rounded bg-emerald-700 px-3 py-1.5 text-xs"
                onClick={() =>
                  void review(item, "approved", {
                    mapEligibleBool:
                      item.mapEligible === 1 && item.lat != null && item.lng != null,
                  })
                }
              >
                승인
              </button>
              <button
                type="button"
                disabled={busy}
                className="rounded bg-amber-800 px-3 py-1.5 text-xs"
                onClick={() =>
                  void review(item, "approved", {
                    mapEligibleBool: true,
                    lat: item.lat,
                    lng: item.lng,
                  })
                }
              >
                거친 영역으로 승인
              </button>
              <button
                type="button"
                disabled={busy}
                className="rounded bg-slate-700 px-3 py-1.5 text-xs"
                onClick={() => void review(item, "needs_place")}
              >
                타임라인만
              </button>
              <button
                type="button"
                disabled={busy}
                className="rounded bg-red-900 px-3 py-1.5 text-xs"
                onClick={() => void review(item, "rejected")}
              >
                거절
              </button>
            </div>
          </li>
        ))}
      </ul>
      {items.length === 0 && !busy ? (
        <p className="mt-8 text-sm text-slate-500">대기 중인 항목이 없습니다.</p>
      ) : null}
    </main>
  );
}
