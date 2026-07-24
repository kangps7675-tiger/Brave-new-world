import { NextResponse } from "next/server";
import { z } from "zod";
import { rewriteAirRaidBrief } from "@/lib/llm/airRaidNarrative";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  kind: z.enum(["tzeva", "neptun", "newfeeds"]),
  lang: z.enum(["ko", "en"]).default("ko"),
  region: z.string().trim().min(1).max(200),
  title: z.string().trim().max(240).optional(),
  lat: z.number().finite(),
  lng: z.number().finite(),
  since: z.string().trim().max(80).optional(),
  activeCount: z.number().int().positive().max(500).optional(),
  threatLabel: z.string().trim().max(120).optional(),
  approachFrom: z.string().trim().max(320).optional(),
  locationDetail: z.string().trim().max(200).optional(),
});

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  const brief = await rewriteAirRaidBrief(parsed.data);
  return NextResponse.json(brief);
}
