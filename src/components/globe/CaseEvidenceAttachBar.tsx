"use client";

import { useEffect, useState } from "react";
import {
  attachSensorEvidence,
  CaseApiError,
  fetchCaseFile,
  patchEvidenceImageKey,
  uploadEvidenceImage,
} from "@/lib/caseFile/clientApi";
import {
  readActiveCaseId,
  readCaseEditorToken,
} from "@/lib/caseFile/clientSession";
import type { CaseFile, ClaimKind, EvidenceRole } from "@/lib/caseFile/types";
import type { LabelLanguage } from "@/lib/layerPrefs";

export type CaseAttachTarget =
  | {
      source: "firms";
      lat: number;
      lng: number;
      pickId?: string;
      fromDate?: string | null;
      toDate?: string | null;
      label: string;
    }
  | {
      source: "air-raid";
      lat: number;
      lng: number;
      at?: string | null;
      pickThreatId?: string;
      label: string;
    }
  | {
      source: "ais";
      lat: number;
      lng: number;
      pickId?: string;
      pickMmsi?: string;
      label: string;
    };

type Props = {
  lang: LabelLanguage;
  target: CaseAttachTarget;
  captureFrame?: () => Promise<HTMLCanvasElement | null>;
  /** 첨부 성공 후 */
  onAttached?: (caseFile: CaseFile) => void;
};

const CLAIM_LABEL: Record<ClaimKind, { ko: string; en: string }> = {
  place: { ko: "장소", en: "Place" },
  time: { ko: "시간", en: "Time" },
  occurrence: { ko: "사건 발생", en: "Occurrence" },
  damage: { ko: "피해", en: "Damage" },
  means: { ko: "수단", en: "Means" },
  actor: { ko: "주체", en: "Actor" },
};

function canvasToBase64(canvas: HTMLCanvasElement): string {
  const dataUrl = canvas.toDataURL("image/png");
  const i = dataUrl.indexOf(",");
  return i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
}

/**
 * 선택 카드용 — 열린 사건이 있을 때만 「이 사건 근거로 추가」.
 */
