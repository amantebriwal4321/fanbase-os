import Link from "next/link";
import { joinCommunity, signInDemo, voteIdea } from "@/app/actions";
import { timeAgo } from "@/lib/format";
import type { CommunityPage, IdeaCard } from "@/server/store";
import { Avatar } from "./avatar";

const pill = "rounded-full border px-3 py-1.5 text-sm";

function roomHref(slug: string, view: string, cluster: string) {
  const params = new URLSearchParams();
  if (view && view !== "all") params.set("view", view);
  if (cluster) params.set("cluster", cluster);
  const query = params.toString();
  return query ? `/c/${slug}?${query}` : `/c/${slug}`;
}

function Chip({ children, tone }: { children: React.ReactNode; tone: "clay" | "pine" | "ink" }) {
  const toneClass = tone === "clay" ? "bg-clay text-paper" : tone === "pine" ? "bg-pine text-paper" : "bg-ink text-paper";
  return <span className={`rounded-full px-2 py-0.5 text-[11px] uppercase tracking-wide ${toneClass}`}>{children}</span>;
}

function VoteControl({ idea, slug, back, canVote }: { idea: IdeaCard; slug: string; back: string; canVote: boolean }) {
  const className = `flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl border text-center ${
    idea.voted ? "border-pine bg-pine text-paper" : "border-line bg-card text-ink hover:border-pine"
  }`;
  const count = (
    <>
      <span className="font-display text-xl leading-none">{idea.votes}</span>
      <span className="mt-1 text-[10px] uppercase tracking-wide">votes</span>
    </>
  );
  if (!canVote) {
    return (
      <Link href={`/login?next=${encodeURIComponent(back)}`} className={className} aria-label={`Sign in to vote. ${idea.votes} votes on ${idea.title}`}>
        {count}
      </Link>
    );
  }
  return (
    <form action={voteIdea}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="ideaId" value={idea.id} />
      <input type="hidden" name="back" value={back} />
      <button
        type="submit"
        className={className}
        aria-pressed={idea.voted}
        aria-label={idea.voted ? `Remove your vote. ${idea.votes} votes` : `Upvote. ${idea.votes} votes`}
      >
        {count}
      </button>
    </form>
  );
}

