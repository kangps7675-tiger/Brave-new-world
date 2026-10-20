import { describe, expect, it } from "vitest";
import { isExerciseArticle, exerciseCategoryFromActors } from "./exerciseReports";
import { inferActorsFromText } from "./militaryExercises";

describe("exercise article detection", () => {
  it("requires both a drill keyword and a recognizable actor", () => {
    expect(isExerciseArticle("Company announces new employee training program")).toBe(false);
    expect(isExerciseArticle("Random travel article about Taiwan food")).toBe(false);
    expect(isExerciseArticle("China's PLA holds live-fire military exercise near coast")).toBe(true);
    expect(isExerciseArticle("대만 국방부, 한광훈련 돌입")).toBe(true);
  });

  it("classifies category from actor combinations", () => {
    expect(exerciseCategoryFromActors(["cn"])).toBe("cn");
    expect(exerciseCategoryFromActors(["tw"])).toBe("tw");
    expect(exerciseCategoryFromActors(["ru"])).toBe("ru");
    expect(exerciseCategoryFromActors(["rok"])).toBe("rok");
    expect(exerciseCategoryFromActors(["rok", "us", "jp"])).toBe("trilateral");
    expect(exerciseCategoryFromActors(["cn", "tw"])).toBeNull();
    expect(exerciseCategoryFromActors(["us"])).toBeNull();
  });

  it("infers the new Taiwan actor from text", () => {
    expect(inferActorsFromText("Taiwan's Han Kuang exercise begins")).toContain("tw");
    expect(inferActorsFromText("대만 국방부는 한광훈련을 실시했다")).toContain("tw");
  });
});
