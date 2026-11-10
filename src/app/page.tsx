import Link from "next/link";
import { timeAgo } from "@/lib/format";
import { getRepo } from "@/server/store";

export default async function HomePage() {
  const { communities, field } = await getRepo().home();
  const top = field?.ideas.slice(0, 3) ?? [];
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.18em] text-muted">Persist Startupathon</p>
      <h1 className="mt-3 max-w-3xl font-display text-5xl leading-[0.95] tracking-tight md:text-7xl">
        The operating system for fanbases.
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
        Creators get a room built around one interest. Members post ideas, vote, comment, and join the work. A filter
        drops spam. Similar ideas sit together. Each day the creator gets a short letter about what the room actually
        wants.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/c/field-notes" className="rounded-full bg-pine px-5 py-2.5 text-sm font-medium text-paper">
          Enter Field Notes
        </Link>
        <Link href="/login" className="rounded-full border border-ink px-5 py-2.5 text-sm font-medium">
          Sign in
        </Link>
      </div>

      <section className="mt-12 grid gap-6 rounded-[2rem] border border-line bg-card p-6 md:grid-cols-[1.2fr_0.8fr] md:p-8">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted">Live room</p>
          <h2 className="mt-2 font-display text-4xl">Field Notes</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
            Lena Park&apos;s fans pitch city walks, small kits, and episodes for the next season. Open it as Jordan, a
            member, or as Lena. No signup.
          </p>
          {field?.summary ? (
            <p className="mt-4 text-sm leading-6">
              <span className="font-medium">Latest letter.</span> {field.summary.headline}
            </p>
          ) : null}
          <p className="mt-3 text-sm text-muted">
            {field?.ideaCount ?? 0} ideas · {field?.members.length ?? 0} members · {field?.clusters.length ?? 0} clusters
          </p>
        </div>
        <ol className="space-y-4">
          {top.map((idea) => (
            <li key={idea.id} className="border-t border-line pt-3">
              <Link href={`/c/field-notes/ideas/${idea.id}`} className="font-display text-2xl leading-tight hover:text-pine">
                {idea.title}
              </Link>
              <p className="mt-1 text-sm text-muted">
                {idea.votes} votes · {idea.author.name} · {timeAgo(idea.createdAt)}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {communities.length > 1 ? (
        <section className="mt-12">
          <h2 className="font-display text-3xl">Rooms</h2>
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {communities.map((community) => (
              <li key={community.slug} className="rounded-3xl border border-line bg-card p-5">
                <p className="text-xs uppercase tracking-[0.14em] text-muted">{community.interest}</p>
                <h3 className="mt-2 font-display text-2xl">
                  <Link href={`/c/${community.slug}`} className="hover:text-pine">
                    {community.name}
                  </Link>
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted">{community.description}</p>
                <p className="mt-3 text-sm text-muted">
                  {community.creatorName} · {community.memberCount} members · {community.ideaCount} ideas
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
