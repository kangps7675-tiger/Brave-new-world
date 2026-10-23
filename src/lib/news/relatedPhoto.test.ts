import { describe, expect, it } from "vitest";
import { findRelatedPhoto } from "@/lib/news/relatedPhoto";
import type { NewsStreamItem } from "@/lib/news/types";

const now = Date.parse("2026-10-22T12:00:00Z");
const item = (o: Partial<NewsStreamItem>): NewsStreamItem =>
  ({
    id: "1", title: "", link: "https://ex.com/a", source: "Reuters", pubDate: "2026-10-22T10:00:00Z",
    theater: "ukraine", trustTier: 1, imageUrl: "https://ex.com/a.jpg", ...o,
  }) as NewsStreamItem;

describe("findRelatedPhoto", () => {
  it("같은 사건 기사의 사진과 레퍼런스를 돌려준다", () => {
    const r = findRelatedPhoto(
      { text: "Drone struck Odesa port terminal, fire reported", at: now },
      [item({ title: "Fire at Odesa port terminal after drone raid" })],
    );
    expect(r?.articleUrl).toBe("https://ex.com/a");
    expect(r?.outlet).toBe("Reuters");
  });
  it("겹치는 단어가 1개뿐이면 붙이지 않는다", () => {
    expect(
      findRelatedPhoto({ text: "Drone struck Odesa terminal", at: now }, [item({ title: "Odesa weather forecast" })]),
    ).toBeNull();
  });
  it("48시간 넘게 차이 나면 제외", () => {
    expect(
      findRelatedPhoto({ text: "Odesa port terminal fire", at: now }, [
        item({ title: "Odesa port terminal fire", pubDate: "2026-10-18T10:00:00Z" }),
      ]),
    ).toBeNull();
  });
  it("사진이나 링크가 없으면 제외 (레퍼런스 필수)", () => {
    expect(
      findRelatedPhoto({ text: "Odesa port terminal fire", at: now }, [
        item({ title: "Odesa port terminal fire", link: "" }),
        item({ title: "Odesa port terminal fire", imageUrl: undefined }),
      ]),
    ).toBeNull();
  });
});
