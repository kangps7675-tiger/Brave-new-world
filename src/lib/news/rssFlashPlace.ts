/**
 * RSS 신속속보 「위치로 가기」.
 * 도시·마을·이름 있는 지역을 먼저 찾고, 국가 중심·전장 중심 좌표는 만들지 않는다.
 * Liveuamap 이벤트 좌표는 여기서 다루지 않는다.
 */
import { matchGazetteer, type GazetteerEntry } from "@/lib/geo/gazetteer";
import type { NewsTheater } from "@/lib/news/types";
import {
  resolveImpactPlace,
  type TelegramPlaceHit,
} from "@/lib/telegramPlaceMatch";

export type RssFlashPlacePrecision = "city" | "region";

export type RssFlashPlace = {
  lat: number;
  lng: number;
  label: string;
  precision: RssFlashPlacePrecision;
};

function theaterHint(theater?: NewsTheater) {
  if (theater === "russia-ukraine") return "ukraine" as const;
  if (theater === "middle-east") return "middle-east" as const;
  return undefined;
}

/** 텔레그램 사전이 city로 둔 바다·해협은 도시가 아니다. */
function impactIsLocality(hit: TelegramPlaceHit): boolean {
  if (hit.precision !== "city") return false;
  const gaz = matchGazetteer(hit.label);
  if (gaz && gaz.precision !== "city") return false;
  return true;
}

function fromGazetteer(entry: GazetteerEntry): RssFlashPlace {
  return {
    lat: entry.lat,
    lng: entry.lng,
    label: entry.ko || entry.en,
    precision: entry.precision === "city" ? "city" : "region",
  };
}

function fromImpact(hit: TelegramPlaceHit): RssFlashPlace {
  return {
    lat: hit.lat,
    lng: hit.lng,
    label: hit.label,
    precision: "city",
  };
}

/**
 * 한 덩어리 텍스트에서 지명 1곳.
 * cityOnly면 도시·마을만. 아니면 제목용으로 이름 있는 지역(해협·주)까지 허용.
 */
function pickPlace(text: string, theater: NewsTheater | undefined, cityOnly: boolean): RssFlashPlace | null {
  const blob = text.trim();
  if (!blob) return null;

  const impact = resolveImpactPlace(blob, theaterHint(theater));
  if (impact && impactIsLocality(impact)) return fromImpact(impact);

  const gaz = matchGazetteer(blob);
  if (gaz?.precision === "city") return fromGazetteer(gaz);
  if (!cityOnly && gaz?.precision === "region") return fromGazetteer(gaz);
  return null;
}

/**
 * 제목의 도시·마을을 본문보다 먼저 본다.
 * 본문에서는 도시·마을만 채택한다. 국가명만 있으면 null.
 */
export function resolveRssFlashPlace(
  title: string,
  body?: string,
  theater?: NewsTheater,
): RssFlashPlace | null {
  const fromTitle = pickPlace(title, theater, false);
  if (fromTitle) return fromTitle;
  return pickPlace(body ?? "", theater, true);
}
