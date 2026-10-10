"use client";

import { useCallback, useEffect, useState } from "react";
import {
  applyIncidentToCaseFile,
  attachSensorEvidence,
  attachSoftEvidence,
  CaseApiError,
  createCaseFromDraft,
  extractCaseDraft,
  fetchCaseFile,
  patchEvidenceImageKey,
  reviseCaseFile,
  updateClaimFields,
  uploadEvidenceImage,
  type SensorEvidenceSource,
} from "@/lib/caseFile/clientApi";
import { evidenceSourceKind } from "@/lib/caseFile/sourceKind";
import {
  readActiveCaseId,
  readCaseEditorToken,
  writeActiveCaseId,
  writeCaseEditorToken,
} from "@/lib/caseFile/clientSession";
import type { SanitizeNote } from "@/lib/caseFile/sanitizeEvidence";
import type { SoftEvidenceKind } from "@/lib/caseFile/softEvidence";
import type {
  CaseFile,
  ClaimKind,
  EvidenceRole,
  Verdict,
} from "@/lib/caseFile/types";
import { emptyIncident } from "@/lib/caseFile/types";
import {
  effectiveClaimVerdict,
  type VerdictExplanation,
} from "@/lib/caseFile/verdict";
import {
  INVESTIGATION_STEPS,
  deriveInvestigationStep,
  investigationStepProgress,
} from "@/lib/caseFile/investigationSteps";
import {
  eventTypeLabel,
  findStepsForEventType,
  isProcedureItemDone,
  procedureChecklistFor,
  type SensorAttachMode,
} from "@/lib/caseFile/procedureChecklists";
import type { LabelLanguage } from "@/lib/layerPrefs";

type Props = {
  lang: LabelLanguage;
  camera: { lat: number; lng: number };
  /** Cesium/MapLibre 프레임 캡처 — 없으면 이미지 생략 */
  captureFrame?: () => Promise<HTMLCanvasElement | null>;
  chrome?: "full" | "bare";
  /** 활성 사건 ID 변경 시 (배지용) */
  onCaseChange?: (caseId: string | null) => void;
  /** 지도 클릭으로 기준점 찍기 모드 */
  mapPickActive?: boolean;
  onToggleMapPick?: (active: boolean) => void;
  /** 마지막으로 찍힌 지점 — seq가 바뀔 때마다 입력칸에 채움 */
  pickedPoint?: { lat: number; lng: number; seq: number } | null;
};

const CLAIM_LABEL: Record<ClaimKind, { ko: string; en: string }> = {
  place: { ko: "장소", en: "Place" },
  time: { ko: "시간", en: "Time" },
  occurrence: { ko: "사건 발생", en: "Occurrence" },
  damage: { ko: "피해", en: "Damage" },
  means: { ko: "수단", en: "Means" },
  actor: { ko: "주체", en: "Actor" },
};

const VERDICT_LABEL: Record<Verdict, { ko: string; en: string }> = {
  confirmed: { ko: "확인됨", en: "Confirmed" },
  partial: { ko: "일부 확인", en: "Partial" },
  unconfirmed: { ko: "확인 못함", en: "Unconfirmed" },
  refuted: { ko: "반박됨", en: "Refuted" },
};

type SoftAttachMode = SoftEvidenceKind;

const SENSOR_DEFAULT_RADIUS_KM: Partial<Record<SensorAttachMode, number>> = {
  firms: 15,
  "air-raid": 15,
  ais: 20,
  adsb: 80,
  facility: 5,
};

function sensorSource(mode: SensorAttachMode): SensorEvidenceSource {
  return mode === "satellite-auto" ? "satellite" : mode;
}

type FindAllRow = { label: string; state: "found" | "none" | "skipped" | "failed"; detail: string };
type AttachMode = SensorAttachMode | SoftAttachMode | null;

function isSoftAttach(mode: AttachMode): mode is SoftAttachMode {
  return (
    mode === "media" ||
    mode === "photo" ||
    mode === "satellite" ||
    mode === "manual"
  );
}

function isSensorAttach(mode: AttachMode): mode is SensorAttachMode {
  return (
    mode === "firms" ||
    mode === "air-raid" ||
    mode === "ais" ||
    mode === "adsb" ||
    mode === "satellite-auto" ||
    mode === "control-zone" ||
    mode === "facility"
  );
}

/** 지도 캡처를 함께 붙일 만한 근거 — 위성은 자체 영상, 통제 구역·시설은 지점 판별 */
function canCaptureMode(mode: AttachMode): boolean {
  return (
    mode === "firms" ||
    mode === "air-raid" ||
    mode === "ais" ||
    mode === "adsb" ||
    mode === "photo" ||
    mode === "manual"
  );
}

function sensorRequestOptions(mode: SensorAttachMode, radiusKm: number) {
  return {
    source: sensorSource(mode),
    firms: mode === "firms" ? { radiusKm } : undefined,
    airRaid: mode === "air-raid" ? { radiusKm, windowHours: 2 } : undefined,
    ais: mode === "ais" ? { radiusKm, windowHours: 6 } : undefined,
    adsb: mode === "adsb" ? { radiusKm } : undefined,
    facility: mode === "facility" ? { radiusKm } : undefined,
  };
}

function canvasToBase64(canvas: HTMLCanvasElement): string {
  const dataUrl = canvas.toDataURL("image/png");
  const i = dataUrl.indexOf(",");
  return i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
}

/** 사건 시각은 입력·표시 모두 UTC — 저장값(ISO Z)과 화면이 어긋나지 않게 */
function isoToUtcInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? new Date(ms).toISOString().slice(0, 16) : "";
}

