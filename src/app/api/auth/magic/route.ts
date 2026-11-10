import { redirect } from "next/navigation";
import { safeNext } from "@/lib/format";
import { setSession } from "@/server/auth";
import { getRepo } from "@/server/store";
import { slugFromNext } from "@/server/url";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  const next = safeNext(url.searchParams.get("next"));
  const consumed = await getRepo().consumeMagicToken(token);
  if (!consumed) {
    redirect(`/login?error=${encodeURIComponent("That sign in link is expired or already used.")}`);
  }
  const handle = consumed.email.split("@")[0] || "member";
  const user = await getRepo().upsertFromLogin({
    email: consumed.email,
    name: "",
    handle,
    joinSlug: slugFromNext(next),
  });
  await setSession(user.id);
  redirect(next);
}
