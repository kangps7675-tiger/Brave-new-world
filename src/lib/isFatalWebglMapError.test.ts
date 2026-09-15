import { describe, expect, it } from "vitest";
import { GPUInitializationError } from "maplibre-gl";
import { isFatalWebglMapError } from "./isFatalWebglMapError";

describe("isFatalWebglMapError", () => {
  it("GPUInitializationError 인스턴스는 true", () => {
    const err = new GPUInitializationError({ antialias: false }, null);
    expect(isFatalWebglMapError(err)).toBe(true);
    expect(isFatalWebglMapError({ error: err })).toBe(true);
  });

  it("name만 GPUInitializationError여도 true", () => {
    const err = new Error("WebGL2 is required");
    err.name = "GPUInitializationError";
    expect(isFatalWebglMapError(err)).toBe(true);
  });

  it("스타일·이미지·버텍스 한도 오류는 false", () => {
    expect(
      isFatalWebglMapError({
        error: new Error('Style image "circle-11" could not be loaded'),
      }),
    ).toBe(false);
    expect(
      isFatalWebglMapError({
        error: new Error("Max vertices per segment is 65535: bucket requested 99480"),
      }),
    ).toBe(false);
    expect(isFatalWebglMapError(new Error("Failed to load tile"))).toBe(false);
  });

  it("비어 있거나 무관한 값은 false", () => {
    expect(isFatalWebglMapError(undefined)).toBe(false);
    expect(isFatalWebglMapError(null)).toBe(false);
    expect(isFatalWebglMapError("webgl")).toBe(false);
  });
});
