/**
 * 전투·공습 오디오 — CDN(R2 public) 키/URL.
 * 키: audio/<filename>  (DATA_CDN 베이스 아래)
 */

import { getDataCdnBase } from "@/lib/serverEnv";

/** `/audio/foo.mp3` → `audio/foo.mp3` */
export function cloudAudioObjectKey(localSrc: string): string | null {
  const trimmed = localSrc.trim();
  if (!trimmed.startsWith("/audio/")) return null;
  const rel = trimmed.replace(/^\/+/, "").replace(/\.\./g, "");
  if (!rel.startsWith("audio/")) return null;
  return rel;
}

/** 서버: CDN public URL (없으면 null) */
export function cloudAudioPublicUrl(localSrc: string): string | null {
  const key = cloudAudioObjectKey(localSrc);
  const cdn = getDataCdnBase();
  if (!key || !cdn) return null;
  return `${cdn}/${key}`;
}

/** CDN base + localSrc → 절대 URL (클라·서버 공용) */
export function joinAudioCdnUrl(
  cdnBase: string | null | undefined,
  localSrc: string,
  cacheBust?: string,
): string {
  const key = cloudAudioObjectKey(localSrc);
  const cdn = cdnBase?.replace(/\/$/, "") || null;
  const base = key && cdn ? `${cdn}/${key}` : localSrc;
  if (!cacheBust) return base;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}v=${cacheBust}`;
}
