import type { DisplayGrade, PublishSurface } from "@/lib/intelContract/types";

const GRADE_RANK: Record<DisplayGrade, number> = {
  drop: 0,
  hold: 1,
  low: 2,
  std: 3,
  high: 4,
};

/** surface별 최소 등급 — README Surfaces 표 */
export const SURFACE_MIN_GRADE: Record<PublishSurface, DisplayGrade> = {
  watchboard: "low",
  source_drill: "hold",
  map_hero: "std",
  theater_sitrep: "std",
  breaking_flash: "std",
  escalation_banner: "std",
  economy_alert: "std",
};

export function gradeAtLeast(grade: DisplayGrade, min: DisplayGrade): boolean {
  return GRADE_RANK[grade] >= GRADE_RANK[min];
}

export function canPublish(surface: PublishSurface, grade: DisplayGrade): boolean {
  if (grade === "drop") return false;
  if (surface === "watchboard" && grade === "hold") return true; // Hold 섹션
  if (surface === "theater_sitrep" && grade === "low") {
    // rss-brief 등 — low는 sitrep 허용 (어댑터가 low를 줄 때)
    return true;
  }
  return gradeAtLeast(grade, SURFACE_MIN_GRADE[surface]);
}

export function gradeLabel(grade: DisplayGrade, lang: "ko" | "en"): string {
  // 유저 화면용 — 내부 등급명을 풀어 쓴다 (README의 high/std…와 1:1)
  if (lang === "en") {
    if (grade === "high") return "Strong";
    if (grade === "std") return "Checked";
    if (grade === "low") return "Thin";
    if (grade === "hold") return "Waiting";
    return "Hidden";
  }
  if (grade === "high") return "탄탄함";
  if (grade === "std") return "교차확인";
  if (grade === "low") return "얇음";
  if (grade === "hold") return "모으는 중";
  return "숨김";
}
