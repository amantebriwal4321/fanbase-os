import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { restoreDemo, writeBrief } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { prettyDay } from "@/lib/format";
import { getCurrentUser } from "@/server/auth";
import { FIELD } from "@/server/seed";
import { getRepo } from "@/server/store";

export const metadata: Metadata = { title: "Daily letter" };

export default async function SummaryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const user = await getCurrentUser();
  const page = await getRepo().getSummary(slug, user?.id ?? null);
  if (!page) notFound();
  const titles = new Map(page.ideas.map((idea) => [idea.id, idea.title]));
  const [latest, ...older] = page.summaries;

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-sm text-muted">
        <Link href={`/c/${slug}`} className="hover:text-pine">
          {page.community.name}
        </Link>
      </p>
      <h1 className="mt-2 font-display text-5xl tracking-tight">Daily letter</h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        Written for {page.creator.name}. It names the ideas that are leading and the newest post in the room.
      </p>
      {query.error ? (
        <p role="alert" className="mt-4 rounded-2xl border border-clay bg-[#fde8df] px-4 py-3 text-sm text-clay">
          {query.error}
        </p>
      ) : null}
      {query.notice ? (
        <p role="status" className="mt-4 rounded-2xl border border-line bg-card px-4 py-3 text-sm">
          {query.notice}
        </p>
      ) : null}

      {page.viewerIsCreator ? (
        <form action={writeBrief} className="mt-6">
          <input type="hidden" name="slug" value={slug} />
          <SubmitButton
            pendingLabel="Writing..."
            className="rounded-full bg-pine px-4 py-2 text-sm font-medium text-paper disabled:opacity-60"
          >
            Write today&apos;s letter
          </SubmitButton>
        </form>
      ) : (
        <p className="mt-6 text-sm text-muted">
          <Link href={`/login?next=${encodeURIComponent(`/c/${slug}/summary`)}`} className="font-medium text-pine">
            Open as Lena
          </Link>{" "}
          from the header if you want to write a new letter.
        </p>
      )}

      {latest ? (
        <article className="mt-8 rounded-[2rem] border border-line bg-card p-6 md:p-8">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">
            {prettyDay(latest.day)} · {latest.source === "llm" ? "Model" : "House letter"}
          </p>
          <h2 className="mt-3 font-display text-4xl leading-tight">{latest.headline}</h2>
          <div className="mt-4 space-y-4 text-base leading-7">
            {latest.body.split(/\n\n+/).map((paragraph, index) => (
              <p key={`${latest.id}-${index}`}>{paragraph}</p>
            ))}
          </div>
          {latest.topIdeaIds.length > 0 ? (
            <ul className="mt-6 space-y-2 text-sm">
              {latest.topIdeaIds.map((id) =>
                titles.get(id) ? (
                  <li key={id}>
                    <Link href={`/c/${slug}/ideas/${id}`} className="font-medium text-pine">
                      {titles.get(id)}
                    </Link>
                  </li>
                ) : null,
              )}
            </ul>
          ) : null}
        </article>
      ) : (
        <p className="mt-8 text-sm text-muted">No letter yet.</p>
      )}

      {older.length > 0 ? (
        <section className="mt-10">
          <h2 className="font-display text-2xl">Earlier letters</h2>
          <ul className="mt-3 space-y-3">
            {older.map((summary) => (
              <li key={summary.id} className="border-t border-line pt-3">
                <p className="text-xs uppercase tracking-wide text-muted">{prettyDay(summary.day)}</p>
                <p className="font-display text-xl">{summary.headline}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {user?.id === FIELD.lena && slug === FIELD.slug ? (
        <form action={restoreDemo} className="mt-12 rounded-3xl border border-dashed border-line p-5">
          <h2 className="font-display text-2xl">Restore demo</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Puts the original Field Notes room back. This removes ideas posted after the seed, including other rooms.
          </p>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" name="confirm" value="yes" required />
            I want the original demo data
          </label>
          <SubmitButton className="mt-3 rounded-full border border-ink px-4 py-2 text-sm">Restore demo data</SubmitButton>
        </form>
      ) : null}
    </div>
  );
}
