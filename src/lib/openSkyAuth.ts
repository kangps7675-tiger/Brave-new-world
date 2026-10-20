const OPENSKY_TOKEN_URL =
  "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token";

const TOKEN_REFRESH_MARGIN_MS = 30_000;

type CachedToken = { accessToken: string; expiresAt: number };
type OpenSkyTokenResponse = { access_token?: string; expires_in?: number };

let cachedToken: CachedToken | null = null;
let pendingToken: Promise<string | null> | null = null;

function credentials() {
  const clientId = process.env.OPENSKY_CLIENT_ID?.trim();
  const clientSecret = process.env.OPENSKY_CLIENT_SECRET?.trim();
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

async function requestToken(forceRefresh: boolean): Promise<string | null> {
  const auth = credentials();
  if (!auth) return null;
  const now = Date.now();
  if (!forceRefresh && cachedToken && cachedToken.expiresAt > now) {
    return cachedToken.accessToken;
  }
  if (!forceRefresh && pendingToken) return pendingToken;

  const request = (async () => {
    const response = await fetch(OPENSKY_TOKEN_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: auth.clientId,
        client_secret: auth.clientSecret,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error(`OpenSky OAuth HTTP ${response.status}`);
    const payload = (await response.json()) as OpenSkyTokenResponse;
    if (!payload.access_token) throw new Error("OpenSky OAuth response missing access_token");
    const lifetimeMs = Math.max(60, payload.expires_in ?? 1_800) * 1_000;
    cachedToken = {
      accessToken: payload.access_token,
      expiresAt: Date.now() + lifetimeMs - TOKEN_REFRESH_MARGIN_MS,
    };
    return payload.access_token;
  })();

  pendingToken = request;
  try {
    return await request;
  } finally {
    if (pendingToken === request) pendingToken = null;
  }
}

export type OpenSkyFetchResult = { response: Response; authenticated: boolean };

/** Fetch OpenSky with a cached OAuth token, retrying once when the token expires. */
export async function fetchOpenSky(
  url: string,
  init: RequestInit = {},
): Promise<OpenSkyFetchResult> {
  let token: string | null = null;
  try {
    token = await requestToken(false);
  } catch {
    // Keep the public anonymous endpoint available if OAuth is temporarily down.
  }

  const send = (accessToken: string | null) => {
    const headers = new Headers(init.headers);
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
    return fetch(url, { ...init, headers });
  };

  let response = await send(token);
  if (token && response.status === 401) {
    cachedToken = null;
    try {
      token = await requestToken(true);
    } catch {
      token = null;
    }
    response = await send(token);
  }
  return { response, authenticated: Boolean(token) };
}

export function resetOpenSkyAuthForTests() {
  cachedToken = null;
  pendingToken = null;
}
