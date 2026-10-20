import { describe, expect, it } from "vitest";
import { pickShipPhoto, pickShipPhotos, SHIP_PHOTO_MAX, shipKindFromType, titleHasName } from "./shipPhoto";

function page(title: string, extra?: { cats?: string; desc?: string; index?: number }) {
  return {
    index: extra?.index ?? 1,
    title,
    imageinfo: [
      {
        thumburl: `https://thumb.example/${encodeURIComponent(title)}.jpg`,
        descriptionurl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(title)}`,
        extmetadata: {
          Categories: { value: extra?.cats ?? "" },
          ImageDescription: { value: extra?.desc ?? "" },
          LicenseShortName: { value: "CC BY-SA 3.0" },
          Artist: { value: '<a href="x">Jane</a>' },
        },
      },
    ],
  };
}

describe("shipPhoto 맞춤", () => {
  it("파일 제목에 선박명이 단어 단위로 있어야 한다", () => {
    expect(titleHasName("File:MV Rubymar sinks in the Red Sea.jpg", "RUBYMAR")).toBe(true);
    expect(titleHasName("File:Ikaria Island at night.JPG", "RUBYMAR")).toBe(false);
    expect(titleHasName("File:MSC Zoe (C7D24952 1920).jpg", "MSC ZOE")).toBe(true);
    expect(titleHasName("File:MSC Marina.jpg", "MSC ZOE")).toBe(false);
  });

  it("MV/MT 접두어는 이름으로 치지 않는다", () => {
    expect(titleHasName("File:Rubymar.jpg", "MV Rubymar")).toBe(true);
  });

  it("이름이 지명과 겹쳐도 선박 단어가 없으면 거른다 (수니온 곶)", () => {
    const pages = [page("File:Attica 06-13 Sounion 20 Temple of Poseidon.jpg", { cats: "Temple of Poseidon" })];
    expect(pickShipPhoto(pages, "Sounion")).toBeNull();
  });

  it("선박 단어가 분류에 있으면 채택하고 메타를 정리한다", () => {
    const photo = pickShipPhoto(
      [page("File:Sounion.jpg", { cats: "Oil tankers by name|Ships of Greece" })],
      "Sounion",
    );
    expect(photo?.license).toBe("CC BY-SA 3.0");
    expect(photo?.artist).toBe("Jane");
    expect(photo?.pageUrl).toContain("commons.wikimedia.org");
  });

  it("검색 순위가 높은 맞는 사진을 먼저 쓴다", () => {
    const photo = pickShipPhoto(
      [
        page("File:Ever Given second.jpg", { index: 2, desc: "container ship" }),
        page("File:Ever Given first.jpg", { index: 1, desc: "container ship" }),
      ],
      "Ever Given",
    );
    expect(photo?.title).toBe("Ever Given first.jpg");
  });

  it("맞는 사진을 순위순으로 여러 장 모으고 상한을 둔다", () => {
    const pages = Array.from({ length: 10 }, (_, i) =>
      page(`File:Ever Given ${i}.jpg`, { index: 10 - i, desc: "container ship" }),
    );
    const photos = pickShipPhotos(pages, "Ever Given");
    expect(photos).toHaveLength(SHIP_PHOTO_MAX);
    expect(photos[0]!.title).toBe("Ever Given 9.jpg");
  });

  it("틀린 사진은 캐러셀에서도 빠진다", () => {
    const photos = pickShipPhotos(
      [
        page("File:Ever Given a.jpg", { index: 1, desc: "container ship" }),
        page("File:Suez Canal.jpg", { index: 2, desc: "canal" }),
        page("File:Ever Given b.jpg", { index: 3, desc: "container ship" }),
      ],
      "Ever Given",
    );
    expect(photos.map((p) => p.title)).toEqual(["Ever Given a.jpg", "Ever Given b.jpg"]);
  });

  it("이미지가 아니면 건너뛴다", () => {
    const p = page("File:Ever Given.jpg", { desc: "ship" });
    p.imageinfo[0]!.thumburl = "https://x/Ever_Given.pdf";
    expect(pickShipPhoto([p], "Ever Given")).toBeNull();
  });
});

describe("shipKindFromType", () => {
  it("선종 문자열을 대표 일러스트로", () => {
    expect(shipKindFromType("Oil Tanker")).toBe("tanker");
    expect(shipKindFromType("Bulk carrier")).toBe("bulk");
    expect(shipKindFromType("Container Ship")).toBe("container");
    expect(shipKindFromType(null)).toBe("generic");
  });
});
