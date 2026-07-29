import type { Metadata } from "next";
import { GlobeBootLoader } from "@/components/GlobeBootLoader";
import { getRuntimeConfig } from "@/lib/serverEnv";
import { loadViinaRenderMeta } from "@/lib/viinaServerData";
import { buildSceneCard } from "@/lib/sceneCard";

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function num(value: string | string[] | undefined): number | null {
  const raw = first(value);
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * 공유 장면 링크의 **미리보기 카드**를 장면별로 만든다 (P2-3-B).
 *
 * ── 무엇이 문제였나 ────────────────────────────────────────────────
 * 사이트 OG 이미지·문구는 이미 있었지만 **고정**이었다. 그래서 카카오톡·
 * 스레드에 어떤 장면을 공유하든 미리보기가 전부 똑같았다:
 *
 *   "멋진 신세계 — 3D 지구본 관측대"   ← 호르무즈를 공유해도 이 문구
 *
 * 링크를 받은 사람 입장에서 **왜 이걸 보내줬는지 알 수 없다.** 클릭 전에
 * 이미 정보가 죽어 있으니, 폰 카드(P2-3-A)를 잘 만들어도 거기까지 오질 않는다.
 *
 * ── 이미지가 아니라 문구부터인 이유 ────────────────────────────────
 * `next/og` 동적 이미지는 Cloudflare Workers 런타임에서 변수가 많다.
 * 반면 제목·설명은 **런타임 위험이 사실상 0**이고, 미리보기에서 사람이
 * 실제로 읽는 건 대부분 이 텍스트다. 이미지는 기존 정적 카드를 그대로 쓴다.
 * (동적 이미지는 필요해지면 P2-3-C에서.)
 */
export function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Metadata {
  if (first(searchParams.scene) !== "1") return {};

  const lat = num(searchParams.lat);
  const lng = num(searchParams.lng);
  if (lat == null || lng == null) return {};

  const modeRaw = first(searchParams.mode);
  const layersRaw = first(searchParams.layers);

  const card = buildSceneCard(
    {
      mode: modeRaw === "economy" ? "economy" : "conflict",
      lat,
      lng,
      altitude: num(searchParams.alt) ?? 1.2,
      layers: layersRaw
        ? layersRaw.split(".").filter((k) => /^[A-Za-z0-9_]+$/.test(k))
        : null,
    },
    "ko",
  );

  const title = `${card.placeLabel} · ${card.modeLabel} — 멋진 신세계`;
  const description =
    card.topics.length > 0
      ? `이 장면에서 보던 것 — ${card.topics.join(" · ")}`
      : "공유된 지도 장면입니다. 지정학으로 축과 전선을, 지경학으로 돈과 물류를 봅니다.";

  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { title, description },
  };
}

export default function Home() {
  const viinaMeta = loadViinaRenderMeta();
  const runtimeConfig = getRuntimeConfig();
  return <GlobeBootLoader viinaMeta={viinaMeta} runtimeConfig={runtimeConfig} />;
}
