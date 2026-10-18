import { describe, expect, it } from "vitest";
import { validImo } from "../../../workers/cron-ingest/src/vesselIdentity";

describe("validImo", () => {
  it("체크섬이 맞는 IMO 만 받는다", () => {
    expect(validImo(9074729)).toBe("9074729"); // IMO 공식 예시 번호
    expect(validImo("9074729")).toBe("9074729");
    expect(validImo(9074728)).toBeNull();
    expect(validImo(0)).toBeNull();
    expect(validImo(123)).toBeNull();
    expect(validImo(undefined)).toBeNull();
  });
});
