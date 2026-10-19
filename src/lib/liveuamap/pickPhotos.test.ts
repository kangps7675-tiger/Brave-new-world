import { describe, expect, it } from "vitest";
import { pickPhotos } from "./fetchLiveuamap";

describe("liveuamap 사진 모으기", () => {
  it("picture·pics를 모으고 분류 아이콘(picpath png)은 사진으로 치지 않는다", () => {
    const urls = pickPhotos({
      picture: "https://pbs.twimg.com/media/a.jpg",
      picpath: "https://yemen.liveuamap.com//images/is14/civil_airplane_darkblack.png",
      pics: ["https://cdn4.telesco.pe/file/b.jpg", { url: "https://cdn4.telesco.pe/file/c.jpg" }, "https://pbs.twimg.com/media/a.jpg"],
    });
    expect(urls).toEqual([
      "https://pbs.twimg.com/media/a.jpg",
      "https://cdn4.telesco.pe/file/b.jpg",
      "https://cdn4.telesco.pe/file/c.jpg",
    ]);
  });

  it("사진이 없거나 http가 아니면 빈 배열, 최대 6장", () => {
    expect(pickPhotos({ picture: "", pics: [] })).toEqual([]);
    expect(pickPhotos({ picture: "javascript:alert(1)" })).toEqual([]);
    const many = Array.from({ length: 9 }, (_, i) => `https://x.example/${i}.jpg`);
    expect(pickPhotos({ pics: many })).toHaveLength(6);
  });
});
