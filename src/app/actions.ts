"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { safeNext } from "@/lib/format";
import { clearSession, getCurrentUser, setSession } from "@/server/auth";
import { setFlash } from "@/server/flash";
import { FIELD } from "@/server/seed";
import { getRepo } from "@/server/store";
import type { Stage } from "@/server/types";
import { absoluteUrl } from "@/server/url";

function cleanSlug(input: string): string | null {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input) ? input : null;
}

function cleanId(input: string): string | null {
  return /^[a-zA-Z0-9_-]{3,80}$/.test(input) ? input : null;
}

function touch(slug: string, ideaId?: string) {
  revalidatePath("/");
  revalidatePath(`/c/${slug}`);
  revalidatePath(`/c/${slug}/summary`);
  revalidatePath(`/c/${slug}/ideas/new`);
  if (ideaId) revalidatePath(`/c/${slug}/ideas/${ideaId}`);
}

async function sendMagicEmail(email: string, link: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "Fanbase OS <onboarding@resend.dev>",
        to: [email],
        subject: "Your Fanbase OS sign in link",
        text: `Sign in to Fanbase OS:\n${link}\n\nThis link expires in 30 minutes.`,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function signInDemo(formData: FormData) {
  const role = String(formData.get("role") || "");
  const id = role === "creator" ? FIELD.lena : role === "member" ? FIELD.jordan : "";
  const next = safeNext(String(formData.get("next") || ""));
  if (!id) redirect(`/login?error=${encodeURIComponent("Unknown demo account.")}`);
  const user = await getRepo().findUser(id);
  if (!user) redirect(`/login?error=${encodeURIComponent("Demo account is missing. Restore the demo data as Lena.")}`);
  await setSession(user.id);
  redirect(next);
}

export async function signOut() {
  await clearSession();
  redirect("/");
}

export async function requestMagicLink(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const next = safeNext(String(formData.get("next") || ""));
  const back = `/login?next=${encodeURIComponent(next)}`;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect(`${back}&error=${encodeURIComponent("Enter a valid email.")}`);
  }
  const token = await getRepo().createMagicToken(email);
  const link = await absoluteUrl(`/api/auth/magic?token=${token}&next=${encodeURIComponent(next)}`);
  const sent = await sendMagicEmail(email, link);
  if (sent) {
    redirect(`${back}&notice=${encodeURIComponent("Check your email for the sign in link.")}`);
  }
  await setFlash("fb_magic_link", link);
  redirect(
    `${back}&notice=${encodeURIComponent("Email is not configured. Use the sign in link below. It expires in 30 minutes.")}`,
  );
}

export async function postIdea(formData: FormData) {
  const slug = cleanSlug(String(formData.get("slug") || ""));
  if (!slug) redirect("/");
  const title = String(formData.get("title") || "");
  const body = String(formData.get("body") || "");
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/c/${slug}/ideas/new`)}`);
  const result = await getRepo().createIdea({ slug, authorId: user.id, title, body });
  if (!result.ok) {
    await setFlash("fb_idea_draft", JSON.stringify({ title, body }));
    redirect(`/c/${slug}/ideas/new?error=${encodeURIComponent(result.error)}`);
  }
  touch(slug, result.ideaId);
  redirect(`/c/${slug}/ideas/${result.ideaId}`);
}

export async function postComment(formData: FormData) {
  const slug = cleanSlug(String(formData.get("slug") || ""));
  const ideaId = cleanId(String(formData.get("ideaId") || ""));
  if (!slug || !ideaId) redirect("/");
  const body = String(formData.get("body") || "");
  const user = await getCurrentUser();
  const target = `/c/${slug}/ideas/${ideaId}`;
  if (!user) redirect(`/login?next=${encodeURIComponent(target)}`);
  const result = await getRepo().addComment({ slug, ideaId, authorId: user.id, body });
  if (!result.ok) {
    await setFlash("fb_comment_draft", body);
    redirect(`${target}?error=${encodeURIComponent(result.error)}#comments`);
  }
  touch(slug, ideaId);
  redirect(`${target}#comments`);
}

