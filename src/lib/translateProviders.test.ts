import { describe, expect, it, vi } from "vitest";
import {
  configuredProviders,
  isUsableTranslation,
  translateWithProviders,
} from "@/lib/translateProviders";

const json = (body: unknown, ok = true) =>
  ({ ok, json: async () => body }) as unknown as Response;

describe("configuredProviders", () => {
  it("키가 없으면 gtx만", () => {
    expect(configuredProviders({})).toEqual(["gtx"]);
  });
  it("공식 키가 있으면 앞에 둔다", () => {
    expect(configuredProviders({ DEEPL_API_KEY: "k", GOOGLE_TRANSLATE_API_KEY: "g" })).toEqual([
      "deepl",
      "google-cloud",
      "gtx",
    ]);
  });
});

describe("isUsableTranslation", () => {
  it("원문과 같으면 실패", () => {
    expect(isUsableTranslation("hello", "hello", "ko")).toBe(false);
  });
  it("한국어 목표인데 한글이 없으면 실패 (히브리어 그대로 나오는 경우)", () => {
    expect(isUsableTranslation("שלום", "שלום עולם", "ko")).toBe(false);
  });
  it("한글이 있으면 통과", () => {
    expect(isUsableTranslation("hello", "안녕", "ko")).toBe(true);
  });
});

describe("translateWithProviders", () => {
  it("DeepL 성공이면 gtx를 부르지 않는다", async () => {
    const f = vi.fn().mockResolvedValue(json({ translations: [{ text: "안녕하세요" }] }));
    const r = await translateWithProviders("hello", "ko", {
      env: { DEEPL_API_KEY: "abc:fx" },
      fetchImpl: f as unknown as typeof fetch,
      userAgent: "t",
    });
    expect(r).toEqual({ text: "안녕하세요", provider: "deepl" });
    expect(f).toHaveBeenCalledTimes(1);
    expect(String(f.mock.calls[0][0])).toContain("api-free.deepl.com");
  });

  it("DeepL이 실패하면 Google Cloud로 넘어간다", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(json({}, false))
      .mockResolvedValueOnce(json({ data: { translations: [{ translatedText: "안녕" }] } }));
    const r = await translateWithProviders("hello", "ko", {
      env: { DEEPL_API_KEY: "abc", GOOGLE_TRANSLATE_API_KEY: "g" },
      fetchImpl: f as unknown as typeof fetch,
      userAgent: "t",
    });
    expect(r?.provider).toBe("google-cloud");
  });

  it("공급자가 원문을 그대로 돌려주면 다음으로 넘어가고, 전부 실패하면 null", async () => {
    const f = vi.fn().mockResolvedValue(json([[["hello"]]]));
    const r = await translateWithProviders("hello", "ko", {
      env: {},
      fetchImpl: f as unknown as typeof fetch,
      userAgent: "t",
    });
    expect(r).toBeNull();
  });
});
