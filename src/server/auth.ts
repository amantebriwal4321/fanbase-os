import { cookies } from "next/headers";
import { createSessionToken, readSessionToken } from "./session";
import { getRepo } from "./store";
import type { User } from "./types";

const COOKIE = "fb_session";

export async function getCurrentUser(): Promise<User | null> {
  const jar = await cookies();
  const userId = readSessionToken(jar.get(COOKIE)?.value);
  if (!userId) return null;
  return getRepo().findUser(userId);
}

export async function setSession(userId: string): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE, createSessionToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}
