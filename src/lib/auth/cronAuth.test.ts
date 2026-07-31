import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { authorizeCronRequest, bearerToken, safeEqual } from "./cronAuth";

const ORIGINAL_ENV = { ...process.env };

function req(headers: Record<string, string> = {}, url = "https://example.test/api/warm") {
  return new Request(url, { headers });
}

function setNodeEnv(value: "production" | "development" | "test") {
  Object.defineProperty(process.env, "NODE_ENV", {
    value,
    configurable: true,
    writable: true,
    enumerable: true,
  });
}

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.INGEST_CRON_SECRET;
  delete process.env.NEWS_WARM_SECRET;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("safeEqual", () => {
  it("같은 문자열은 통과", () => {
    expect(safeEqual("hunter2", "hunter2")).toBe(true);
  });

  it("다른 문자열·다른 길이는 거부", () => {
    expect(safeEqual("hunter2", "hunter3")).toBe(false);
    expect(safeEqual("short", "muchlongersecret")).toBe(false);
    expect(safeEqual("", "x")).toBe(false);
  });

  it("멀티바이트 문자도 정확히 비교", () => {
    expect(safeEqual("시크릿", "시크릿")).toBe(true);
    expect(safeEqual("시크릿", "시크릯")).toBe(false);
  });
});

describe("bearerToken", () => {
  it("Bearer 접두사를 떼고 토큰만 반환", () => {
    expect(bearerToken(req({ authorization: "Bearer abc123" }))).toBe("abc123");
  });

  it("Bearer 가 아니면 빈 문자열", () => {
    expect(bearerToken(req({ authorization: "Basic abc123" }))).toBe("");
    expect(bearerToken(req())).toBe("");
  });
});

describe("authorizeCronRequest", () => {
  it("시크릿이 맞으면 통과", () => {
    process.env.INGEST_CRON_SECRET = "s3cret";
    expect(authorizeCronRequest(req({ authorization: "Bearer s3cret" }))).toBe(true);
  });

  it("시크릿이 틀리면 거부", () => {
    process.env.INGEST_CRON_SECRET = "s3cret";
    expect(authorizeCronRequest(req({ authorization: "Bearer wrong" }))).toBe(false);
    expect(authorizeCronRequest(req())).toBe(false);
  });

  it("쿼리 파라미터 시크릿은 더 이상 인증되지 않는다 (HIGH-02)", () => {
    process.env.INGEST_CRON_SECRET = "s3cret";
    const r = req({}, "https://example.test/api/warm?secret=s3cret");
    expect(authorizeCronRequest(r)).toBe(false);
  });

  it("시크릿 미설정 + 프로덕션 → 거부 (fail-closed, CRIT-01)", () => {
    setNodeEnv("production");
    expect(authorizeCronRequest(req())).toBe(false);
    expect(authorizeCronRequest(req({ authorization: "Bearer anything" }))).toBe(false);
  });

  it("시크릿 미설정 + 개발 → 통과 (로컬 편의)", () => {
    setNodeEnv("development");
    expect(authorizeCronRequest(req())).toBe(true);
  });

  it("envKeys 를 순서대로 확인한다", () => {
    process.env.NEWS_WARM_SECRET = "fallback";
    const r = req({ authorization: "Bearer fallback" });
    expect(authorizeCronRequest(r, ["INGEST_CRON_SECRET", "NEWS_WARM_SECRET"])).toBe(true);
  });
});
