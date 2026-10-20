import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchOpenSky, resetOpenSkyAuthForTests } from "./openSkyAuth";

describe("OpenSky OAuth client", () => {
  beforeEach(() => {
    resetOpenSkyAuthForTests();
    vi.stubEnv("OPENSKY_CLIENT_ID", "test-client");
    vi.stubEnv("OPENSKY_CLIENT_SECRET", "test-secret");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("reuses an OAuth token for subsequent OpenSky requests", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "token-1", expires_in: 1800 })),
      )
      .mockResolvedValue(new Response(JSON.stringify({ states: [] })));
    vi.stubGlobal("fetch", fetchMock);
    const first = await fetchOpenSky("https://opensky-network.org/api/states/all");
    const second = await fetchOpenSky("https://opensky-network.org/api/states/all");
    expect(first.authenticated).toBe(true);
    expect(second.authenticated).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const headers = new Headers(fetchMock.mock.calls[1]?.[1]?.headers);
    expect(headers.get("Authorization")).toBe("Bearer token-1");
  });

  it("falls back to anonymous access when token retrieval fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("unavailable", { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ states: [] })));
    vi.stubGlobal("fetch", fetchMock);
    const result = await fetchOpenSky("https://opensky-network.org/api/states/all");
    expect(result.authenticated).toBe(false);
    const headers = new Headers(fetchMock.mock.calls[1]?.[1]?.headers);
    expect(headers.has("Authorization")).toBe(false);
  });

  it("refreshes the token once after a 401", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "expired" })))
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "fresh" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ states: [] })));
    vi.stubGlobal("fetch", fetchMock);
    const result = await fetchOpenSky("https://opensky-network.org/api/states/all");
    expect(result.authenticated).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    const headers = new Headers(fetchMock.mock.calls[3]?.[1]?.headers);
    expect(headers.get("Authorization")).toBe("Bearer fresh");
  });
});
