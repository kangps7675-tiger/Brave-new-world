import { publicErrorMessage } from "@/lib/auth/clientIdentity";
import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { AUDIO_MANIFEST, type AudioEventDef } from "@/data/audioManifest";
import { cloudAudioObjectKey, cloudAudioPublicUrl } from "@/lib/cloudAudio";
import {
  getFreesoundApiKey,
  isAudioEventId,
  resolveFreesoundPreview,
  resolvePreviewForEvent,
} from "@/lib/freesound";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 브라우저에 캐시된 오매칭(개 짖는 소리 등) 무효화용 */
const STREAM_CACHE_BUST = "v11-r2-audio";

function contentTypeForExt(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".mp3") return "audio/mpeg";
  if (ext === ".wav") return "audio/wav";
  if (ext === ".ogg") return "audio/ogg";
  return "application/octet-stream";
}

function resolveLocalAudioPath(localSrc: string): string | null {
  if (!localSrc.startsWith("/")) return null;
  const rel = localSrc.replace(/^\/+/, "").replace(/\.\./g, "");
  const abs = path.join(process.cwd(), "public", rel);
  if (!abs.startsWith(path.join(process.cwd(), "public"))) return null;
  if (!fs.existsSync(abs)) return null;
  return abs;
}

type R2ObjectLike = {
  arrayBuffer: () => Promise<ArrayBuffer>;
  httpMetadata?: { contentType?: string };
};

type R2BucketLike = {
  get: (key: string) => Promise<R2ObjectLike | null>;
};

async function readR2Audio(localSrc: string): Promise<{
  body: ArrayBuffer;
  contentType: string;
} | null> {
  const key = cloudAudioObjectKey(localSrc);
  if (!key) return null;
  try {
    let bucket: R2BucketLike | undefined;
    try {
      const specifier = ["@opennextjs", "cloudflare"].join("/");
      const mod = (await import(/* webpackIgnore: true */ specifier)) as {
        getCloudflareContext?: () => Promise<{ env?: { DATA_BUCKET?: R2BucketLike } }>;
      };
      const ctx = await mod.getCloudflareContext?.();
      bucket = ctx?.env?.DATA_BUCKET;
    } catch {
      // optional
    }
    if (!bucket) {
      const g = globalThis as unknown as {
        DATA_BUCKET?: R2BucketLike;
        env?: { DATA_BUCKET?: R2BucketLike };
      };
      bucket = g.DATA_BUCKET || g.env?.DATA_BUCKET;
    }
    if (!bucket?.get) return null;
    const obj = await bucket.get(key);
    if (!obj) return null;
    const body = await obj.arrayBuffer();
    const contentType =
      obj.httpMetadata?.contentType || contentTypeForExt(key);
    return { body, contentType };
  } catch {
    return null;
  }
}

function audioResponseHeaders(options: {
  contentType: string;
  contentLength?: number;
  eventId: string;
  volume: number;
  loop: boolean;
  source: string;
  localSrc?: string;
}): Headers {
  const headers = new Headers();
  headers.set("Content-Type", options.contentType);
  if (options.contentLength != null) {
    headers.set("Content-Length", String(options.contentLength));
  }
  headers.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
  headers.set("X-Audio-Source", options.source);
  headers.set("X-Audio-Volume", String(options.volume));
  headers.set("X-Audio-Loop", options.loop ? "1" : "0");
  headers.set("X-Audio-Event-Id", options.eventId);
  headers.set("X-Audio-Cache-Bust", STREAM_CACHE_BUST);
  if (options.localSrc) headers.set("X-Audio-Local-Src", options.localSrc);
  return headers;
}

/**
 * GET /api/sound-stream?eventId=neptun-impact
 * GET /api/sound-stream?query=distant+explosion+muffled
 *
 * localSrc: CDN(R2 public) → R2 바인딩 → 로컬 public. 없으면 Freesound HQ.
 */
