import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { joinIdea, postComment, setPinned, setStage, voteIdea } from "@/app/actions";
import { Avatar } from "@/components/avatar";
import { SubmitButton } from "@/components/submit-button";
import { timeAgo } from "@/lib/format";
import { getCurrentUser } from "@/server/auth";
import { readFlash } from "@/server/flash";
import { getRepo } from "@/server/store";

const field = "mt-1 w-full rounded-2xl border border-line bg-white px-3 py-2 text-sm";
const stageLabel: Record<string, string> = {
  open: "Open",
  in_progress: "In progress",
  shipped: "Shipped",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}): Promise<Metadata> {
  const { slug, id } = await params;
  const page = await getRepo().getIdea(slug, id, null);
  return { title: page?.idea.title || "Idea" };
}

export default async function IdeaPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { slug, id } = await params;
  const query = await searchParams;
  const user = await getCurrentUser();
  const page = await getRepo().getIdea(slug, id, user?.id ?? null);
  if (!page) notFound();
  const back = `/c/${slug}/ideas/${page.idea.id}`;
  const commentDraft = query.error ? (await readFlash("fb_comment_draft")) || "" : "";
  const joinDraft = query.error ? (await readFlash("fb_join_draft")) || "" : "";

  return (
    <article className="mx-auto max-w-3xl">
      <p className="text-sm text-muted">
        <Link href={`/c/${slug}`} className="hover:text-pine">
          {page.community.name}
        </Link>
        {page.idea.cluster ? (
          <>
            {" "}
            ·{" "}
            <Link href={`/c/${slug}?cluster=${page.idea.cluster.id}`} className="hover:text-pine">
              {page.idea.cluster.label}
            </Link>
          </>
        ) : null}
      </p>
      <div className="mt-4 flex gap-4">
        <form action={voteIdea}>
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="ideaId" value={page.idea.id} />
          <input type="hidden" name="back" value={back} />
          {page.viewerIsMember ? (
            <button
              className={`flex h-20 w-20 flex-col items-center justify-center rounded-3xl border ${
                page.idea.voted ? "border-pine bg-pine text-paper" : "border-line bg-card"
              }`}
              aria-pressed={page.idea.voted}
              aria-label={page.idea.voted ? "Remove your vote" : "Upvote this idea"}
            >
              <span className="font-display text-3xl leading-none">{page.idea.votes}</span>
              <span className="mt-1 text-[10px] uppercase tracking-wide">votes</span>
            </button>
          ) : (
            <Link
              href={`/login?next=${encodeURIComponent(back)}`}
              className="flex h-20 w-20 flex-col items-center justify-center rounded-3xl border border-line bg-card"
            >
              <span className="font-display text-3xl leading-none">{page.idea.votes}</span>
              <span className="mt-1 text-[10px] uppercase tracking-wide">votes</span>
            </Link>
          )}
        </form>
        <div>
          <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-wide">
            {page.idea.pinned ? <span className="rounded-full bg-clay px-2 py-0.5 text-paper">Pinned</span> : null}
            {page.idea.stage !== "open" ? (
              <span className="rounded-full bg-pine px-2 py-0.5 text-paper">{stageLabel[page.idea.stage]}</span>
            ) : null}
          </div>
          <h1 className="mt-2 font-display text-4xl leading-tight tracking-tight md:text-5xl">{page.idea.title}</h1>
          <p className="mt-2 flex items-center gap-2 text-sm text-muted">
            <Avatar name={page.idea.author.name} hue={page.idea.author.hue} size={24} />
            {page.idea.author.name} · {timeAgo(page.idea.createdAt)}
          </p>
        </div>
      </div>

      <p className="mt-6 max-w-2xl text-lg leading-8">{page.idea.body}</p>
      <p className="mt-4 text-sm leading-6 text-muted">
        <span className="font-medium text-ink">{page.idea.moderationSource === "llm" ? "Model filter" : "House filter"}.</span>{" "}
        {page.idea.moderationNote}
      </p>

      {query.error ? (
        <p role="alert" className="mt-4 rounded-2xl border border-clay bg-[#fde8df] px-4 py-3 text-sm text-clay">
          {query.error}
        </p>
      ) : null}

      {page.viewerIsCreator ? (
        <section className="mt-8 rounded-3xl border border-line bg-card p-5">
          <h2 className="font-display text-2xl">Creator desk</h2>
          <p className="mt-1 text-sm text-muted">Pin it, start it, or mark it shipped.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <form action={setPinned}>
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="ideaId" value={page.idea.id} />
              <input type="hidden" name="pinned" value={page.idea.pinned ? "0" : "1"} />
              <SubmitButton className="rounded-full border border-clay px-4 py-2 text-sm text-clay">
                {page.idea.pinned ? "Unpin" : "Pin"}
              </SubmitButton>
            </form>
            <form action={setStage} className="flex flex-wrap gap-2">
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="ideaId" value={page.idea.id} />
              {(["open", "in_progress", "shipped"] as const).map((stage) => (
                <button
                  key={stage}
                  name="stage"
                  value={stage}
                  aria-pressed={page.idea.stage === stage}
                  className={`rounded-full px-4 py-2 text-sm ${
                    page.idea.stage === stage ? "bg-ink text-paper" : "border border-line bg-white"
                  }`}
                >
                  {stageLabel[stage]}
                </button>
              ))}
            </form>
          </div>
        </section>
      ) : null}

      <section id="working" className="mt-10">
        <h2 className="font-display text-3xl">Working on this</h2>
        {page.collaborators.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Nobody has joined yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {page.collaborators.map((person) => (
              <li key={person.id} className="flex gap-3">
                <Avatar name={person.author.name} hue={person.author.hue} size={28} />
                <p className="text-sm leading-6">
                  <span className="font-medium">{person.author.name}</span>
                  {person.note ? <span className="text-muted"> · {person.note}</span> : <span className="text-muted"> joined</span>}
                </p>
              </li>
            ))}
          </ul>
        )}
        {page.viewerIsMember ? (
          <form action={joinIdea} className="mt-4">
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="ideaId" value={page.idea.id} />
            <label className="block text-sm font-medium">
              {page.viewerJoined ? "Update your note" : "Join this idea"}
              <textarea
                name="note"
                rows={3}
                maxLength={280}
                defaultValue={joinDraft}
                placeholder="What you can take on"
                className={field}
              />
            </label>
            <SubmitButton
              pendingLabel="Saving..."
              className="mt-3 rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper disabled:opacity-60"
            >
              {page.viewerJoined ? "Save note" : "Join"}
            </SubmitButton>
          </form>
        ) : (
          <p className="mt-3 text-sm">
            <Link href={`/login?next=${encodeURIComponent(back)}`} className="font-medium text-pine">
              Sign in
            </Link>{" "}
            to join the work.
          </p>
        )}
      </section>

      <section id="comments" className="mt-10">
        <h2 className="font-display text-3xl">Comments</h2>
        {page.comments.length === 0 ? <p className="mt-2 text-sm text-muted">No comments yet.</p> : null}
        <ol className="mt-4 space-y-4">
          {page.comments.map((comment) => (
            <li key={comment.id} className="border-t border-line pt-4">
              <p className="flex items-center gap-2 text-sm font-medium">
                <Avatar name={comment.author.name} hue={comment.author.hue} size={24} />
                {comment.author.name}
                <span className="font-normal text-muted">{timeAgo(comment.createdAt)}</span>
              </p>
              <p className="mt-2 text-sm leading-6">{comment.body}</p>
            </li>
          ))}
        </ol>
        {page.viewerIsMember ? (
          <form action={postComment} className="mt-5">
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="ideaId" value={page.idea.id} />
            <label className="block text-sm font-medium">
              Add a comment
              <textarea name="body" required minLength={2} maxLength={800} rows={3} defaultValue={commentDraft} className={field} />
            </label>
            <SubmitButton
              pendingLabel="Posting..."
              className="mt-3 rounded-full bg-pine px-4 py-2 text-sm font-medium text-paper disabled:opacity-60"
            >
              Comment
            </SubmitButton>
          </form>
        ) : null}
      </section>
    </article>
  );
}
