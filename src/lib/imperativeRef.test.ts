import { describe, expect, it } from "vitest";
import { bindableImperativeRef } from "./imperativeRef";

describe("bindableImperativeRef", () => {
  it("keeps function refs and objects that already have current", () => {
    const fn = () => {};
    const box = { current: null };
    expect(bindableImperativeRef(fn)).toBe(fn);
    expect(bindableImperativeRef(box)).toBe(box);
  });

  it("drops frozen objects that cannot receive current", () => {
    const frozen = Object.freeze({ latitude: 1 });
    expect(bindableImperativeRef(frozen as unknown as { current: null })).toBeNull();
  });
});
