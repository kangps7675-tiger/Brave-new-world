import { afterEach, describe, expect, it } from "vitest";
import { isLandingCurtainActive, setLandingCurtainActive } from "./landingCurtainState";

describe("landingCurtainState", () => {
  afterEach(() => setLandingCurtainActive(false));

  it("기본은 꺼져 있고 켜고 끌 수 있다", () => {
    expect(isLandingCurtainActive()).toBe(false);
    setLandingCurtainActive(true);
    expect(isLandingCurtainActive()).toBe(true);
    setLandingCurtainActive(false);
    expect(isLandingCurtainActive()).toBe(false);
  });
});
