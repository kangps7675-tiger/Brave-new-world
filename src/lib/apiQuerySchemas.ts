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

export type FirmsFiresQuery = z.infer<typeof firmsFiresQuerySchema>;
export type AdsbMilQuery = z.infer<typeof adsbMilQuerySchema>;
export type AdsbTrafficQuery = z.infer<typeof adsbTrafficQuerySchema>;
export type AisQuery = z.infer<typeof aisQuerySchema>;
export type GdeltQuery = z.infer<typeof gdeltQuerySchema>;

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
