import { describe, expect, it } from "vitest";
import { parseTelegramPostKey, telegramEmbedUrl, videoCaption } from "./telegramVideo";

describe("텔레그램 영상 임베드", () => {
  it("게시물 키를 채널과 번호로 나눈다", () => {
    expect(parseTelegramPostKey("rybar/12345")).toEqual({ channel: "rybar", postId: 12345 });
    expect(parseTelegramPostKey("war_monitor/9")).toEqual({ channel: "war_monitor", postId: 9 });
  });

  it("형식이 이상한 키는 거절한다 (임의 URL이 iframe에 들어가지 않게)", () => {
    expect(parseTelegramPostKey("a/1")).toBeNull(); // 채널명이 너무 짧다
    expect(parseTelegramPostKey("rybar/abc")).toBeNull();
    expect(parseTelegramPostKey("rybar/12345/../x")).toBeNull();
    expect(parseTelegramPostKey("https://evil.example/1")).toBeNull();
    expect(parseTelegramPostKey("rybar/0")).toBeNull();
  });

  it("공식 임베드 주소를 만든다", () => {
    expect(telegramEmbedUrl("rybar", 12345)).toBe("https://t.me/rybar/12345?embed=1&mode=tme");
    expect(telegramEmbedUrl("bad name", 1)).toBeNull();
    expect(telegramEmbedUrl("rybar", -1)).toBeNull();
    expect(telegramEmbedUrl("../x", 1)).toBeNull();
  });

  it("캡션 자리표시는 비우고 긴 글은 줄인다", () => {
    expect(videoCaption("[영상] 캡션 없음 — 원문에서 확인")).toBe("");
    expect(videoCaption("  유조선이\n피격됨  ")).toBe("유조선이 피격됨");
    expect(videoCaption("가".repeat(300), 100)).toHaveLength(101);
  });
});
