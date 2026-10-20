import { describe, expect, it } from "vitest";
import { FEED_TABS, hasUnread, nextOpenTab } from "@/lib/feedDrawer/tabs";

describe("feedDrawer tabs", () => {
  it("서랍은 전선 속보 하나", () => {
    expect(FEED_TABS.map((t) => t.id)).toEqual(["front"]);
  });

  it("열린 서랍을 다시 누르면 닫힌다", () => {
    expect(nextOpenTab(null, "front")).toBe("front");
    expect(nextOpenTab("front", "front")).toBeNull();
  });

  it("점은 새 내용이 있을 때만", () => {
    expect(hasUnread(null, undefined)).toBe(false);
    expect(hasUnread("a", undefined)).toBe(true);
    expect(hasUnread("a", "a")).toBe(false);
    expect(hasUnread("b", "a")).toBe(true);
  });
});
