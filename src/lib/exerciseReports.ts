import { inferActorsFromText, type ExerciseActor } from "@/lib/militaryExercises";

export type ExerciseCategory = "cn" | "tw" | "rok" | "ru" | "trilateral";

export const EXERCISE_CATEGORY_LABEL: Record<ExerciseCategory, string> = {
  cn: "중국군 훈련",
  tw: "대만군 훈련",
  rok: "한국군 훈련",
  ru: "러시아군 훈련",
  trilateral: "한미일 연합훈련",
};

export const EXERCISE_CATEGORY_QUERIES: { category: ExerciseCategory; query: string }[] = [
  { category: "cn", query: '"인민해방군" OR "PLA" 훈련 OR exercise 대만해협 OR "Taiwan Strait" when:14d' },
  { category: "tw", query: '대만 국방부 훈련 OR "Han Kuang" OR "한광훈련" when:14d' },
  { category: "rok", query: '합참 자체훈련 OR "태극연습" OR "호국훈련" 발표 when:14d' },
  { category: "ru", query: '"러시아 국방부" 훈련 OR "Russian Ministry of Defence" exercise when:14d' },
  { category: "trilateral", query: '한미일 훈련 OR "Freedom Edge" OR "Freedom Shield" 발표 when:14d' },
];

/** 훈련 기사 여부 — 군사훈련 키워드 + 인식 가능한 행위자가 모두 있어야 한다. */
export function isExerciseArticle(text: string): boolean {
  const hasDrillWord =
    /military\s*exercise|joint\s*exercise|live[- ]?fire|war\s*games?|drill|훈련|실사격|실탄사격|연합훈련|합동훈련|演习/i.test(
      text,
    );
  if (!hasDrillWord) return false;
  const actors = inferActorsFromText(text);
  return actors.some((a) => a !== "other");
}

/** 기사에서 언급된 행위자로부터 5개 카테고리 중 하나를 추정한다. 근거는 원문 발견용일 뿐,
 * 자동으로 사건을 확정하거나 지도 좌표를 부여하지 않는다. */
export function exerciseCategoryFromActors(actors: ExerciseActor[]): ExerciseCategory | null {
  const set = new Set(actors);
  if (set.has("rok") && set.has("us") && set.has("jp")) return "trilateral";
  if (set.size === 1) {
    const only = actors[0];
    if (only === "cn" || only === "tw" || only === "ru" || only === "rok") return only;
  }
  return null;
}

export type ExerciseArticleCandidate = {
  title: string;
  link: string;
  pubDate: string;
  publisher?: string;
  actors: ExerciseActor[];
  category: ExerciseCategory | null;
  queriedCategories: ExerciseCategory[];
  status: "needs-review";
};
