import { z } from "zod";

/** Query flag: live=1 */
export const liveFlagSchema = z
  .enum(["0", "1"])
  .optional()
  .transform((v) => v === "1");

export const bboxQuerySchema = z.object({
  west: z.coerce.number().min(-180).max(180).optional(),
  south: z.coerce.number().min(-90).max(90).optional(),
  east: z.coerce.number().min(-180).max(180).optional(),
  north: z.coerce.number().min(-90).max(90).optional(),
});

export const firmsFiresQuerySchema = z.object({
  west: z.coerce.number().min(-180).max(180).optional(),
  south: z.coerce.number().min(-90).max(90).optional(),
  east: z.coerce.number().min(-180).max(180).optional(),
  north: z.coerce.number().min(-90).max(90).optional(),
  days: z.coerce.number().int().min(1).max(5).optional().default(1),
  source: z.string().min(1).max(64).optional().default("VIIRS_SNPP_NRT"),
  max: z.coerce.number().int().min(1).max(900).optional().default(900),
  live: liveFlagSchema,
});

export const adsbMilQuerySchema = z.object({
  max: z.coerce.number().int().min(1).max(1000).optional().default(400),
  live: liveFlagSchema,
});

export const adsbTrafficQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  dist: z.coerce.number().min(25).max(1500).optional().default(250),
  max: z.coerce.number().int().min(1).max(800).optional().default(200),
  live: liveFlagSchema,
});

export const aisQuerySchema = z.object({
  max: z.coerce.number().int().min(1).max(1000).optional().default(250),
  seconds: z.coerce.number().int().min(1).max(20).optional().default(8),
  debug: liveFlagSchema,
  class: z.string().max(32).optional(),
  provider: z.enum(["aisstream", "marinetraffic", "auto"]).optional(),
  live: liveFlagSchema,
  bbox: z.string().optional(),
});

/** theme=cyber|election 전용. 전쟁 등은 theme 없이 /api/gdelt → events[].eventTier */
export const GDELT_THEMES = ["cyber", "election"] as const;

export const gdeltQuerySchema = z.object({
  theme: z
    .enum(GDELT_THEMES, {
      error: "허용값: cyber, election (전쟁은 theme 아님 — /api/gdelt → eventTier)",
    })
    .optional(),
  live: liveFlagSchema,
  slices: z.coerce.number().int().min(1).max(48).optional(),
});

export const globeLodTierSchema = z.enum([
  "global",
  "continent",
  "regional",
  "near",
  "village",
]);

export const viewportPathsQuerySchema = z.object({
  layer: z.string().min(1).max(64).optional().default("railroads"),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  tier: globeLodTierSchema.optional().default("regional"),
  radius: z.coerce.number().min(0).max(80).optional().default(16),
  max: z.coerce.number().int().min(1).max(5000).optional(),
  maxScalerank: z.coerce.number().int().min(0).max(20).optional(),
  arterialMaxRank: z.coerce.number().int().min(0).max(20).optional(),
  viewerMode: z.enum(["conflict", "economy"]).optional().default("conflict"),
});

export const viewportPointsQuerySchema = z.object({
  layer: z.string().min(1).max(64).optional().default("airports"),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  tier: globeLodTierSchema.optional().default("regional"),
  radius: z.coerce.number().min(0).max(90).optional().default(16),
  max: z.coerce.number().int().min(1).max(5000).optional(),
});

export const shipMovementsQuerySchema = z.object({
  lang: z.enum(["ko", "en"]).optional().default("ko"),
  week: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  view: z.enum(["map", "timeline"]).optional().default("timeline"),
  navy: z.string().max(32).optional(),
});

export const stockReactionQuerySchema = z.object({
  theater: z.string().min(1).max(64).optional().default("all"),
  ageMinutes: z.coerce.number().min(0).max(60 * 24 * 365).optional().default(0),
  anchorDate: z.string().max(32).optional(),
  anchorId: z.string().max(128).optional(),
  chokepointId: z.string().max(64).optional(),
  viewerMode: z.enum(["conflict", "economy"]).optional().default("conflict"),
  mode: z.enum(["reaction", "counterfactual"]).optional().default("reaction"),
});

export type FirmsFiresQuery = z.infer<typeof firmsFiresQuerySchema>;
export type AdsbMilQuery = z.infer<typeof adsbMilQuerySchema>;
export type AdsbTrafficQuery = z.infer<typeof adsbTrafficQuerySchema>;
export type AisQuery = z.infer<typeof aisQuerySchema>;
export type GdeltQuery = z.infer<typeof gdeltQuerySchema>;
export type ViewportPathsQuery = z.infer<typeof viewportPathsQuerySchema>;
export type ViewportPointsQuery = z.infer<typeof viewportPointsQuerySchema>;
export type ShipMovementsQuery = z.infer<typeof shipMovementsQuerySchema>;
export type StockReactionQuery = z.infer<typeof stockReactionQuerySchema>;

/** Parse URLSearchParams with a Zod schema; returns 400 payload on failure. */
export function parseSearchParams<T extends z.ZodTypeAny>(
  searchParams: URLSearchParams,
  schema: T,
): { ok: true; data: z.infer<T> } | { ok: false; error: string; issues: z.ZodIssue[] } {
  const raw: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    raw[key] = value;
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Invalid query parameters",
      issues: parsed.error.issues,
    };
  }
  return { ok: true, data: parsed.data };
}
