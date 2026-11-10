import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { postIdea } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { getCurrentUser } from "@/server/auth";
import { readFlash } from "@/server/flash";
import { getRepo } from "@/server/store";

export const metadata: Metadata = { title: "Post an idea" };

const field = "mt-1 w-full rounded-2xl border border-line bg-white px-3 py-2 text-sm";

export default async function NewIdeaPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/c/${slug}/ideas/new`)}`);
  const page = await getRepo().getCommunity(slug, user.id, "all", "");
  if (!page) notFound();
  if (!page.viewerIsMember) redirect(`/c/${slug}?error=${encodeURIComponent("Join this community before you post.")}`);

  let draft = { title: "", body: "" };
  if (query.error) {
    const raw = await readFlash("fb_idea_draft");
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { title?: string; body?: string };
        draft = { title: parsed.title || "", body: parsed.body || "" };
      } catch {
        draft = { title: "", body: "" };
      }
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-xs uppercase tracking-[0.16em] text-muted">{page.community.name}</p>
      <h1 className="mt-2 font-display text-5xl tracking-tight">Post an idea</h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        Name something the room can do. Add a place, a time, or a thing to make. Spam, copies, and one line cheers are
        turned away.
      </p>
      {query.error ? (
        <p role="alert" className="mt-4 rounded-2xl border border-clay bg-[#fde8df] px-4 py-3 text-sm text-clay">
          {query.error}
        </p>
      ) : null}
      <form action={postIdea} className="mt-6 space-y-4">
        <input type="hidden" name="slug" value={slug} />
        <label className="block text-sm font-medium">
          Title
          <input name="title" required minLength={8} maxLength={80} defaultValue={draft.title} className={field} />
        </label>
        <label className="block text-sm font-medium">
          The idea
          <textarea
            name="body"
            required
            minLength={40}
            maxLength={2000}
            rows={7}
            defaultValue={draft.body}
            className={field}
          />
        </label>
        <div className="flex items-center gap-4">
          <SubmitButton
            pendingLabel="Checking..."
            className="rounded-full bg-pine px-4 py-2 text-sm font-medium text-paper disabled:opacity-60"
          >
            Submit idea
          </SubmitButton>
          <Link href={`/c/${slug}`} className="text-sm text-muted">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
