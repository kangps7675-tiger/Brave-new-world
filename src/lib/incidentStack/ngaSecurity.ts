import { classifySecurity } from "@/lib/navarea/msiNga";
import type { NavareaFeaturePoint } from "@/lib/navareaHatch";
import { extractVesselName, guessVesselKind } from "@/lib/incidentStack/shipText";
import { seaForPoint, type StackItem } from "@/lib/incidentStack/build";
import { ngaAreaLabel } from "@/lib/incidentStack/ngaArea";

export { ngaAreaLabel };

/**
 * NGA 항행경보 중 "보안 사건(피습)"으로 분류된 것을 선박 사건 스택에 올린다.
 * UKMTO는 선박명을 숨기지만 NGA 경보는 "M/V PETRO DOLPHIN SUFFERED SECURITY INCIDENT"처럼
 * 선박명과 위치를 그대로 적는다. 실제 10월 파일 729건 중 호르무즈·오만만에서 2건이 이 문구였다.
 * (UKMTO와 같은 사건일 수 있다 — 같은 선박·해역·72시간 안이면 UKMTO를 남기고 이쪽을 뺀다.)
 */

export function stackItemFromNavarea(
  f: NavareaFeaturePoint,
  ko: boolean = true,
  now: number = Date.now(),
): StackItem | null {
  if (f.source !== "nga") return null;
  if (f.lat == null || f.lng == null || !Number.isFinite(f.lat) || !Number.isFinite(f.lng)) return null;
  if (classifySecurity(f.description) !== "hostile") return null;
  const at = Date.parse(f.date);
  if (!Number.isFinite(at)) return null;
  // 오래된 in-force 경보는 현재 위험이 아니다
  if (now - at > 14 * 86_400_000) return null;
  const text = f.description.replace(/\s+/g, " ").trim();
  const name = extractVesselName(text);
  const base = f.id.split("#")[0]!;
  return {
    id: `nga:${base}`,
    source: "nga",
    at,
    title: ko ? (name ? `보안 사건 · ${name}` : "보안 사건") : name ? `Security incident · ${name}` : "Security incident",
    place: ngaAreaLabel(text),
    lat: f.lat,
    lng: f.lng,
    sea: seaForPoint(f.lat, f.lng),
    detail: text,
    vesselName: name,
    vesselType: guessVesselKind(text),
    times: { publishedAt: at },
  };
}

/** 경보 한 건이 점 여러 개여도 한 번만. */
export function ngaSecurityStackItems(
  features: NavareaFeaturePoint[],
  ko: boolean = true,
  now: number = Date.now(),
): StackItem[] {
  const seen = new Set<string>();
  const out: StackItem[] = [];
  for (const f of features) {
    const item = stackItemFromNavarea(f, ko, now);
    if (!item || seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}
