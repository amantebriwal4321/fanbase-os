import { cookies } from "next/headers";
import { emptyDelta, parseDelta, parseViewer, serializeDelta } from "./delta";
import { buildSnapshot, type Snapshot } from "./view";
import type { Delta, Viewer } from "./types";

const DELTA = "fb_delta";
const VIEWER = "fb_viewer";

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    // Secure on Vercel (https). Local `next start` on http still keeps the cookie.
    secure: process.env.VERCEL === "1",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
}

export type Session = {
  delta: Delta;
  viewer: Viewer | null;
};

export async function readSession(): Promise<Session> {
  const jar = await cookies();
  return {
    delta: parseDelta(jar.get(DELTA)?.value),
    viewer: parseViewer(jar.get(VIEWER)?.value),
  };
}

export async function writeDelta(delta: Delta): Promise<boolean> {
  const raw = serializeDelta(delta);
  if (!raw) return false;
  const jar = await cookies();
  jar.set(DELTA, raw, cookieOptions());
  return true;
}

export async function writeViewer(viewer: Viewer): Promise<void> {
  const jar = await cookies();
  jar.set(VIEWER, JSON.stringify({ id: viewer.id, name: viewer.name }), cookieOptions());
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(DELTA);
  jar.delete(VIEWER);
}

export async function loadSnapshot(): Promise<{ session: Session; snapshot: Snapshot }> {
  const session = await readSession();
  return { session, snapshot: buildSnapshot(new Date(), session.delta, session.viewer) };
}

export { emptyDelta };