function utcInputToIso(value: string): string | null {
  if (!value.trim()) return null;
  const ms = Date.parse(`${value}:00.000Z`);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

function formatIncidentTime(iso: string, en: boolean): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return iso;
  const utc = new Date(ms).toISOString().slice(0, 16).replace("T", " ");
  const local = new Date(ms).toLocaleString(en ? "en-GB" : "ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return en ? `${utc} UTC (local ${local})` : `${utc} UTC (내 시간 ${local})`;
}

function demotionNotice(notes: SanitizeNote[], en: boolean): string {
  const demoted = notes.filter((n) => n.action === "demoted_to_context");
  if (!demoted.length) return "";
  const first = demoted[0]!.detail;
  return en
    ? ` · ${demoted.length} evidence moved to context (${first})`
    : ` · 근거 ${demoted.length}건이 맥락으로 내려감 (${first})`;
}

/**
 * 관측 책갈피 「사건」탭 — 초안 생성·판정 표시·사건 앵커 기준 센서 근거 첨부.
 */
export function CaseFileDeskPanel({
  lang,
  camera,
  captureFrame,
  chrome = "bare",
  onCaseChange,
  mapPickActive = false,
  onToggleMapPick,
  pickedPoint = null,
}: Props) {
  const en = lang === "en";
  const bare = chrome === "bare";

  const [token, setToken] = useState("");
  const [caseIdInput, setCaseIdInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [textInput, setTextInput] = useState("");
  const [caseFile, setCaseFile] = useState<CaseFile | null>(null);
  const [explanation, setExplanation] = useState<VerdictExplanation | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [attachMode, setAttachMode] = useState<AttachMode>(null);
  const [claimId, setClaimId] = useState("");
  const [role, setRole] = useState<EvidenceRole>("supports");
  const [radiusKm, setRadiusKm] = useState(15);
  const [withCapture, setWithCapture] = useState(true);
  const [findAllRows, setFindAllRows] = useState<FindAllRow[] | null>(null);
  const [occurredAtEdit, setOccurredAtEdit] = useState("");
  const [placeLabelEdit, setPlaceLabelEdit] = useState("");
  const [placeLatEdit, setPlaceLatEdit] = useState("");
  const [placeLngEdit, setPlaceLngEdit] = useState("");
  const [softUrl, setSoftUrl] = useState("");
  const [softOutlet, setSoftOutlet] = useState("");
  const [softNote, setSoftNote] = useState("");
  const [geoMethod, setGeoMethod] = useState("");
  const [beforeUrl, setBeforeUrl] = useState("");
  const [afterUrl, setAfterUrl] = useState("");
  const [beforeDate, setBeforeDate] = useState("");
  const [afterDate, setAfterDate] = useState("");
  const [editClaimId, setEditClaimId] = useState<string | null>(null);
  const [editStatement, setEditStatement] = useState("");
  const [editOverride, setEditOverride] = useState<Verdict | "">("");
  const [editOverrideReason, setEditOverrideReason] = useState("");

  useEffect(() => {
    const t = readCaseEditorToken();
    const id = readActiveCaseId();
    setToken(t);
    setCaseIdInput(id);
    if (!id) return;
    let cancelled = false;
    void (async () => {
      try {
        const loaded = await fetchCaseFile(id);
        if (cancelled) return;
        setCaseFile(loaded.caseFile);
        setExplanation(loaded.explanation);
      } catch {
        /* 없는 ID면 무시 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!caseFile?.claims.length) return;
    if (claimId && caseFile.claims.some((c) => c.id === claimId)) return;
    const prefer =
      attachMode === "air-raid"
        ? caseFile.claims.find((c) => c.kind === "time")
        : attachMode === "ais"
          ? caseFile.claims.find((c) => c.kind === "place") ??
            caseFile.claims.find((c) => c.kind === "occurrence")
          : caseFile.claims.find((c) => c.kind === "place") ??
            caseFile.claims.find((c) => c.kind === "occurrence");
    setClaimId(prefer?.id ?? caseFile.claims[0]!.id);
  }, [caseFile, attachMode, claimId]);

  useEffect(() => {
    setOccurredAtEdit(isoToUtcInput(caseFile?.incident?.occurredAt));
    const place = caseFile?.incident?.place;
    setPlaceLabelEdit(place?.label ?? "");
    setPlaceLatEdit(place ? String(place.lat) : "");
    setPlaceLngEdit(place ? String(place.lng) : "");
  }, [caseFile?.id, caseFile?.incident, caseFile?.rev]);

  const pickSeq = pickedPoint?.seq ?? 0;
  useEffect(() => {
    if (!pickedPoint) return;
    setPlaceLatEdit(pickedPoint.lat.toFixed(5));
    setPlaceLngEdit(pickedPoint.lng.toFixed(5));
    setStatus(
      en
        ? "Point picked — review and press Save place"
        : "지도에서 지점을 찍었습니다 — 확인 후 「위치 저장」을 누르세요",
    );
    // seq만 보고 반응 — 같은 좌표를 다시 찍어도 채움
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickSeq]);

  useEffect(() => {
    if (!mapPickActive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onToggleMapPick?.(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mapPickActive, onToggleMapPick]);

  const refresh = useCallback(
    async (id: string) => {
      const loaded = await fetchCaseFile(id);
      setCaseFile(loaded.caseFile);
      setExplanation(loaded.explanation);
      writeActiveCaseId(loaded.caseFile.id);
      setCaseIdInput(loaded.caseFile.id);
      onCaseChange?.(loaded.caseFile.id);
    },
    [onCaseChange],
  );

  const onSaveToken = () => {
    writeCaseEditorToken(token);
    setStatus(en ? "Token saved for this session" : "편집 토큰을 이 세션에 저장했습니다");
    setError(null);
  };

  const onLoadCase = async () => {
    const id = caseIdInput.trim();
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      await refresh(id);
      setStatus(en ? "Case loaded" : "사건을 불러왔습니다");
    } catch (e) {
      setError(e instanceof CaseApiError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const onCreate = async () => {
    if (!token.trim()) {
      setError(en ? "Editor token required" : "편집 토큰이 필요합니다");
      return;
    }
    if (!urlInput.trim() && !textInput.trim()) {
      setError(en ? "URL or article text required" : "URL 또는 본문이 필요합니다");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      writeCaseEditorToken(token);
      const draft = await extractCaseDraft(token, {
        url: urlInput.trim() || undefined,
        text: textInput,
      });
      const { caseFile: created } = await createCaseFromDraft(token, draft);
      await refresh(created.id);
      setStatus(
        en
          ? `Created ${created.id}`
          : `사건 생성: ${created.id}`,
      );
      setAttachMode(null);
    } catch (e) {
      setError(e instanceof CaseApiError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const onSaveIncidentPlace = async () => {
    if (!caseFile || !token.trim()) {
      setError(en ? "Editor token required" : "편집 토큰이 필요합니다");
      return;
    }
    const lat = Number(placeLatEdit.trim());
    const lng = Number(placeLngEdit.trim());
    if (
      !placeLatEdit.trim() ||
      !placeLngEdit.trim() ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      Math.abs(lat) > 90 ||
      Math.abs(lng) > 180
    ) {
      setError(
        en
          ? "Latitude −90…90, longitude −180…180"
          : "위도는 −90~90, 경도는 −180~180 사이 숫자로 입력하세요",
      );
      return;
    }
    setBusy(true);
    setError(null);
    try {
      writeCaseEditorToken(token);
      const incident = {
        ...(caseFile.incident ?? emptyIncident()),
        place: {
          label:
            placeLabelEdit.trim() ||
            (en ? "Editor point" : "편집자 지정 지점"),
          lat,
          lng,
          precision: "point",
          source: "editor" as const,
        },
      };
      const nextCase = applyIncidentToCaseFile(caseFile, incident);
      const { caseFile: saved, sanitizeNotes } = await reviseCaseFile({
        token,
        caseId: caseFile.id,
        expectedRev: caseFile.rev,
        op: "update_incident",
        nextCase,
        reason: "editor set incident place",
      });
      await refresh(saved.id);
      setStatus(
        (en
          ? `Place set to ${lat.toFixed(4)}, ${lng.toFixed(4)}`
          : `사건 위치: ${lat.toFixed(4)}, ${lng.toFixed(4)}`) +
          demotionNotice(sanitizeNotes, en),
      );
    } catch (e) {
      setError(e instanceof CaseApiError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const onSaveIncidentTime = async () => {
    if (!caseFile || !token.trim()) {
      setError(en ? "Editor token required" : "편집 토큰이 필요합니다");
      return;
    }
    if (!occurredAtEdit.trim()) {
      setError(en ? "Occurred-at required" : "사건 시각이 필요합니다");
      return;
    }
    const occurredAt = utcInputToIso(occurredAtEdit);
    if (!occurredAt) {
      setError(en ? "Invalid datetime" : "시각 형식이 올바르지 않습니다");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      writeCaseEditorToken(token);
      const incident = {
        ...(caseFile.incident ?? emptyIncident()),
        occurredAt,
        occurredAtSource: "editor" as const,
      };
      const nextCase = applyIncidentToCaseFile(caseFile, incident);
      const { caseFile: saved, sanitizeNotes } = await reviseCaseFile({
        token,
        caseId: caseFile.id,
        expectedRev: caseFile.rev,
        op: "update_incident",
        nextCase,
        reason: "editor set incident time",
      });
      await refresh(saved.id);
      setStatus(
        (en ? "Occurred-at saved" : "사건 시각을 저장했습니다") +
          demotionNotice(sanitizeNotes, en),
      );
    } catch (e) {
      setError(e instanceof CaseApiError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const resetSoftFields = () => {
    setSoftUrl("");
    setSoftOutlet("");
    setSoftNote("");
    setGeoMethod("");
    setBeforeUrl("");
    setAfterUrl("");
    setBeforeDate("");
    setAfterDate("");
  };

  const onSaveClaimEdit = async () => {
    if (!caseFile || !editClaimId || !token.trim()) {
      setError(en ? "Editor token required" : "편집 토큰이 필요합니다");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      writeCaseEditorToken(token);
      let override: { verdict: Verdict; reason: string } | null | undefined;
      if (editOverride === "") {
        override = null;
      } else if (editOverride) {
        const reason = editOverrideReason.trim();
        if (!reason) {
          setError(
            en
              ? "Override reason required"
              : "편집자 판정 이유를 입력하세요",
          );
          setBusy(false);
          return;
        }
        override = { verdict: editOverride, reason };
      }
      const { caseFile: saved, sanitizeNotes } = await updateClaimFields({
        token,
        caseId: caseFile.id,
        expectedRev: caseFile.rev,
        caseFile,
        claimId: editClaimId,
        statement: editStatement,
        override,
      });
      await refresh(saved.id);
      setEditClaimId(null);
      setStatus(
        (en ? "Claim updated" : "주장을 저장했습니다") +
          demotionNotice(sanitizeNotes, en),
      );
    } catch (e) {
      setError(e instanceof CaseApiError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const onAttach = async () => {
    if (!caseFile || !attachMode || !claimId) return;
    if (!token.trim()) {
      setError(en ? "Editor token required" : "편집 토큰이 필요합니다");
      return;
    }
    if (isSensorAttach(attachMode)) {
      const incident = caseFile.incident ?? emptyIncident();
      if (!incident.place || !incident.occurredAt) {
        setError(
          en
            ? "Set incident place and time before attaching sensor evidence"
            : "센서 근거를 붙이려면 사건 위치·시각을 먼저 설정하세요",
        );
        return;
      }
    }
    setBusy(true);
    setError(null);
    try {
      writeCaseEditorToken(token);
      const attached = isSoftAttach(attachMode)
        ? await attachSoftEvidence({
            token,
            caseId: caseFile.id,
            expectedRev: caseFile.rev,
            claimId,
            source: attachMode,
            role,
            url: softUrl.trim() || undefined,
            outlet: softOutlet.trim() || undefined,
            note: softNote.trim() || undefined,
            imageUrl:
              attachMode === "photo" ? softUrl.trim() || undefined : undefined,
            geolocationMethod: geoMethod.trim() || undefined,
            beforeUrl: beforeUrl.trim() || undefined,
            afterUrl: afterUrl.trim() || undefined,
            beforeDate: beforeDate.trim() || undefined,
            afterDate: afterDate.trim() || undefined,
          })
        : await attachSensorEvidence({
            token,
            caseId: caseFile.id,
            expectedRev: caseFile.rev,
            claimId,
            role,
            ...sensorRequestOptions(attachMode, radiusKm),
          });

      let next = attached.caseFile;
      const rel = attached.evidence.relevance?.summary;
      let note =
        en
          ? `Attached ${attachMode} → ${attached.evidence.strength}${rel ? ` (${rel})` : ""}`
          : `${attachMode} 첨부됨 → 강도 ${attached.evidence.strength}${rel ? ` (${rel})` : ""}`;
      const wantCapture = withCapture && captureFrame && canCaptureMode(attachMode);
      if (wantCapture && captureFrame) {
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
            note = en ? `${note} + capture` : `${note} + 캡처`;
          }
        } catch (capErr) {
          note = en
            ? `Evidence attached; capture failed: ${capErr instanceof Error ? capErr.message : String(capErr)}`
            : `근거는 붙였지만 캡처 실패: ${capErr instanceof Error ? capErr.message : String(capErr)}`;
        }
      }

      await refresh(next.id);
      setAttachMode(null);
      resetSoftFields();
      setStatus(note);
    } catch (e) {
      setError(e instanceof CaseApiError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const openSensorMode = (mode: SensorAttachMode) => {
    const r = SENSOR_DEFAULT_RADIUS_KM[mode];
    if (r != null) setRadiusKm(r);
    setAttachMode(mode);
  };

  /** 사건 앵커로 모든 센서를 차례로 조회·첨부 — 못 찾은 이유까지 남김 */
  const onFindAll = async () => {
    if (!caseFile) return;
    const targetClaimId = claimId || caseFile.claims[0]?.id || "";
    if (!targetClaimId) return;
    if (!token.trim()) {
      setError(en ? "Editor token required" : "편집 토큰이 필요합니다");
      return;
    }
    const incident = caseFile.incident ?? emptyIncident();
    if (!incident.place || !incident.occurredAt) {
      setError(
        en
          ? "Set incident place and time first"
          : "사건 위치·시각을 먼저 설정하세요",
      );
      return;
    }
    writeCaseEditorToken(token);
    setBusy(true);
    setError(null);
    const rows: FindAllRow[] = [];
    setFindAllRows(rows);
    const claim = caseFile.claims.find((c) => c.id === targetClaimId);
    const existingKinds = new Set(
      (claim?.evidence ?? []).map((ev) => evidenceSourceKind(ev.sourceKey)),
    );
    let rev = caseFile.rev;
    const findSteps = findStepsForEventType(caseFile.eventType);
    for (const step of findSteps) {
      const label = en ? step.en : step.ko;
      if (step.kinds.some((k) => existingKinds.has(k))) {
        rows.push({ label, state: "skipped", detail: en ? "already attached" : "이미 붙어 있음" });
        setFindAllRows([...rows]);
        continue;
      }
      setStatus(en ? `Searching ${label}…` : `${label} 찾는 중…`);
      try {
        const attached = await attachSensorEvidence({
          token,
          caseId: caseFile.id,
          expectedRev: rev,
          claimId: targetClaimId,
          role: step.role,
          ...sensorRequestOptions(step.mode, SENSOR_DEFAULT_RADIUS_KM[step.mode] ?? 15),
        });
        rev = attached.caseFile.rev;
        const count =
          (attached.evidence.frozenPayload as { resultCount?: number } | null)?.resultCount ?? 0;
        rows.push({
          label,
          state: count > 0 ? "found" : "none",
          detail:
            count > 0
              ? attached.evidence.shows
              : `${attached.evidence.shows} — ${attached.evidence.limits}`,
        });
      } catch (e) {
        rows.push({
          label,
          state: "failed",
          detail: e instanceof CaseApiError || e instanceof Error ? e.message : String(e),
        });
      }
      setFindAllRows([...rows]);
    }
    try {
      await refresh(caseFile.id);
    } finally {
      const found = rows.filter((r) => r.state === "found").length;
      const missing = rows.filter((r) => r.state === "none" || r.state === "failed").length;
      setStatus(
        en
          ? `Search done — found ${found}, missing ${missing}`
          : `찾기 완료 — 찾음 ${found} · 못 찾음 ${missing}`,
      );
      setBusy(false);
    }
  };

  const verdictTone = (v: Verdict) => {
    if (v === "confirmed") return "text-emerald-200";
    if (v === "partial") return "text-amber-200";
    if (v === "refuted") return "text-rose-200";
    return "text-white/80";
  };

  const stepProgress = investigationStepProgress(caseFile);
  const activeStepId = deriveInvestigationStep(caseFile);
  const activeStepMeta = INVESTIGATION_STEPS.find((s) => s.id === activeStepId);
  const procedureItems = caseFile
    ? procedureChecklistFor(caseFile.eventType)
    : [];
  const unconfirmedCore =
    explanation?.core.filter((c) => c.verdict === "unconfirmed") ?? [];

  return (
    <section
      className={
        bare
          ? "pointer-events-auto flex flex-col gap-2 px-2.5 py-2"
          : "pointer-events-auto flex max-w-[min(22rem,84vw)] flex-col gap-2 rounded-md border border-rose-500/35 bg-[#140810]/94 px-2.5 py-2"
      }
      aria-label={en ? "Case file desk" : "사건 파일"}
    >
      <header className="flex items-start justify-between gap-2">
        <div>
          <p className="text-micro uppercase tracking-[0.18em] text-rose-200/70">
            {en ? "Case file" : "사건 파일"}
          </p>
          {caseFile ? (
            <p className={`mt-0.5 text-sm font-semibold ${verdictTone(caseFile.verdict)}`}>
              {en
                ? VERDICT_LABEL[caseFile.verdict].en
                : VERDICT_LABEL[caseFile.verdict].ko}
            </p>
          ) : (
            <p className="mt-0.5 text-sm text-white/60">
              {en ? "No open case" : "열린 사건 없음"}
            </p>
          )}
        </div>
        <span className="text-micro tabular-nums text-white/65">
          {camera.lat.toFixed(2)}, {camera.lng.toFixed(2)}
        </span>
      </header>

      <nav
        aria-label={en ? "Investigation steps" : "조사 단계"}
        className="rounded-sm border border-white/10 bg-black/35 px-1.5 py-1.5"
      >
        <ol className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
          {INVESTIGATION_STEPS.map((step, i) => {
            const state = stepProgress[step.id];
            const tone =
              state === "done"
                ? "text-emerald-200/90"
                : state === "active"
                  ? "text-rose-100"
                  : "text-white/60";
            return (
              <li key={step.id} className={`flex items-center gap-1 text-micro ${tone}`}>
                {i > 0 ? <span className="text-white/50" aria-hidden>→</span> : null}
                <span
                  className={
                    state === "active"
                      ? "font-semibold underline underline-offset-2"
                      : state === "done"
                        ? "font-medium"
                        : ""
                  }
                >
                  {en ? step.en : step.ko}
                </span>
              </li>
            );
          })}
        </ol>
        {activeStepMeta ? (
          <p className="mt-1 text-micro leading-snug text-white/80">
            {en ? "Next: " : "다음: "}
            <span className="text-white/95">
              {en ? activeStepMeta.hintEn : activeStepMeta.hintKo}
            </span>
          </p>
        ) : null}
      </nav>

      <label className="block text-micro text-white/80">
        {en ? "Editor token" : "편집 토큰"}
        <div className="mt-0.5 flex gap-1">
          <input
            type="password"
            autoComplete="off"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="min-w-0 flex-1 rounded-sm border border-white/15 bg-black/35 px-1.5 py-1 text-micro text-white"
            placeholder="CASE_EDITOR_SECRET"
          />
          <button
            type="button"
            onClick={onSaveToken}
            className="shrink-0 rounded-sm border border-white/20 px-1.5 text-micro text-white/80 hover:bg-white/10"
          >
            {en ? "Save" : "저장"}
          </button>
        </div>
      </label>

      <label className="block text-micro text-white/80">
        {en ? "Case ID" : "사건 ID"}
        <div className="mt-0.5 flex gap-1">
          <input
            value={caseIdInput}
            onChange={(e) => setCaseIdInput(e.target.value)}
            className="min-w-0 flex-1 rounded-sm border border-white/15 bg-black/35 px-1.5 py-1 font-mono text-micro text-white"
            placeholder="case_…"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void onLoadCase()}
            className="shrink-0 rounded-sm border border-white/20 px-1.5 text-micro text-white/80 hover:bg-white/10 disabled:opacity-40"
          >
            {en ? "Load" : "열기"}
          </button>
        </div>
      </label>

      {!caseFile ? (
        <div className="flex flex-col gap-1.5 border-t border-white/10 pt-2">
          <label className="block text-micro text-white/80">
            URL
            <input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="mt-0.5 w-full rounded-sm border border-white/15 bg-black/35 px-1.5 py-1 text-micro text-white"
              placeholder="https://…"
            />
          </label>
          <label className="block text-micro text-white/80">
            {en ? "Or paste text" : "또는 본문 붙여넣기"}
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              rows={3}
              className="mt-0.5 w-full rounded-sm border border-white/15 bg-black/35 px-1.5 py-1 text-micro text-white"
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() => void onCreate()}
            className="rounded-sm border border-rose-400/45 bg-rose-500/20 px-2 py-1.5 text-micro font-semibold text-rose-50 hover:bg-rose-500/30 disabled:opacity-40"
          >
            {busy
              ? en
                ? "Working…"
                : "처리 중…"
              : en
                ? "Create case file"
                : "사건 파일 만들기"}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 border-t border-white/10 pt-2">
          <div>
            <p className="text-sm font-medium text-white/90 line-clamp-2">
              {caseFile.title || caseFile.id}
            </p>
            <p className="mt-0.5 text-micro text-white/70">
              rev {caseFile.rev} ·{" "}
              {eventTypeLabel(caseFile.eventType, en ? "en" : "ko")}
            </p>
            <a
              href={`/case/${encodeURIComponent(caseFile.id)}`}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-micro text-rose-200/80 underline underline-offset-2 hover:text-rose-100"
            >
              {en ? "Open share page" : "공유 페이지 열기"}
            </a>
          </div>

          <div className="rounded-sm border border-white/10 bg-black/30 p-1.5">
            <p className="text-micro font-semibold text-white/70">
              {en ? "Check procedure" : "확인 절차"}{" "}
              <span className="font-normal text-white/65">
                ({eventTypeLabel(caseFile.eventType, en ? "en" : "ko")})
              </span>
            </p>
            <ul className="mt-1 flex flex-col gap-0.5">
              {procedureItems.map((item) => {
                const done = isProcedureItemDone(caseFile, item);
                return (
                  <li
                    key={item.id}
                    className={`text-micro leading-snug ${done ? "text-emerald-200/90" : "text-white/75"}`}
                  >
                    <span aria-hidden>{done ? "☑" : "☐"} </span>
                    {en ? item.en : item.ko}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="rounded-sm border border-white/10 bg-black/30 p-1.5">
            <p className="text-micro font-semibold text-white/70">
              {en ? "Incident anchor" : "사건 위치·시각"}
            </p>
            <p className="mt-0.5 text-micro text-white/50">
              {caseFile.incident?.place
                ? `${caseFile.incident.place.label} · ${caseFile.incident.place.lat.toFixed(3)}, ${caseFile.incident.place.lng.toFixed(3)}`
                : en
                  ? "Place unset"
                  : "위치 미설정"}
            </p>
            <p className="text-micro text-white/50">
              {caseFile.incident?.occurredAt
                ? `${formatIncidentTime(caseFile.incident.occurredAt, en)} · ${caseFile.incident.occurredAtSource}`
                : en
                  ? "Time unset"
                  : "시각 미설정"}
            </p>
            <div className="mt-1 flex flex-col gap-1">
              <input
                value={placeLabelEdit}
                onChange={(e) => setPlaceLabelEdit(e.target.value)}
                className="w-full rounded-sm border border-white/25 bg-black/70 px-1 py-1 text-micro text-white [&>option]:bg-[#121820] [&>option]:text-white"
                placeholder={en ? "Place name" : "장소 이름"}
              />
              <div className="flex gap-1">
                <input
                  inputMode="decimal"
                  value={placeLatEdit}
                  onChange={(e) => setPlaceLatEdit(e.target.value)}
                  className="min-w-0 flex-1 rounded-sm border border-white/15 bg-black/70 px-1 py-1 font-mono text-micro text-white"
                  placeholder={en ? "Lat" : "위도"}
                  aria-label={en ? "Latitude" : "위도"}
                />
                <input
                  inputMode="decimal"
                  value={placeLngEdit}
                  onChange={(e) => setPlaceLngEdit(e.target.value)}
                  className="min-w-0 flex-1 rounded-sm border border-white/15 bg-black/70 px-1 py-1 font-mono text-micro text-white"
                  placeholder={en ? "Lng" : "경도"}
                  aria-label={en ? "Longitude" : "경도"}
                />
              </div>
              <div className="flex gap-1">
                {onToggleMapPick ? (
                  <button
                    type="button"
                    disabled={busy}
                    aria-pressed={mapPickActive}
                    onClick={() => onToggleMapPick(!mapPickActive)}
                    className={
                      mapPickActive
                        ? "flex-1 rounded-sm border border-rose-300/70 bg-rose-500/30 px-1.5 py-1 text-micro font-semibold text-rose-50"
                        : "flex-1 rounded-sm border border-white/15 px-1.5 py-1 text-micro text-white/70 hover:bg-white/10 disabled:opacity-40"
                    }
                  >
                    {mapPickActive
                      ? en
                        ? "Click the map… (Esc)"
                        : "지도를 클릭하세요… (Esc 취소)"
                      : en
                        ? "Pick on map"
                        : "지도에서 찍기"}
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setPlaceLatEdit(camera.lat.toFixed(5));
                    setPlaceLngEdit(camera.lng.toFixed(5));
                  }}
                  className="flex-1 rounded-sm border border-white/15 px-1.5 py-1 text-micro text-white/70 hover:bg-white/10 disabled:opacity-40"
                >
                  {en ? "Fill from camera" : "카메라 중심 채우기"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onSaveIncidentPlace()}
                  className="shrink-0 rounded-sm border border-white/20 px-1.5 py-1 text-micro text-white/80 hover:bg-white/10 disabled:opacity-40"
                >
                  {en ? "Save place" : "위치 저장"}
                </button>
              </div>
              <label className="block text-micro text-white/80">
                {en ? "Occurred at (UTC)" : "사건 시각 (UTC 기준 입력)"}
                <div className="mt-0.5 flex gap-1">
                  <input
                    type="datetime-local"
                    value={occurredAtEdit}
                    onChange={(e) => setOccurredAtEdit(e.target.value)}
                    className="min-w-0 flex-1 rounded-sm border border-white/25 bg-black/70 px-1 py-1 text-micro text-white [&>option]:bg-[#121820] [&>option]:text-white"
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void onSaveIncidentTime()}
                    className="shrink-0 rounded-sm border border-white/20 px-1.5 text-micro text-white/80 hover:bg-white/10 disabled:opacity-40"
                  >
                    {en ? "Save" : "저장"}
                  </button>
                </div>
              </label>
            </div>
          </div>

          <ul className="flex flex-col gap-1">
            {caseFile.claims.map((c) => {
              const shown = effectiveClaimVerdict(c);
              const editor = Boolean(c.override);
              const editing = editClaimId === c.id;
              return (
              <li
                key={c.id}
                className="rounded-sm border border-white/10 bg-black/25 px-1.5 py-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    className="text-left text-micro font-semibold text-white/80 hover:text-rose-100"
                    onClick={() => {
                      if (editing) {
                        setEditClaimId(null);
                        return;
                      }
                      setEditClaimId(c.id);
                      setEditStatement(c.statement);
                      setEditOverride(c.override?.verdict ?? "");
                      setEditOverrideReason(c.override?.reason ?? "");
                    }}
                  >
                    {en ? CLAIM_LABEL[c.kind].en : CLAIM_LABEL[c.kind].ko}
                    <span className="ml-1 font-normal text-white/65">
                      {en ? "edit" : "수정"}
                    </span>
                  </button>
                  <span className={`text-micro ${verdictTone(shown)}`}>
                    {en
                      ? VERDICT_LABEL[shown].en
                      : VERDICT_LABEL[shown].ko}
                    {editor
                      ? en
                        ? " · editor"
                        : " · 편집자 판단"
                      : ""}
                  </span>
                </div>
                {editing ? (
                  <div className="mt-1 flex flex-col gap-1 border-t border-white/10 pt-1">
                    <label className="block text-micro text-white/80">
                      {en ? "Statement" : "주장 문장"}
                      <textarea
                        value={editStatement}
                        onChange={(e) => setEditStatement(e.target.value)}
                        rows={2}
                        className="mt-0.5 w-full rounded-sm border border-white/25 bg-black/70 px-1 py-1 text-micro text-white [&>option]:bg-[#121820] [&>option]:text-white"
                      />
                    </label>
                    <label className="block text-micro text-white/80">
                      {en ? "Editor verdict" : "편집자 판정"}
                      <select
                        value={editOverride}
                        onChange={(e) =>
                          setEditOverride(
                            (e.target.value as Verdict | "") || "",
                          )
                        }
                        className="mt-0.5 w-full rounded-sm border border-white/25 bg-black/70 px-1 py-1 text-micro text-white [&>option]:bg-[#121820] [&>option]:text-white"
                      >
                        <option value="">
                          {en ? "Rule only (clear override)" : "규칙만 (편집자 판정 해제)"}
                        </option>
                        {(Object.keys(VERDICT_LABEL) as Verdict[]).map((v) => (
                          <option key={v} value={v}>
                            {en ? VERDICT_LABEL[v].en : VERDICT_LABEL[v].ko}
                          </option>
                        ))}
                      </select>
                    </label>
                    {editOverride ? (
                      <label className="block text-micro text-white/80">
                        {en ? "Reason" : "이유"}
                        <input
                          value={editOverrideReason}
                          onChange={(e) => setEditOverrideReason(e.target.value)}
                          className="mt-0.5 w-full rounded-sm border border-white/25 bg-black/70 px-1 py-1 text-micro text-white [&>option]:bg-[#121820] [&>option]:text-white"
                          placeholder={en ? "Required" : "필수"}
                        />
                      </label>
                    ) : null}
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void onSaveClaimEdit()}
                        className="flex-1 rounded-sm border border-rose-400/40 bg-rose-500/20 px-2 py-1 text-micro text-rose-50 disabled:opacity-40"
                      >
                        {en ? "Save claim" : "주장 저장"}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setEditClaimId(null)}
                        className="rounded-sm border border-white/15 px-2 py-1 text-micro text-white/70"
                      >
                        {en ? "Cancel" : "취소"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {c.statement ? (
                      <p className="mt-0.5 line-clamp-2 text-micro text-white/50">
                        {c.statement}
                      </p>
                    ) : null}
                    <p className="mt-0.5 text-micro text-white/65">
                      {en ? "Evidence" : "근거"} {c.evidence.length}
                    </p>
                    {c.evidence.length > 0 ? (
                      <ul className="mt-1 flex flex-col gap-0.5 border-t border-white/5 pt-1">
                        {c.evidence.slice(0, 4).map((ev) => (
                          <li key={ev.id} className="text-micro text-white/70">
                            <span className="text-white/60">
                              {ev.sourceKey.split(":")[0]}
                            </span>
                            {" · "}
                            {ev.role === "supports"
                              ? en
                                ? "supports"
                                : "뒷받침"
                              : ev.role === "contradicts"
                                ? en
                                  ? "contradicts"
                                  : "반박"
                                : en
                                  ? "context"
                                  : "맥락"}
                            {" · "}
                            {ev.strength}
                            {ev.relevance?.summary
                              ? ` — ${ev.relevance.summary}`
                              : ev.shows
                                ? ` — ${ev.shows.slice(0, 40)}`
                                : ""}
                          </li>
                        ))}
                        {c.evidence.length > 4 ? (
                          <li className="text-micro text-white/55">
                            +{c.evidence.length - 4}
                          </li>
                        ) : null}
                      </ul>
                    ) : null}
                  </>
                )}
              </li>
              );
            })}
          </ul>

          {explanation?.why ? (
            <div className="rounded-sm border border-white/10 bg-black/30 p-1.5">
              <p className="text-micro font-semibold text-white/70">
                {en ? "Why this verdict" : "왜 이 판정인가"}
              </p>
              <p className="mt-0.5 text-micro leading-snug text-white/80">
                {explanation.why}
              </p>
            </div>
          ) : null}

          {unconfirmedCore.length > 0 ||
          (explanation?.whatWouldChange.length ?? 0) > 0 ? (
            <div className="rounded-sm border border-amber-400/25 bg-amber-950/30 p-1.5">
              <p className="text-micro font-semibold text-amber-100/90">
                {en ? "Not confirmed yet" : "아직 확인 못 한 것"}
              </p>
              {unconfirmedCore.length > 0 ? (
                <ul className="mt-1 flex flex-col gap-0.5">
                  {unconfirmedCore.map((c) => (
                    <li key={c.kind} className="text-micro text-white/75">
                      · {en ? CLAIM_LABEL[c.kind].en : CLAIM_LABEL[c.kind].ko}
                      {c.statement ? ` — ${c.statement.slice(0, 48)}` : ""}
                    </li>
                  ))}
                </ul>
              ) : null}
              {explanation && explanation.whatWouldChange.length > 0 ? (
                <>
                  <p className="mt-1.5 text-micro font-semibold text-amber-100/80">
                    {en ? "What would change the verdict" : "무엇이 있으면 판정이 바뀌나"}
                  </p>
                  <ul className="mt-0.5 flex flex-col gap-0.5">
                    {explanation.whatWouldChange.slice(0, 4).map((line) => (
                      <li key={line} className="text-micro leading-snug text-white/70">
                        · {line}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
          ) : null}

          {attachMode ? (
            <div className="flex flex-col gap-1.5 rounded-sm border border-rose-400/30 bg-rose-950/40 p-1.5">
              <p className="text-micro font-semibold text-rose-100">
                {attachMode === "firms"
                  ? en
                    ? "Attach FIRMS at incident"
                    : "사건 앵커 FIRMS"
                  : attachMode === "air-raid"
                    ? en
                      ? "Attach air-raid at incident"
                      : "사건 앵커 공습 이력"
                    : attachMode === "ais"
                      ? en
                        ? "Attach AIS at incident"
                        : "사건 앵커 AIS"
                      : attachMode === "adsb"
                        ? en
                          ? "Military aircraft tracks at incident"
                          : "사건 앵커 군용기 항적"
                      : attachMode === "satellite-auto"
                        ? en
                          ? "Sentinel before/after at incident"
                          : "사건 앵커 위성 전후 영상 (자동)"
                      : attachMode === "control-zone"
                        ? en
                          ? "Control zone on incident date"
                          : "사건 당일 통제 구역"
                      : attachMode === "facility"
                        ? en
                          ? "Facilities near incident (OSM)"
                          : "사건 지점 주변 시설 (OSM)"
                      : attachMode === "media"
                        ? en
                          ? "Attach press URL"
                          : "언론 URL 첨부"
                        : attachMode === "photo"
                          ? en
                            ? "Attach field photo"
                            : "현장 사진 첨부"
                          : attachMode === "satellite"
                            ? en
                              ? "Attach satellite imagery"
                              : "위성 영상 첨부"
                            : en
                              ? "Attach manual note"
                              : "수동 근거 첨부"}
              </p>
              <label className="block text-micro text-white/80">
                {en ? "Claim" : "세부 주장"}
                <select
                  value={claimId}
                  onChange={(e) => setClaimId(e.target.value)}
                  className="mt-0.5 w-full rounded-sm border border-white/25 bg-black/70 px-1 py-1 text-micro text-white [&>option]:bg-[#121820] [&>option]:text-white"
                >
                  {caseFile.claims.map((c) => (
                    <option key={c.id} value={c.id}>
                      {en ? CLAIM_LABEL[c.kind].en : CLAIM_LABEL[c.kind].ko}
                      {c.statement ? ` — ${c.statement.slice(0, 24)}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-micro text-white/80">
                {en ? "Role" : "역할"}
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as EvidenceRole)}
                  className="mt-0.5 w-full rounded-sm border border-white/25 bg-black/70 px-1 py-1 text-micro text-white [&>option]:bg-[#121820] [&>option]:text-white"
                >
                  <option value="supports">{en ? "Supports" : "뒷받침"}</option>
                  <option value="contradicts">
                    {en ? "Contradicts" : "반박"}
                  </option>
                  <option value="context">{en ? "Context" : "맥락"}</option>
                </select>
              </label>
              {isSensorAttach(attachMode) && SENSOR_DEFAULT_RADIUS_KM[attachMode] != null ? (
                <label className="block text-micro text-white/80">
                  {en ? "Radius km" : "반경 km"}
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={radiusKm}
                    onChange={(e) => setRadiusKm(Number(e.target.value) || 15)}
                    className="mt-0.5 w-full rounded-sm border border-white/25 bg-black/70 px-1 py-1 text-micro text-white [&>option]:bg-[#121820] [&>option]:text-white"
                  />
                </label>
              ) : null}
              {attachMode === "media" ? (
                <>
                  <label className="block text-micro text-white/80">
                    URL <span className="text-rose-300/80">*</span>
                    <input
                      value={softUrl}
                      onChange={(e) => setSoftUrl(e.target.value)}
                      className="mt-0.5 w-full rounded-sm border border-white/25 bg-black/70 px-1 py-1 text-micro text-white [&>option]:bg-[#121820] [&>option]:text-white"
                      placeholder="https://…"
                    />
                  </label>
                  <label className="block text-micro text-white/80">
                    {en ? "Outlet (optional)" : "매체명 (선택)"}
                    <input
                      value={softOutlet}
                      onChange={(e) => setSoftOutlet(e.target.value)}
                      className="mt-0.5 w-full rounded-sm border border-white/25 bg-black/70 px-1 py-1 text-micro text-white [&>option]:bg-[#121820] [&>option]:text-white"
                    />
                  </label>
                </>
              ) : null}
              {attachMode === "photo" ? (
                <>
                  <label className="block text-micro text-white/80">
                    {en ? "Image URL" : "이미지 URL"}
                    <input
                      value={softUrl}
                      onChange={(e) => setSoftUrl(e.target.value)}
                      className="mt-0.5 w-full rounded-sm border border-white/25 bg-black/70 px-1 py-1 text-micro text-white [&>option]:bg-[#121820] [&>option]:text-white"
                      placeholder="https://… or capture"
                    />
                  </label>
                  <label className="block text-micro text-white/80">
                    {en ? "Geolocation method" : "위치 맞춤 방법"}
                    <input
                      value={geoMethod}
                      onChange={(e) => setGeoMethod(e.target.value)}
                      className="mt-0.5 w-full rounded-sm border border-white/25 bg-black/70 px-1 py-1 text-micro text-white [&>option]:bg-[#121820] [&>option]:text-white"
                      placeholder={en ? "e.g. landmarks vs sat" : "예: 지형지물·위성 대조"}
                    />
                  </label>
                </>
              ) : null}
              {attachMode === "satellite" ? (
                <>
                  <label className="block text-micro text-white/80">
                    {en ? "Before URL" : "전 URL"}
                    <input
                      value={beforeUrl}
                      onChange={(e) => setBeforeUrl(e.target.value)}
                      className="mt-0.5 w-full rounded-sm border border-white/25 bg-black/70 px-1 py-1 text-micro text-white [&>option]:bg-[#121820] [&>option]:text-white"
                    />
                  </label>
                  <label className="block text-micro text-white/80">
                    {en ? "After URL" : "후 URL"}
                    <input
                      value={afterUrl}
                      onChange={(e) => setAfterUrl(e.target.value)}
                      className="mt-0.5 w-full rounded-sm border border-white/25 bg-black/70 px-1 py-1 text-micro text-white [&>option]:bg-[#121820] [&>option]:text-white"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-1">
                    <label className="block text-micro text-white/80">
                      {en ? "Before date" : "전 촬영일"}
                      <input
                        type="date"
                        value={beforeDate}
                        onChange={(e) => setBeforeDate(e.target.value)}
                        className="mt-0.5 w-full rounded-sm border border-white/25 bg-black/70 px-1 py-1 text-micro text-white [&>option]:bg-[#121820] [&>option]:text-white"
                      />
                    </label>
                    <label className="block text-micro text-white/80">
                      {en ? "After date" : "후 촬영일"}
                      <input
                        type="date"
                        value={afterDate}
                        onChange={(e) => setAfterDate(e.target.value)}
                        className="mt-0.5 w-full rounded-sm border border-white/25 bg-black/70 px-1 py-1 text-micro text-white [&>option]:bg-[#121820] [&>option]:text-white"
                      />
                    </label>
                  </div>
                </>
              ) : null}
              {attachMode === "manual" ? (
                <>
                  <label className="block text-micro text-white/80">
                    URL
                    <input
                      value={softUrl}
                      onChange={(e) => setSoftUrl(e.target.value)}
                      className="mt-0.5 w-full rounded-sm border border-white/25 bg-black/70 px-1 py-1 text-micro text-white [&>option]:bg-[#121820] [&>option]:text-white"
                    />
                  </label>
                  <label className="block text-micro text-white/80">
                    {en ? "Note" : "설명"}
                    <textarea
                      value={softNote}
                      onChange={(e) => setSoftNote(e.target.value)}
                      rows={2}
                      className="mt-0.5 w-full rounded-sm border border-white/25 bg-black/70 px-1 py-1 text-micro text-white [&>option]:bg-[#121820] [&>option]:text-white"
                    />
                  </label>
                </>
              ) : null}
              {captureFrame && canCaptureMode(attachMode) ? (
                <label className="flex items-center gap-1.5 text-micro text-white/60">
                  <input
                    type="checkbox"
                    checked={withCapture}
                    onChange={(e) => setWithCapture(e.target.checked)}
                  />
                  {en ? "Capture map frame" : "화면 캡처도 첨부"}
                </label>
              ) : null}
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onAttach()}
                  className="flex-1 rounded-sm border border-rose-400/45 bg-rose-500/25 px-2 py-1 text-micro font-semibold text-rose-50 disabled:opacity-40"
                >
                  {busy ? (en ? "…" : "…") : en ? "Add evidence" : "근거로 추가"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setAttachMode(null);
                    resetSoftFields();
                  }}
                  className="rounded-sm border border-white/15 px-2 py-1 text-micro text-white/70"
                >
                  {en ? "Cancel" : "취소"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {caseFile.claims.length > 1 ? (
                <label className="block text-micro text-white/80">
                  {en ? "Find for claim" : "찾기 대상 주장"}
                  <select
                    value={claimId}
                    onChange={(e) => setClaimId(e.target.value)}
                    className="mt-0.5 w-full rounded-sm border border-white/25 bg-black/70 px-1 py-1 text-micro text-white [&>option]:bg-[#121820] [&>option]:text-white"
                  >
                    {caseFile.claims.map((c) => (
                      <option key={c.id} value={c.id}>
                        {en ? CLAIM_LABEL[c.kind].en : CLAIM_LABEL[c.kind].ko}
                        {c.statement ? ` — ${c.statement.slice(0, 24)}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <button
                type="button"
                disabled={busy}
                onClick={() => void onFindAll()}
                className="rounded-sm border border-emerald-400/50 bg-emerald-500/20 px-2 py-1.5 text-left text-micro font-semibold text-emerald-50 hover:bg-emerald-500/30 disabled:opacity-40"
              >
                {en
                  ? `Find all · ${eventTypeLabel(caseFile.eventType, "en")} order`
                  : `한 번에 찾기 · ${eventTypeLabel(caseFile.eventType, "ko")} 순서`}
              </button>
              {findAllRows?.length ? (
                <ul className="flex flex-col gap-0.5 rounded-sm border border-white/10 bg-black/30 p-1">
                  {findAllRows.map((r) => (
                    <li key={r.label} className="text-micro leading-snug">
                      <span
                        className={
                          r.state === "found"
                            ? "text-emerald-200"
                            : r.state === "skipped"
                              ? "text-white/65"
                              : r.state === "failed"
                                ? "text-rose-200"
                                : "text-amber-200"
                        }
                      >
                        {r.state === "found"
                          ? en ? "Found" : "찾음"
                          : r.state === "skipped"
                            ? en ? "Skipped" : "건너뜀"
                            : r.state === "failed"
                              ? en ? "Failed" : "실패"
                              : en ? "None" : "없음"}{" "}
                        · {r.label}
                      </span>
                      <span className="block text-white/80">{r.detail}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <button
                type="button"
                disabled={busy}
                onClick={() => openSensorMode("satellite-auto")}
                className="rounded-sm border border-sky-400/40 bg-sky-500/15 px-2 py-1.5 text-left text-micro font-semibold text-sky-50 hover:bg-sky-500/25 disabled:opacity-40"
              >
                {en ? "Satellite before/after (auto)" : "위성 전후 · 자동 조회"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => openSensorMode("adsb")}
                className="rounded-sm border border-indigo-400/40 bg-indigo-500/15 px-2 py-1.5 text-left text-micro font-semibold text-indigo-50 hover:bg-indigo-500/25 disabled:opacity-40"
              >
                {en ? "Military aircraft (incident)" : "군용기 항적 · 사건 앵커"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => openSensorMode("control-zone")}
                className="rounded-sm border border-fuchsia-400/40 bg-fuchsia-500/15 px-2 py-1.5 text-left text-micro font-semibold text-fuchsia-50 hover:bg-fuchsia-500/25 disabled:opacity-40"
              >
                {en ? "Control zone (Ukraine)" : "통제 구역 · 우크라이나"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => openSensorMode("facility")}
                className="rounded-sm border border-lime-400/40 bg-lime-500/15 px-2 py-1.5 text-left text-micro font-semibold text-lime-50 hover:bg-lime-500/25 disabled:opacity-40"
              >
                {en ? "Nearby facilities (OSM)" : "주변 시설 · OSM"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => openSensorMode("firms")}
                className="rounded-sm border border-orange-400/40 bg-orange-500/15 px-2 py-1.5 text-left text-micro font-semibold text-orange-50 hover:bg-orange-500/25 disabled:opacity-40"
              >
                {en ? "FIRMS (incident)" : "FIRMS · 사건 앵커"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => openSensorMode("air-raid")}
                className="rounded-sm border border-cyan-400/40 bg-cyan-500/15 px-2 py-1.5 text-left text-micro font-semibold text-cyan-50 hover:bg-cyan-500/25 disabled:opacity-40"
              >
                {en ? "Air-raid (incident)" : "공습 이력 · 사건 앵커"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => openSensorMode("ais")}
                className="rounded-sm border border-teal-400/40 bg-teal-500/15 px-2 py-1.5 text-left text-micro font-semibold text-teal-50 hover:bg-teal-500/25 disabled:opacity-40"
              >
                {en ? "AIS (incident)" : "AIS · 사건 앵커"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setAttachMode("media")}
                className="rounded-sm border border-violet-400/40 bg-violet-500/15 px-2 py-1.5 text-left text-micro font-semibold text-violet-50 hover:bg-violet-500/25 disabled:opacity-40"
              >
                {en ? "Press URL" : "언론 URL"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setAttachMode("photo")}
                className="rounded-sm border border-amber-400/40 bg-amber-500/15 px-2 py-1.5 text-left text-micro font-semibold text-amber-50 hover:bg-amber-500/25 disabled:opacity-40"
              >
                {en ? "Field photo" : "현장 사진"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setAttachMode("satellite")}
                className="rounded-sm border border-sky-400/40 bg-sky-500/15 px-2 py-1.5 text-left text-micro font-semibold text-sky-50 hover:bg-sky-500/25 disabled:opacity-40"
              >
                {en ? "Satellite" : "위성"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setAttachMode("manual")}
                className="rounded-sm border border-white/25 bg-white/5 px-2 py-1.5 text-left text-micro font-semibold text-white/80 hover:bg-white/10 disabled:opacity-40"
              >
                {en ? "Manual note" : "수동 근거"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  writeActiveCaseId("");
                  setCaseFile(null);
                  setExplanation(null);
                  setCaseIdInput("");
                  setStatus(null);
                  setEditClaimId(null);
                  onCaseChange?.(null);
                }}
                className="rounded-sm border border-white/15 px-2 py-1 text-micro text-white/50 hover:bg-white/5"
              >
                {en ? "Close case" : "사건 닫기"}
              </button>
            </div>
          )}
        </div>
      )}

      {status ? (
        <p className="text-micro text-emerald-200/80" role="status">
          {status}
        </p>
      ) : null}
      {error ? (
        <p className="text-micro text-rose-300" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