export async function joinIdea(formData: FormData) {
  const slug = cleanSlug(String(formData.get("slug") || ""));
  const ideaId = cleanId(String(formData.get("ideaId") || ""));
  if (!slug || !ideaId) redirect("/");
  const note = String(formData.get("note") || "");
  const user = await getCurrentUser();
  const target = `/c/${slug}/ideas/${ideaId}`;
  if (!user) redirect(`/login?next=${encodeURIComponent(target)}`);
  const result = await getRepo().joinIdea({ slug, ideaId, userId: user.id, note });
  if (!result.ok) {
    await setFlash("fb_join_draft", note);
    redirect(`${target}?error=${encodeURIComponent(result.error)}#working`);
  }
  touch(slug, ideaId);
  redirect(`${target}#working`);
}

export async function voteIdea(formData: FormData) {
  const slug = cleanSlug(String(formData.get("slug") || ""));
  const ideaId = cleanId(String(formData.get("ideaId") || ""));
  if (!slug || !ideaId) redirect("/");
  const back = safeNext(String(formData.get("back") || ""), `/c/${slug}`);
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(back)}`);
  const result = await getRepo().toggleVote(slug, ideaId, user.id);
  touch(slug, ideaId);
  if (!result.ok) {
    const join = back.includes("?") ? "&" : "?";
    redirect(`${back}${join}error=${encodeURIComponent(result.error)}`);
  }
}

export async function setPinned(formData: FormData) {
  const slug = cleanSlug(String(formData.get("slug") || ""));
  const ideaId = cleanId(String(formData.get("ideaId") || ""));
  if (!slug || !ideaId) redirect("/");
  const user = await getCurrentUser();
  const target = `/c/${slug}/ideas/${ideaId}`;
  if (!user) redirect(`/login?next=${encodeURIComponent(target)}`);
  const pinned = String(formData.get("pinned") || "") === "1";
  const result = await getRepo().setPinned({ slug, ideaId, actorId: user.id, pinned });
  touch(slug, ideaId);
  if (!result.ok) redirect(`${target}?error=${encodeURIComponent(result.error)}`);
}

export async function setStage(formData: FormData) {
  const slug = cleanSlug(String(formData.get("slug") || ""));
  const ideaId = cleanId(String(formData.get("ideaId") || ""));
  if (!slug || !ideaId) redirect("/");
  const stage = String(formData.get("stage") || "") as Stage;
  const user = await getCurrentUser();
  const target = `/c/${slug}/ideas/${ideaId}`;
  if (!user) redirect(`/login?next=${encodeURIComponent(target)}`);
  const result = await getRepo().setStage({ slug, ideaId, actorId: user.id, stage });
  touch(slug, ideaId);
  if (!result.ok) redirect(`${target}?error=${encodeURIComponent(result.error)}`);
}

export async function writeBrief(formData: FormData) {
  const slug = cleanSlug(String(formData.get("slug") || ""));
  if (!slug) redirect("/");
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/c/${slug}/summary`)}`);
  const result = await getRepo().writeBrief(slug, user.id);
  touch(slug);
  if (!result.ok) redirect(`/c/${slug}/summary?error=${encodeURIComponent(result.error)}`);
  redirect(`/c/${slug}/summary?notice=${encodeURIComponent("A new letter is at the top.")}`);
}

export async function createCommunity(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/communities/new");
  const name = String(formData.get("name") || "");
  const interest = String(formData.get("interest") || "");
  const description = String(formData.get("description") || "");
  const result = await getRepo().createCommunity({ creatorId: user.id, name, interest, description });
  if (!result.ok) {
    await setFlash("fb_room_draft", JSON.stringify({ name, interest, description }));
    redirect(`/communities/new?error=${encodeURIComponent(result.error)}`);
  }
  revalidatePath("/");
  redirect(`/c/${result.slug}`);
}

export async function joinCommunity(formData: FormData) {
  const slug = cleanSlug(String(formData.get("slug") || ""));
  if (!slug) redirect("/");
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/c/${slug}`)}`);
  const result = await getRepo().joinCommunity(slug, user.id);
  touch(slug);
  if (!result.ok) redirect(`/c/${slug}?error=${encodeURIComponent(result.error)}`);
}

export async function restoreDemo(formData: FormData) {
  if (String(formData.get("confirm") || "") !== "yes") {
    redirect(`/c/field-notes/summary?error=${encodeURIComponent("Confirm the restore first.")}`);
  }
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/c/field-notes/summary");
  const result = await getRepo().restoreDemo(user.id);
  revalidatePath("/");
  revalidatePath("/c/field-notes");
  if (!result.ok) redirect(`/c/field-notes/summary?error=${encodeURIComponent(result.error)}`);
  redirect("/c/field-notes?notice=The original demo room is back.");
}
