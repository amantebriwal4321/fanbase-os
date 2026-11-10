import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { safeNext } from "@/lib/format";
import { absoluteUrl } from "@/server/url";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get("next"));
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId || !process.env.GITHUB_CLIENT_SECRET) {
    redirect(
      `/login?next=${encodeURIComponent(next)}&error=${encodeURIComponent("GitHub sign in is not configured. Add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.")}`,
    );
  }
  const state = randomBytes(16).toString("hex");
  const jar = await cookies();
  const secure = process.env.NODE_ENV === "production";
  jar.set("fb_oauth_state", state, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 600 });
  jar.set("fb_oauth_next", next, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 600 });
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: await absoluteUrl("/api/auth/github/callback"),
    scope: "read:user user:email",
    state,
  });
  redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
}
