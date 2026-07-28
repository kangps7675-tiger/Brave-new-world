import { describe, expect, it, beforeEach } from "vitest";
import {
  __resetRateLimitBucketsForTests,
  checkIpRateLimit,
  enforceIpRateLimit,
} from "@/lib/apiRateLimit";

function req(ip = "1.2.3.4"): Request {
  return new Request("https://example.test/api/x", {
    headers: { "cf-connecting-ip": ip },
  });
}

describe("apiRateLimit", () => {
  beforeEach(() => {
    __resetRateLimitBucketsForTests();
  });

  it("allows up to limit then denies", () => {
    const cfg = { key: "test", limit: 2, windowMs: 60_000 };
    expect(checkIpRateLimit(req(), cfg).ok).toBe(true);
    expect(checkIpRateLimit(req(), cfg).ok).toBe(true);
    const denied = checkIpRateLimit(req(), cfg);
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.retryAfterSec).toBeGreaterThanOrEqual(1);
  });

  it("isolates buckets by IP and key", () => {
    const cfg = { key: "a", limit: 1, windowMs: 60_000 };
    expect(checkIpRateLimit(req("10.0.0.1"), cfg).ok).toBe(true);
    expect(checkIpRateLimit(req("10.0.0.1"), cfg).ok).toBe(false);
    expect(checkIpRateLimit(req("10.0.0.2"), cfg).ok).toBe(true);
    expect(checkIpRateLimit(req("10.0.0.1"), { ...cfg, key: "b" }).ok).toBe(true);
  });

  it("enforceIpRateLimit returns 429 Response", async () => {
    const cfg = { key: "enf", limit: 1, windowMs: 60_000 };
    expect(enforceIpRateLimit(req(), cfg)).toBeNull();
    const blocked = enforceIpRateLimit(req(), cfg);
    expect(blocked).not.toBeNull();
    expect(blocked!.status).toBe(429);
    const body = (await blocked!.json()) as { error: string };
    expect(body.error).toBe("rate_limited");
  });
});
