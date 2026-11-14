import Link from "next/link";
import { groupAgain, passNote, resetDemo } from "@/app/actions";
import { GROUP_NOTES, hasModelKey } from "@/server/ai";
import { RANKING_RULES } from "@/server/rank";
import { timeAgo } from "@/server/text";
import type { Note, Snapshot } from "@/server/view";
import { CallForm } from "./call-form";
import { ScrollTo } from "./scroll-to";
import { SubmitButton } from "./submit-button";

function sourceLabel(source: Note["classifySource"]): string {
  return source === "model" ? "Topic from the model" : "Topic from rules";
}

function recent(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() < 15 * 60 * 1000;
}

function NoteCopy({ note, featured }: { note: Note; featured: boolean }) {
  return (
    <>
      <p className="text-sm text-muted">
        {note.kind === "pitch" ? "Pitch" : "Message"} · {note.communityName} · {sourceLabel(note.classifySource)}
        {recent(note.createdAt) ? " · New" : ""}
      </p>
      <h3 className={featured ? "mt-1 font-display text-4xl leading-tight tracking-tight" : "mt-1 font-display text-2xl leading-tight"}>
        {note.title}
      </h3>
      <p className="mt-1 text-sm text-muted">
        {note.fan.name} · {note.fan.note} · {timeAgo(note.createdAt)}
      </p>
      {featured ? <p className="mt-3 text-base leading-7">{note.body}</p> : null}
      {note.summary ? <p className="mt-3 text-sm leading-6">Summary: {note.summary}</p> : null}
      <p className="mt-3 rounded-2xl bg-[#f6f1e7] px-3 py-2 text-sm leading-6">{note.reason}</p>
      {note.chips.length > 0 ? (
        <p className="mt-3 text-sm leading-6 text-muted">
          {note.chips.map((chip) => `${chip.label} +${chip.points}`).join(" · ")} = {note.score}
        </p>
      ) : null}
    </>
  );
}

function DeskCard({
  note,
  featured,
  accepting,
  error,
}: {
  note: Note;
  featured: boolean;
  accepting: boolean;
  error: string | null;
}) {
  return (
    <article
      id={note.id}
      className={`scroll-mt-24 rounded-3xl border bg-card p-5 ${featured ? "border-clay/50 shadow-sm" : "border-line"}`}
    >
      {featured ? <p className="mb-2 text-sm font-semibold text-clay">Start here</p> : null}
      <NoteCopy note={note} featured={featured || accepting} />
      {note.kind === "pitch" ? (
        accepting ? (
          <>
          <CallForm itemId={note.id} suggested={note.suggested} communityName={note.communityName} />
          <Link href="/desk" className="mt-3 inline-block text-sm underline decoration-line underline-offset-4">
            Cancel
          </Link>
        </>
        ) : (
          <Link
            href={`/desk?accept=${note.id}#${note.id}`}
            className="mt-4 inline-flex rounded-full bg-pine px-4 py-2.5 text-sm font-semibold text-paper"
          >
            Accept and post a call
          </Link>
        )
      ) : (
        <p className="mt-3 text-sm text-muted">Worth a look. Accept is for pitches.</p>
      )}
      {accepting && error ? (
        <p role="alert" className="mt-2 text-sm text-clay">
          {error}
        </p>
      ) : null}
      {featured ? (
        <form action={passNote} className="mt-3">
          <input type="hidden" name="itemId" value={note.id} />
          <SubmitButton tone="quiet" pendingLabel="Setting aside...">
            Not now
          </SubmitButton>
        </form>
      ) : null}
    </article>
  );
}

