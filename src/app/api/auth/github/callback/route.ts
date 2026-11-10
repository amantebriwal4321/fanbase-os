import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { safeNext } from "@/lib/format";
import { setSession } from "@/server/auth";
import { getRepo } from "@/server/store";
import { absoluteUrl, slugFromNext } from "@/server/url";

type GitHubUser = { name?: string | null; login?: string; email?: string | null; id?: number };
type GitHubEmail = { email: string; primary: boolean; verified: boolean };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code") || "";
  const state = url.searchParams.get("state") || "";
  const jar = await cookies();
  const expected = jar.get("fb_oauth_state")?.value || "";
  const next = safeNext(jar.get("fb_oauth_next")?.value);
  jar.delete("fb_oauth_state");
  jar.delete("fb_oauth_next");
  if (!code || !expected || state !== expected) {
    redirect(`/login?error=${encodeURIComponent("GitHub sign in failed. Try again.")}`);
  }

  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: await absoluteUrl("/api/auth/github/callback"),
    }),
  });
  const tokenJson = (await tokenResponse.json()) as { access_token?: string };
  if (!tokenJson.access_token) {
    redirect(`/login?error=${encodeURIComponent("GitHub did not return a token.")}`);
  }

  const headers = {
    Authorization: `Bearer ${tokenJson.access_token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "fanbase-os",
  };
  const profileResponse = await fetch("https://api.github.com/user", { headers });
  const profile = (await profileResponse.json()) as GitHubUser;
  let email = profile.email || "";
  if (!email) {
    const emailsResponse = await fetch("https://api.github.com/user/emails", { headers });
    if (emailsResponse.ok) {
      const emails = (await emailsResponse.json()) as GitHubEmail[];
      email = emails.find((item) => item.primary && item.verified)?.email || emails.find((item) => item.verified)?.email || "";
    }
  }
  if (!email && profile.id) email = `${profile.id}+${profile.login || "user"}@users.noreply.github.com`;
  if (!email) redirect(`/login?error=${encodeURIComponent("GitHub did not share an email for this account.")}`);

  const user = await getRepo().upsertFromLogin({
    email,
    name: profile.name || profile.login || "GitHub member",
    handle: profile.login || "github",
    joinSlug: slugFromNext(next),
  });
  await setSession(user.id);
  redirect(next);
}
