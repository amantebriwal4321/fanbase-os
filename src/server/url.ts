import { headers } from "next/headers";

export async function absoluteUrl(path: string): Promise<string> {
  const configured = process.env.APP_URL?.replace(/\/$/, "");
  if (configured) return `${configured}${path}`;
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") || headerList.get("host") || "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") || "http";
  return `${proto}://${host}${path}`;
}

export function slugFromNext(nextPath: string): string | null {
  const match = nextPath.match(/^\/c\/([a-z0-9-]+)/);
  return match?.[1] ?? "field-notes";
}