export function Desk({
  snapshot,
  acceptId,
  error,
  grouped,
  focus,
}: {
  snapshot: Snapshot;
  acceptId: string;
  error: string | null;
  grouped: keyof typeof GROUP_NOTES | null;
  focus: string;
}) {
  const keyReady = hasModelKey();
  const [first, ...rest] = snapshot.surfaced;
  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <ScrollTo id={focus} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-sm text-muted">Creator desk · {snapshot.creator.name}</p>
          <h1 className="mt-1 font-display text-5xl tracking-tight">Inbox</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            Pitches and messages, grouped by topic. The rules pick the short list. A model, when you give it a key,
            only names the topic and writes the summary.
          </p>
          <p className="mt-2 text-sm text-muted">
            {snapshot.openCount} open · {snapshot.aside.length} set aside · {snapshot.surfaced.length} on the desk
            {snapshot.modelCount > 0 ? ` · ${snapshot.modelCount} named by the model` : ""}
          </p>
        </div>
        <form action={groupAgain}>
          <SubmitButton pendingLabel="Reading...">
            {keyReady ? "Group again with the model" : "Group again with house rules"}
          </SubmitButton>
        </form>
      </div>
      {grouped ? (
        <p role="status" className="mt-4 rounded-2xl bg-[#e7f3ec] px-3 py-2 text-sm leading-6">
          {GROUP_NOTES[grouped]}
        </p>
      ) : null}
      {error && !acceptId ? (
        <p role="alert" className="mt-4 text-sm text-clay">
          {error}
        </p>
      ) : null}

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <aside className="rounded-3xl bg-[#e7f2ec] p-5 lg:sticky lg:top-20 lg:col-start-2 lg:row-start-1">
          <h2 className="font-display text-2xl">Ranking rules</h2>
          <p className="mt-2 text-sm leading-6">These rules always pick the desk. A model key does not change the score.</p>
          <ol className="mt-4 space-y-3">
            {RANKING_RULES.map((rule) => (
              <li key={rule.title}>
                <p className="text-sm font-semibold">{rule.title}</p>
                <p className="text-sm leading-5 text-muted">{rule.body}</p>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm leading-6">
            {keyReady
              ? "Model key: set. Group again to let it rename topics and rewrite summaries."
              : "Model key: not set. Topics use house rules, so the demo still runs."}
          </p>
        </aside>
        <div className="lg:col-start-1 lg:row-start-1">
          <section aria-labelledby="desk-heading">
            <h2 id="desk-heading" className="font-display text-3xl tracking-tight">
              Worth acting on
            </h2>
            <p className="mt-1 text-sm text-muted">Ranked by the rules, not by the model.</p>
            {first ? (
              <div className="mt-4 space-y-3">
                <DeskCard note={first} featured accepting={acceptId === first.id} error={acceptId === first.id ? error : null} />
                {rest.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {rest.map((note) => (
                      <DeskCard
                        key={note.id}
                        note={note}
                        featured={false}
                        accepting={acceptId === note.id}
                        error={acceptId === note.id ? error : null}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="mt-4 rounded-3xl border border-line bg-card p-5 text-sm">Nothing on the desk clears the bar.</p>
            )}
          </section>

          <section className="mt-10" aria-labelledby="groups-heading">
            <h2 id="groups-heading" className="font-display text-3xl tracking-tight">
              Grouped by topic
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {snapshot.groups.map((group) => (
                <section key={group.topic} className="rounded-3xl border border-line bg-card p-4">
                  <h3 className="font-display text-2xl">{group.topic}</h3>
                  <p className="text-sm text-muted">
                    {group.notes.length} {group.notes.length === 1 ? "note" : "notes"}
                  </p>
                  <ul className="mt-3 space-y-3">
                    {group.notes.map((note) => (
                      <li key={note.id} className="border-t border-line pt-3">
                        <p className="text-xs text-muted">
                          {note.kind === "pitch" ? "Pitch" : "Message"} · score {note.score}
                          {recent(note.createdAt) ? " · New" : ""}
                        </p>
                        <p className="mt-1 font-medium leading-5">{note.title}</p>
                        <p className="text-sm text-muted">{note.fan.name}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </section>

          <details className="mt-8 rounded-3xl border border-line bg-card p-4">
            <summary className="cursor-pointer text-sm font-medium">Set aside ({snapshot.aside.length})</summary>
            <ul className="mt-3 space-y-3">
              {snapshot.aside.map((note) => (
                <li key={note.id}>
                  <p className="font-medium">{note.title}</p>
                  <p className="text-sm text-muted">
                    {note.fan.name} · {note.reason}
                  </p>
                </li>
              ))}
            </ul>
          </details>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href="/" className="text-sm underline decoration-line underline-offset-4">
              Back to the public hub
            </Link>
            <form action={resetDemo}>
              <SubmitButton tone="quiet" pendingLabel="Resetting...">
                Reset demo
              </SubmitButton>
            </form>
          </div>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
            This desk is open for the demo, so you can move from the hub without an account. Reset clears pitches and
            calls added in this browser. The seeded room comes back.
          </p>
        </div>
      </div>
    </div>
  );
}