export function CommunityView({
  page,
  view,
  clusterId,
  notice,
  error,
  signedIn,
}: {
  page: CommunityPage;
  view: string;
  clusterId: string;
  notice?: string;
  error?: string;
  signedIn: boolean;
}) {
  const slug = page.community.slug;
  const back = roomHref(slug, view, clusterId);
  const views = [
    ["all", "All"],
    ["pinned", "Pinned"],
    ["in_progress", "In progress"],
    ["open", "Open"],
    ["shipped", "Shipped"],
  ] as const;

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
      <section>
        <p className="text-xs uppercase tracking-[0.16em] text-muted">{page.community.interest}</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-5xl leading-none tracking-tight">{page.community.name}</h1>
            <p className="mt-3 max-w-xl text-base leading-7 text-muted">{page.community.description}</p>
          </div>
          <div className="flex items-center gap-3">
            <ul className="flex -space-x-2" aria-label="Members">
              {page.members.slice(0, 7).map((member) => (
                <li key={member.id} title={member.name}>
                  <Avatar name={member.name} hue={member.hue} />
                  <span className="sr-only">{member.name}</span>
                </li>
              ))}
            </ul>
            <p className="text-sm text-muted">
              {page.members.length} members
              <span className="block">with {page.creator.name}</span>
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {page.viewerIsMember ? (
            <Link href={`/c/${slug}/ideas/new`} className="rounded-full bg-pine px-4 py-2 text-sm font-medium text-paper">
              Post an idea
            </Link>
          ) : (
            <>
              <form action={signInDemo}>
                <input type="hidden" name="role" value="member" />
                <input type="hidden" name="next" value={`/c/${slug}`} />
                <button className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper">Continue as Jordan</button>
              </form>
              <form action={signInDemo}>
                <input type="hidden" name="role" value="creator" />
                <input type="hidden" name="next" value={`/c/${slug}`} />
                <button className={`${pill} border-ink bg-card`}>Open as Lena</button>
              </form>
              {signedIn ? (
                <form action={joinCommunity}>
                  <input type="hidden" name="slug" value={slug} />
                  <button className={`${pill} border-line bg-card`}>Join this room</button>
                </form>
              ) : null}
            </>
          )}
          <Link href={`/c/${slug}/summary`} className={`${pill} border-line bg-card`}>
            Today&apos;s letter
          </Link>
        </div>

        {error ? (
          <p role="alert" className="mt-4 rounded-2xl border border-clay bg-[#fde8df] px-4 py-3 text-sm text-clay">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p role="status" className="mt-4 rounded-2xl border border-line bg-card px-4 py-3 text-sm">
            {notice}
          </p>
        ) : null}

        <div className="mt-6 flex w-full flex-wrap gap-2" aria-label="Filter ideas">
          {views.map(([key, label]) => {
            const active = (view || "all") === key && !clusterId;
            return (
              <Link
                key={key}
                href={roomHref(slug, key, "")}
                className={`${pill} ${active ? "border-ink bg-ink text-paper" : "border-line bg-card"}`}
                aria-current={active ? "page" : undefined}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {page.ideas.length === 0 ? (
          <p className="mt-8 rounded-3xl border border-dashed border-line bg-card px-5 py-8 text-sm leading-6 text-muted">
            Nothing in this view yet. Post a concrete idea, or clear the filter.
          </p>
        ) : (
          <ol className="mt-4">
            {page.ideas.map((idea) => (
              <li key={idea.id} className="border-b border-line py-5">
                <div className="flex gap-4">
                  <VoteControl idea={idea} slug={slug} back={back} canVote={page.viewerIsMember} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      {idea.pinned ? <Chip tone="clay">Pinned</Chip> : null}
                      {idea.stage === "in_progress" ? <Chip tone="pine">In progress</Chip> : null}
                      {idea.stage === "shipped" ? <Chip tone="ink">Shipped</Chip> : null}
                      {idea.cluster ? (
                        <Link href={roomHref(slug, "all", idea.cluster.id)} className="text-xs uppercase tracking-wide text-pine">
                          {idea.cluster.label}
                        </Link>
                      ) : null}
                    </div>
                    <h2 className="mt-1 font-display text-3xl leading-tight tracking-tight">
                      <Link href={`/c/${slug}/ideas/${idea.id}`} className="hover:text-pine">
                        {idea.title}
                      </Link>
                    </h2>
                    <p className="mt-2 line-clamp-2 max-w-2xl text-sm leading-6 text-muted">{idea.body}</p>
                    <p className="mt-2 text-sm text-muted">
                      {idea.author.name} · {timeAgo(idea.createdAt)} · {idea.commentCount} comments · {idea.collaboratorCount} working
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <aside className="space-y-5 lg:pt-2">
        {page.summary ? (
          <div className="rounded-3xl border border-line bg-card p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-muted">Today&apos;s letter</p>
            <h2 className="mt-2 font-display text-2xl leading-tight">{page.summary.headline}</h2>
            <p className="mt-3 text-sm leading-6 text-muted">{page.summary.body.split(/\n\n+/)[0]}</p>
            <Link href={`/c/${slug}/summary`} className="mt-4 inline-block text-sm font-medium text-pine">
              Read the letter
            </Link>
          </div>
        ) : (
          <div className="rounded-3xl border border-line bg-card p-5 text-sm leading-6 text-muted">
            No letter yet. When ideas are in, the creator can write today&apos;s brief.
          </div>
        )}
        <div className="rounded-3xl border border-line bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl">Clusters</h2>
            {clusterId ? (
              <Link href={roomHref(slug, view, "")} className="text-sm text-pine">
                Clear
              </Link>
            ) : null}
          </div>
          <ul className="mt-3 space-y-3">
            {page.clusters.map((cluster) => {
              const active = cluster.id === clusterId;
              return (
                <li key={cluster.id}>
                  <Link href={roomHref(slug, "all", cluster.id)} className={`block ${active ? "text-pine" : ""}`}>
                    <span className="font-medium">
                      {cluster.label} <span className="text-muted">{cluster.count}</span>
                    </span>
                    <span className="mt-1 block text-sm leading-5 text-muted">{cluster.summary}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
    </div>
  );
}
