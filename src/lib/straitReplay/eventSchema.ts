import { z } from "zod";
import { isInsideStraitBbox } from "@/lib/straitReplay/straitBbox";
import {
  EVENT_KINDS,
  STRAIT_IDS,
  type StraitEvent,
} from "@/lib/straitReplay/types";

const sourceUrlSchema = z.object({
  label: z.string().min(1),
  url: z.string().url(),
  publisher: z.string().min(1),
});

export const straitEventSeedSchema = z
  .object({
    id: z.string().min(1),
    straitId: z.enum(STRAIT_IDS),
    occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    lat: z.number().finite(),
    lng: z.number().finite(),
    titleKo: z.string().min(1),
    titleEn: z.string().min(1),
    kind: z.enum(EVENT_KINDS),
    sourceUrls: z.array(sourceUrlSchema).min(1),
    curatedBy: z.enum(["human", "gdelt"]).default("human"),
    reviewed: z.boolean().default(true),
    isSynthetic: z.boolean().default(false),
    baselineWindowDays: z.number().int().positive().default(28),
  })
  .superRefine((val, ctx) => {
    if (!isInsideStraitBbox(val.straitId, val.lat, val.lng)) {
      ctx.addIssue({
        code: "custom",
        message: `coordinates outside ${val.straitId} bbox`,
        path: ["lat"],
      });
    }
  });

export const straitEventFileSchema = z.object({
  events: z.array(straitEventSeedSchema).min(1),
});

export function parseStraitEventSeed(raw: unknown): StraitEvent {
  const v = straitEventSeedSchema.parse(raw);
  return {
    id: v.id,
    straitId: v.straitId,
    occurredOn: v.occurredOn,
    lat: v.lat,
    lng: v.lng,
    titleKo: v.titleKo,
    titleEn: v.titleEn,
    kind: v.kind,
    sourceUrls: v.sourceUrls,
    curatedBy: v.curatedBy,
    reviewed: v.reviewed,
    isSynthetic: v.isSynthetic,
    baselineWindowDays: v.baselineWindowDays,
  };
}

export function assertValidSeedEvents(raw: unknown): StraitEvent[] {
  const file = straitEventFileSchema.parse(raw);
  return file.events.map((e) => parseStraitEventSeed(e));
}