export async function GET(req: NextRequest) {
  try {
    const eventId = req.nextUrl.searchParams.get("eventId")?.trim() || "";
    const queryParam = req.nextUrl.searchParams.get("query")?.trim() || "";

    if (eventId && isAudioEventId(eventId)) {
      const def = AUDIO_MANIFEST[eventId] as AudioEventDef;
      if (def.localSrc) {
        const cdnUrl = cloudAudioPublicUrl(def.localSrc);
        if (req.nextUrl.searchParams.get("metadata") === "1") {
          return NextResponse.json({
            eventId,
            query: def.freesoundQuery,
            soundId: 0,
            name: path.basename(def.localSrc),
            username: cdnUrl ? "cdn" : "local",
            volume: def.volume,
            loop: Boolean(def.loop),
            localSrc: def.localSrc,
            cdnUrl,
            streamUrl:
              cdnUrl ||
              `/api/sound-stream?eventId=${encodeURIComponent(eventId)}&v=${STREAM_CACHE_BUST}`,
            attribution: cdnUrl
              ? `cdn ${def.localSrc}`
              : `local ${def.localSrc}`,
          });
        }

        // CDN public → 307 (워커 대역폭 절약)
        if (cdnUrl) {
          return NextResponse.redirect(cdnUrl, 307);
        }

        const fromR2 = await readR2Audio(def.localSrc);
        if (fromR2) {
          return new NextResponse(fromR2.body, {
            status: 200,
            headers: audioResponseHeaders({
              contentType: fromR2.contentType,
              contentLength: fromR2.body.byteLength,
              eventId,
              volume: def.volume,
              loop: Boolean(def.loop),
              source: "r2",
              localSrc: def.localSrc,
            }),
          });
        }

        const abs = resolveLocalAudioPath(def.localSrc);
        if (!abs) {
          return NextResponse.json(
            { error: `Local audio missing: ${def.localSrc}` },
            { status: 404 },
          );
        }
        const body = fs.readFileSync(abs);
        return new NextResponse(body, {
          status: 200,
          headers: audioResponseHeaders({
            contentType: contentTypeForExt(abs),
            contentLength: body.byteLength,
            eventId,
            volume: def.volume,
            loop: Boolean(def.loop),
            source: "local",
            localSrc: def.localSrc,
          }),
        });
      }
    }

    if (!getFreesoundApiKey()) {
      return NextResponse.json(
        { error: "FREESOUND_API_KEY is not configured" },
        { status: 503 },
      );
    }

    let previewUrl: string;
    let volume = 0.5;
    let loop = false;
    let attributionName = "";
    let attributionUser = "";
    let soundId = 0;
    let resolvedQuery = queryParam;

    if (eventId) {
      if (!isAudioEventId(eventId)) {
        return NextResponse.json({ error: `Unknown eventId: ${eventId}` }, { status: 400 });
      }
      const { def, preview } = await resolvePreviewForEvent(eventId);
      previewUrl = preview.previewUrl;
      volume = def.volume;
      loop = Boolean(def.loop);
      attributionName = preview.name;
      attributionUser = preview.username;
      soundId = preview.soundId;
      resolvedQuery = def.freesoundQuery;
    } else if (queryParam) {
      const preview = await resolveFreesoundPreview(queryParam);
      previewUrl = preview.previewUrl;
      attributionName = preview.name;
      attributionUser = preview.username;
      soundId = preview.soundId;
    } else {
      return NextResponse.json(
        { error: "Provide eventId or query", events: Object.keys(AUDIO_MANIFEST) },
        { status: 400 },
      );
    }

    if (req.nextUrl.searchParams.get("metadata") === "1") {
      return NextResponse.json({
        eventId: eventId || null,
        query: resolvedQuery,
        soundId,
        name: attributionName,
        username: attributionUser,
        volume,
        loop,
        streamUrl: `/api/sound-stream?${eventId ? `eventId=${encodeURIComponent(eventId)}` : `query=${encodeURIComponent(resolvedQuery)}`}&v=${STREAM_CACHE_BUST}`,
        attribution: `“${attributionName}” by ${attributionUser} on Freesound`,
      });
    }

    const upstream = await fetch(previewUrl, {
      headers: { Accept: "audio/mpeg,audio/*;q=0.9,*/*;q=0.8" },
      cache: "no-store",
    });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: `Preview fetch failed: HTTP ${upstream.status}` },
        { status: 502 },
      );
    }

    const headers = new Headers();
    headers.set("Content-Type", upstream.headers.get("Content-Type") || "audio/mpeg");
    headers.set("Cache-Control", "no-store, max-age=0");
    headers.set("X-Freesound-Id", String(soundId));
    headers.set("X-Freesound-Name", encodeURIComponent(attributionName));
    headers.set("X-Freesound-User", encodeURIComponent(attributionUser));
    headers.set("X-Audio-Volume", String(volume));
    headers.set("X-Audio-Loop", loop ? "1" : "0");
    headers.set("X-Audio-Cache-Bust", STREAM_CACHE_BUST);
    if (eventId) headers.set("X-Audio-Event-Id", eventId);

    const contentLength = upstream.headers.get("Content-Length");
    if (contentLength) headers.set("Content-Length", contentLength);

    return new NextResponse(upstream.body, { status: 200, headers });
  } catch (error) {
    return NextResponse.json(
      { error: publicErrorMessage(error, "sound-stream failed") },
      { status: 502 },
    );
  }
}
