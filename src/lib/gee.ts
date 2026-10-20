import ee from "@google/earthengine";

type GeePrivateKey = {
  client_email: string;
  private_key: string;
};

/** @google/earthengine 패키지 타입 정의가 불완전 — 서버 라우트 전용 */
export type GeeFeature = {
  centroid(): unknown;
  get(key: string): unknown;
};

export type GeeEvaluatable = {
  evaluate(callback: (result: unknown, error: Error | null) => void): void;
};

export type GeeCollection = {
  map(fn: (feature: GeeFeature) => unknown): GeeCollection;
  limit(n: number): GeeEvaluatable;
};

export type GeeApi = {
  FeatureCollection(id: string): GeeCollection;
  Feature(geometry: unknown, properties?: Record<string, unknown>): unknown;
};

export const geeApi = ee as unknown as GeeApi;

type GeeRuntime = {
  data: {
    authenticateViaPrivateKey: (
      key: GeePrivateKey,
      onSuccess: () => void,
      onError: (error: unknown) => void,
    ) => void;
  };
  initialize: (
    project: null,
    asset: null,
    onSuccess: () => void,
    onError: (error: unknown) => void,
  ) => void;
};

const geeRuntime = ee as unknown as GeeRuntime;

let initPromise: Promise<void> | null = null;

function getPrivateKey(): GeePrivateKey {
  const rawJson = process.env.EE_PRIVATE_KEY_JSON?.trim();
  if (rawJson) {
    const parsed = JSON.parse(rawJson) as GeePrivateKey;
    if (!parsed.client_email || !parsed.private_key) {
      throw new Error("EE_PRIVATE_KEY_JSON에 client_email / private_key가 없습니다.");
    }
    return {
      client_email: parsed.client_email,
      private_key: parsed.private_key.replace(/\\n/g, "\n"),
    };
  }

  const clientEmail = process.env.EE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.EE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    throw new Error(
      "GEE 인증정보가 없습니다. EE_PRIVATE_KEY_JSON 또는 EE_CLIENT_EMAIL + EE_PRIVATE_KEY를 설정하세요.",
    );
  }

  return { client_email: clientEmail, private_key: privateKey };
}

/** Google Earth Engine 서비스 계정 인증 (한 번만 초기화) */
export function initializeGEE(): Promise<void> {
  if (!initPromise) {
    initPromise = new Promise((resolve, reject) => {
      try {
        const key = getPrivateKey();
        geeRuntime.data.authenticateViaPrivateKey(
          key,
          () => {
            geeRuntime.initialize(
              null,
              null,
              () => resolve(),
              (error: unknown) =>
                reject(error instanceof Error ? error : new Error(String(error))),
            );
          },
          (error: unknown) =>
            reject(error instanceof Error ? error : new Error(String(error))),
        );
      } catch (error) {
        initPromise = null;
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  return initPromise;
}
