import type { MilitaryExercise } from "@/lib/militaryExercises";

export type MilitaryExerciseHtmlMarker = {
  markerId: string;
  displayKind: "military-exercise-html";
  id: string;
  lat: number;
  lng: number;
  title: string;
  performer: string | null;
  exerciseKind: string | null;
};

const PERFORMER_COLOR: Record<string, string> = {
  PRC: "#ef4444",
  ROC: "#22d3ee",
  US: "#3b82f6",
  JP: "#f8fafc",
  MULTI: "#a78bfa",
};

const KIND_ICON: Record<string, string> = {
  live_fire: "✹",
  joint_patrol: "◆",
  readiness_drill: "△",
  named_exercise: "◎",
  other: "•",
};

export function militaryExerciseHtmlMarkers(
  exercises: MilitaryExercise[],
): MilitaryExerciseHtmlMarker[] {
  return exercises.flatMap((exercise) => {
    if (
      !exercise.active ||
      exercise.lat == null ||
      exercise.lng == null ||
      !Number.isFinite(exercise.lat) ||
      !Number.isFinite(exercise.lng)
    ) {
      return [];
    }
    return [{
      markerId: `military-exercise-marker-${exercise.id}`,
      displayKind: "military-exercise-html" as const,
      id: exercise.id,
      lat: exercise.lat,
      lng: exercise.lng,
      title: exercise.title,
      performer: exercise.performer ?? null,
      exerciseKind: exercise.exerciseKind ?? null,
    }];
  });
}

export function createMilitaryExerciseMarkerElement(
  marker: MilitaryExerciseHtmlMarker,
  onClick?: () => void,
): HTMLElement {
  const performer = marker.performer ?? "OTHER";
  const color = PERFORMER_COLOR[performer] ?? "#67e8f9";
  const icon = KIND_ICON[marker.exerciseKind ?? "other"] ?? KIND_ICON.other;
  const root = document.createElement("button");
  root.type = "button";
  root.className = "military-exercise-marker";
  root.title = [marker.title, performer, marker.exerciseKind].filter(Boolean).join(" · ");
  root.setAttribute("aria-label", root.title);
  root.style.cssText = [
    "transform:translate(-50%,-50%)",
    "width:22px",
    "height:22px",
    "border-radius:999px",
    `border:2px solid ${color}`,
    "background:rgba(2,6,23,0.88)",
    `color:${color}`,
    `box-shadow:0 0 6px ${color},0 0 14px ${color}88`,
    "display:grid",
    "place-items:center",
    "font-size:12px",
    "font-weight:800",
    "line-height:1",
    "pointer-events:auto",
    "cursor:pointer",
  ].join(";");
  root.textContent = icon;
  if (onClick) {
    root.addEventListener("click", (event) => {
      event.stopPropagation();
      onClick();
    });
  }
  return root;
}
