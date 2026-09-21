import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/apiRateLimit", () => ({
  enforceIpRateLimit: () => null,
  RATE_PRESETS: { reefwatch: {} },
}));
vi.mock("@/lib/apiRouteLog", () => ({ logApiRoute: vi.fn() }));
vi.mock("@/lib/apiStubMode", () => ({ isApiStubMode: () => false }));
vi.mock("@/lib/auth/clientIdentity", () => ({
  publicErrorMessage: (_error: unknown, fallback: string) => fallback,
}));

describe("ReefWatch upstream failures", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns static features and explicit source failure without a 502 on a cold cache", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network unavailable")));
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/reefwatch"));
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(payload.features.length).toBeGreaterThan(0);
    expect(payload.traffic).toEqual([]);
    expect(payload.sourceHealth.opensky.status).toBe("error");
    expect(payload.errors.length).toBeGreaterThan(0);
  });

  it("marks cached data unhealthy when a refresh fails", async () => {
    const now = Date.now();
    const clock = vi.spyOn(Date, "now").mockReturnValue(now);
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ states: [], time: now / 1000 })),
    ).mockRejectedValueOnce(new Error("network unavailable"));
    vi.stubGlobal("fetch", fetchMock);
    const { GET } = await import("./route");
    const first = await (await GET(new Request("http://localhost/api/reefwatch"))).json();
    clock.mockReturnValue(now + 91_000);
    const response = await GET(new Request("http://localhost/api/reefwatch"));
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get("X-ReefWatch-Cache")).toBe("stale-error");
    expect(payload.features).toEqual(first.features);
    expect(payload.traffic).toEqual(first.traffic);
    expect(payload.sourceHealth.opensky.status).toBe("error");
    expect(payload.errors.length).toBeGreaterThan(0);
  });
});
