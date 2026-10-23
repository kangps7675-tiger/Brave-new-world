import { describe, expect, it } from "vitest";
import { flagFromMmsi } from "@/lib/mmsiFlag";

describe("flagFromMmsi", () => {
  it("MID 로 기국을 추정한다", () => {
    expect(flagFromMmsi("636012345")).toBe("라이베리아");
    expect(flagFromMmsi("352998000", "en")).toBe("Panama");
    expect(flagFromMmsi("440123456")).toBe("대한민국");
  });
  it("9자리가 아니거나 선박국이 아니면 null", () => {
    expect(flagFromMmsi("63601")).toBeNull();
    expect(flagFromMmsi("111636000")).toBeNull();
    expect(flagFromMmsi(null)).toBeNull();
  });
  it("모르는 MID 는 null (지어내지 않는다)", () => {
    expect(flagFromMmsi("999000000")).toBeNull();
  });
});
