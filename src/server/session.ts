import { createHmac, timingSafeEqual } from "crypto";

type Payload = { userId: string; exp: number };

function secret(): string {
  return process.env.AUTH_SECRET || "fanbase-os-demo-secret";
}

function sign(body: string): string {
  return createHmac("sha256", secret()).update(body).digest("base64url");
}

export function createSessionToken(userId: string, now = Date.now()): string {
  const payload: Payload = { userId, exp: now + 30 * 24 * 60 * 60 * 1000 };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function readSessionToken(token: string | undefined, now = Date.now()): string | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as Payload;
    if (!payload || typeof payload.userId !== "string" || typeof payload.exp !== "number") return null;
    if (payload.userId.length < 3 || payload.userId.length > 80) return null;
    if (payload.exp < now) return null;
    return payload.userId;
  } catch {
    return null;
  }
}
