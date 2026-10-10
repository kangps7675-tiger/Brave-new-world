/**
 * 사건 근거 캡처 이미지 → R2 DATA_BUCKET.
 * 바인딩이 없으면 null (로컬 개발에서는 이미지 없이 진행 가능).
 */

type R2PutBucket = {
  put: (
    key: string,
    value: ArrayBuffer | ArrayBufferView | string | Blob,
    options?: { httpMetadata?: { contentType?: string } },
  ) => Promise<unknown>;
};

async function getDataBucket(): Promise<R2PutBucket | null> {
  try {
    const specifier = ["@opennextjs", "cloudflare"].join("/");
    const mod = (await import(/* webpackIgnore: true */ specifier)) as {
      getCloudflareContext?: () => Promise<{ env?: { DATA_BUCKET?: R2PutBucket } }>;
    };
    const ctx = await mod.getCloudflareContext?.();
    if (ctx?.env?.DATA_BUCKET?.put) return ctx.env.DATA_BUCKET;
  } catch {
    // optional
  }
  const g = globalThis as unknown as {
    DATA_BUCKET?: R2PutBucket;
    env?: { DATA_BUCKET?: R2PutBucket };
  };
  const bucket = g.DATA_BUCKET || g.env?.DATA_BUCKET;
  return bucket?.put ? bucket : null;
}

function extForContentType(contentType: string): string {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  return "jpg";
}

export type EvidenceImageUploadResult = {
  imageKey: string;
  contentType: string;
  bytes: number;
};

/** 서버가 받아온 이미지 바이트 → R2 `case-files/{caseId}/{name}.{ext}` */
export async function uploadCaseEvidenceBytes(args: {
  caseId: string;
  name: string;
  bytes: ArrayBuffer;
  contentType: string;
}): Promise<EvidenceImageUploadResult | { error: string }> {
  const bucket = await getDataBucket();
  if (!bucket) return { error: "DATA_BUCKET binding unavailable" };
  if (args.bytes.byteLength < 32) return { error: "image too small" };
  const safeName = args.name.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 96) || "img";
  const imageKey = `case-files/${args.caseId}/${safeName}.${extForContentType(args.contentType)}`;
  await bucket.put(imageKey, args.bytes, { httpMetadata: { contentType: args.contentType } });
  return { imageKey, contentType: args.contentType, bytes: args.bytes.byteLength };
}

/**
 * base64 (data URL 또는 raw) → R2 `case-files/{caseId}/{evidenceId}.{ext}`
 */
export async function uploadCaseEvidenceImage(args: {
  caseId: string;
  evidenceId: string;
  imageBase64: string;
  contentType?: string;
}): Promise<EvidenceImageUploadResult | { error: string }> {
  const bucket = await getDataBucket();
  if (!bucket) {
    return { error: "DATA_BUCKET binding unavailable" };
  }

  let contentType = args.contentType || "image/jpeg";
  let b64 = args.imageBase64.trim();
  const dataUrl = /^data:([^;]+);base64,(.+)$/i.exec(b64);
  if (dataUrl) {
    contentType = dataUrl[1] || contentType;
    b64 = dataUrl[2] || "";
  }
  if (!b64) return { error: "empty image" };

  let bytes: Buffer;
  try {
    bytes = Buffer.from(b64, "base64");
  } catch {
    return { error: "invalid base64" };
  }
  if (bytes.byteLength < 32) return { error: "image too small" };
  if (bytes.byteLength > 8 * 1024 * 1024) return { error: "image too large (max 8MB)" };

  const ext = extForContentType(contentType);
  const safeEvidence = args.evidenceId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "ev";
  const imageKey = `case-files/${args.caseId}/${safeEvidence}.${ext}`;

  await bucket.put(imageKey, bytes, {
    httpMetadata: { contentType },
  });

  return { imageKey, contentType, bytes: bytes.byteLength };
}