export function CaseEvidenceAttachBar({
  lang,
  target,
  captureFrame,
  onAttached,
}: Props) {
  const en = lang === "en";
  const [caseFile, setCaseFile] = useState<CaseFile | null>(null);
  const [open, setOpen] = useState(false);
  const [claimId, setClaimId] = useState("");
  const [role, setRole] = useState<EvidenceRole>("supports");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const id = readActiveCaseId();
    if (!id) {
      setCaseFile(null);
      return;
    }
    let cancelled = false;
    void fetchCaseFile(id)
      .then((loaded) => {
        if (!cancelled) setCaseFile(loaded.caseFile);
      })
      .catch(() => {
        if (!cancelled) setCaseFile(null);
      });
    return () => {
      cancelled = true;
    };
  }, [target.label, open]);

  useEffect(() => {
    if (!caseFile?.claims.length) return;
    const prefer =
      target.source === "air-raid"
        ? caseFile.claims.find((c) => c.kind === "time")
        : caseFile.claims.find((c) => c.kind === "place") ??
          caseFile.claims.find((c) => c.kind === "occurrence");
    setClaimId(prefer?.id ?? caseFile.claims[0]!.id);
  }, [caseFile, target.source]);

  const attachSource =
    target.source === "firms"
      ? "firms"
      : target.source === "ais"
        ? "ais"
        : "air-raid";

  if (!caseFile) {
    return (
      <p className="mt-3 rounded-lg border border-rose-400/25 bg-rose-950/30 px-3 py-2 text-xs text-rose-100/70">
        {en
          ? "Open a case and set incident place/time in the Case tab to attach this as evidence."
          : "관측 책갈피 「사건」탭에서 사건을 열고 위치·시각을 설정하면 이 대상을 근거로 붙일 수 있습니다."}
      </p>
    );
  }

  const onAttach = async () => {
    const token = readCaseEditorToken();
    if (!token) {
      setErr(en ? "Editor token missing (Case tab)" : "편집 토큰이 없습니다 (사건 탭)");
      return;
    }
    if (!claimId) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const attached = await attachSensorEvidence({
        token,
        caseId: caseFile.id,
        expectedRev: caseFile.rev,
        claimId,
        source: attachSource,
        role,
        firms:
          target.source === "firms"
            ? {
                radiusKm: 8,
                pickId: target.pickId,
              }
            : undefined,
        airRaid:
          target.source === "air-raid"
            ? {
                radiusKm: 30,
                windowHours: 2,
                pickThreatId: target.pickThreatId,
              }
            : undefined,
        ais:
          target.source === "ais"
            ? {
                radiusKm: 20,
                pickId: target.pickId,
                pickMmsi: target.pickMmsi,
              }
            : undefined,
      });
      let next = attached.caseFile;
      if (captureFrame) {
        try {
          const canvas = await captureFrame();
          if (canvas) {
            const uploaded = await uploadEvidenceImage({
              token,
              caseId: next.id,
              evidenceId: attached.evidence.id,
              imageBase64: canvasToBase64(canvas),
            });
            next = await patchEvidenceImageKey({
              token,
              caseId: next.id,
              expectedRev: next.rev,
              caseFile: next,
              evidenceId: attached.evidence.id,
              imageKey: uploaded.imageKey,
            });
          }
        } catch {
          /* 캡처 실패해도 근거는 유지 */
        }
      }
      setCaseFile(next);
      setOpen(false);
      setMsg(
        en
          ? `Attached → ${attached.evidence.strength}`
          : `첨부됨 → 강도 ${attached.evidence.strength}`,
      );
      onAttached?.(next);
    } catch (e) {
      setErr(e instanceof CaseApiError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 rounded-lg border border-rose-400/35 bg-rose-950/40 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-rose-200/70">
            {en ? "Case evidence" : "사건 근거"}
          </p>
          <p className="mt-1 text-sm text-rose-50/90 line-clamp-2">{target.label}</p>
          <p className="mt-0.5 text-xs text-white/45">{caseFile.title || caseFile.id}</p>
        </div>
        {!open ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => setOpen(true)}
            className="shrink-0 rounded-md border border-rose-300/40 bg-rose-500/25 px-2.5 py-1.5 text-xs font-semibold text-rose-50 hover:bg-rose-500/35 disabled:opacity-40"
          >
            {en ? "Add to case" : "이 사건 근거로 추가"}
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="mt-2 flex flex-col gap-2">
          <label className="block text-xs text-white/55">
            {en ? "Claim" : "세부 주장"}
            <select
              value={claimId}
              onChange={(e) => setClaimId(e.target.value)}
              className="mt-1 w-full rounded-md border border-white/15 bg-black/40 px-2 py-1.5 text-xs text-white"
            >
              {caseFile.claims.map((c) => (
                <option key={c.id} value={c.id}>
                  {en ? CLAIM_LABEL[c.kind].en : CLAIM_LABEL[c.kind].ko}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-white/55">
            {en ? "Role" : "역할"}
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as EvidenceRole)}
              className="mt-1 w-full rounded-md border border-white/15 bg-black/40 px-2 py-1.5 text-xs text-white"
            >
              <option value="supports">{en ? "Supports" : "뒷받침"}</option>
              <option value="contradicts">{en ? "Contradicts" : "반박"}</option>
              <option value="context">{en ? "Context" : "맥락"}</option>
            </select>
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void onAttach()}
              className="flex-1 rounded-md border border-rose-300/40 bg-rose-500/30 px-2 py-1.5 text-xs font-semibold text-rose-50 disabled:opacity-40"
            >
              {busy ? "…" : en ? "Confirm" : "추가"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setOpen(false)}
              className="rounded-md border border-white/15 px-2 py-1.5 text-xs text-white/70"
            >
              {en ? "Cancel" : "취소"}
            </button>
          </div>
        </div>
      ) : null}

      {msg ? <p className="mt-2 text-xs text-emerald-200/85">{msg}</p> : null}
      {err ? <p className="mt-2 text-xs text-rose-300">{err}</p> : null}
    </div>
  );
}
