import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { officialDocFeed } from "@/db/schema";
import { isApiStubMode } from "@/lib/apiStubMode";
import { DOC_ID_RE, fileDisplayAllowed } from "@/lib/officialDocs/capture";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type R2ObjectBodyLike = { arrayBuffer: () => Promise<ArrayBuffer> };
type R2BucketLike = { get: (key: string) => Promise<R2ObjectBodyLike | null> };

async function bucket(): Promise<R2BucketLike | undefined> {
  try {
    const specifier = ["@opennextjs", "cloudflare"].join("/");
    const mod = (await import(/* webpackIgnore: true */ specifier)) as {
      getCloudflareContext?: () => Promise<{ env?: { DATA_BUCKET?: R2BucketLike } }>;
    };
    return (await mod.getCloudflareContext?.())?.env?.DATA_BUCKET;
  } catch {
    return undefined;
  }
}

/**
 * GET /api/official-docs/file/<문서 id> — 워커가 R2에 보관해 둔 원본 파일(PDF)을 그대로 내려준다.
 * 우리 서버에서 직접 보여 줘도 되는 발행처(capture.ts의 FILE_DISPLAY_ISSUERS)의 문서만. 그 밖에는 404.
 * 문서 파일을 가공하지 않는다(워터마크·잘라내기 없음) — 받은 그대로여야 증거가 된다.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const id = params.id;
  if (!DOC_ID_RE.test(id) || isApiStubMode()) return new NextResponse("Not found", { status: 404 });
  try {
    const db = await getDb();
    const [row] = await db
      .select({ issuerId: officialDocFeed.issuerId, fileKey: officialDocFeed.fileKey, fileSha256: officialDocFeed.fileSha256, url: officialDocFeed.url })
      .from(officialDocFeed)
      .where(eq(officialDocFeed.id, id))
      .limit(1);
    if (!row || !row.fileKey || !fileDisplayAllowed(row.issuerId)) return new NextResponse("Not found", { status: 404 });
    const r2 = await bucket();
    const obj = await r2?.get(row.fileKey);
    if (!obj) return new NextResponse("Not found", { status: 404 });
    return new NextResponse(await obj.arrayBuffer(), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${id}.pdf"`,
        "X-Content-Type-Options": "nosniff",
        "X-Original-Url": encodeURI(row.url),
        ETag: `"${row.fileSha256}"`,
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
