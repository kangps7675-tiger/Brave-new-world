import type { MilAircraftRole } from "@/lib/milAircraftKind";
import {
  CIVIL_ROLE_COLORS,
  MIL_AIRCRAFT_MARKER_ICON_SIZE,
  MIL_AIRCRAFT_VIEWBOX,
  MIL_ROLE_COLORS,
  MIL_SILHOUETTES,
  type MilAircraftIconSize,
} from "@/data/milAircraftSilhouettes";

function glowFilterId(role: MilAircraftRole, width: number) {
  return `mil-glow-${role}-${width}`;
}

/**
 * 탑다운 군용기 실루엣 SVG (항모 갑판 아이콘과 동일 계열).
 * 코가 viewBox 위쪽(+Y)을 향함 → 마커에서 track으로 회전.
 * 스트로크는 어두운 헤어라인 — 밝은 베이스맵에서도 윤곽이 남는다.
 */
export function milAircraftIconSvg(
  role: MilAircraftRole,
  size: MilAircraftIconSize = MIL_AIRCRAFT_MARKER_ICON_SIZE,
  options?: { palette?: "military" | "civil" },
): string {
  const palette = options?.palette ?? "military";
  const color =
    palette === "civil"
      ? CIVIL_ROLE_COLORS[role] ?? "#e8f1f7"
      : MIL_ROLE_COLORS[role];
  const { width, height } = size;
  const sil = MIL_SILHOUETTES[role];
  const glowId = `${glowFilterId(role, width)}-${palette}`;
  const vb = `${MIL_AIRCRAFT_VIEWBOX.width} ${MIL_AIRCRAFT_VIEWBOX.height}`;
  const stroke =
    palette === "civil" ? "rgba(15, 23, 42, 0.48)" : "rgba(15, 23, 42, 0.38)";
  const accentFill =
    palette === "civil" ? "rgba(15, 23, 42, 0.18)" : "rgba(255, 255, 255, 0.22)";

  const accents = (sil.accents ?? [])
    .map(
      (d) =>
        `<path d="${d}" fill="${accentFill}" stroke="${stroke}" stroke-width="0.35" stroke-linejoin="round"/>`,
    )
    .join("");

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${vb}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <filter id="${glowId}" x="-35%" y="-35%" width="170%" height="170%">
          <feGaussianBlur stdDeviation="0.55" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d="${sil.body}"
        fill="${color}"
        stroke="${stroke}"
        stroke-width="0.9"
        stroke-linejoin="round"
        filter="url(#${glowId})"
      />
      ${accents}
    </svg>
  `.trim();
}

export function milAircraftGlowShadow(
  role: MilAircraftRole,
  palette: "military" | "civil" = "military",
): string {
  const color =
    palette === "civil" ? CIVIL_ROLE_COLORS[role] ?? "#e8f1f7" : MIL_ROLE_COLORS[role];
  return `0 0 10px ${color}cc, 0 0 18px ${color}66, 0 2px 6px rgba(0,0,0,0.55)`;
}
