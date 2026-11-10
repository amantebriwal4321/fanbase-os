import { cookies } from "next/headers";

export async function setFlash(name: string, value: string): Promise<void> {
  const jar = await cookies();
  jar.set(name, encodeURIComponent(value), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });
}

export async function readFlash(name: string): Promise<string | null> {
  const jar = await cookies();
  const value = jar.get(name)?.value;
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}
