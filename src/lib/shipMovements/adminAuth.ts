import { createHmac, timingSafeEqual } from "node:crypto";

export function shipMovementAdminSecret(): string | null {
  return process.env.SHIP_MOVEMENT_ADMIN_SECRET?.trim() || null;
}

export function signAdminToken(secret: string, expMs: number): string {
  const exp = String(Date.now() + expMs);
  const sig = createHmac("sha256", secret).update(exp).digest("hex");
  return `${exp}.${sig}`;
}

export function verifyAdminToken(token: string | undefined, secret: string): boolean {
  if (!token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig) return false;
  const expNum = Number(exp);
  if (!Number.isFinite(expNum) || expNum < Date.now()) return false;
  const expected = createHmac("sha256", secret).update(exp).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}
