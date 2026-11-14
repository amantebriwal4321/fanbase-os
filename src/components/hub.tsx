import Link from "next/link";
import { joinCommunity } from "@/app/actions";
import { timeAgo } from "@/server/text";
import type { Snapshot } from "@/server/view";
import { Facepile } from "./facepile";
import { PitchForm } from "./pitch-form";
import { ScrollTo } from "./scroll-to";
import { SubmitButton } from "./submit-button";

const ACCENT: Record<string, string> = {
  "night-market": "border-l-[#1e3a5f]",
  "test-kitchen": "border-l-pine",
  "guest-spots": "border-l-clay",
};

export function Hub({
  snapshot,
  error,
  errorCommunity,
  sentCommunity,
  posted,
  sampleCommunity,
  focus,
}: {
  snapshot: Snapshot;
  error: string | null;
  errorCommunity: string;
  sentCommunity: string;
  posted: boolean;
  sampleCommunity: string;
  focus: string;
}) {
  const { creator } = snapshot;
  return (
    <div className="mx-auto max-w-xl px-5 py-8">
      <ScrollTo id={focus} />
      {error && !errorCommunity ? (
        <p role="alert" className="mb-4 text-sm text-clay">
          {error}
        </p>
      ) : null}
      <div className="text-center">
        <p className="text-sm text-muted">Public link for the bio</p>
        <div className="mx-auto mt-4 grid h-16 w-16 place-items-center rounded-full bg-[#f3d2c2] font-display text-2xl">RK</div>
        <h1 className="mt-4 font-display text-5xl tracking-tight">{creator.name}</h1>
        <p className="mt-2 text-lg leading-7">{creator.line}</p>
        <p className="mt-1 text-sm text-muted">
          {creator.handle} · {creator.place} · {creator.audience}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <a href="#latest" className="rounded-full border border-line bg-card px-3 py-1.5 text-sm hover:border-ink">
            Latest film
          </a>
          <a href="#letter" className="rounded-full border border-line bg-card px-3 py-1.5 text-sm hover:border-ink">
            Sunday letter
          </a>
          <a href="#communities" className="rounded-full border border-line bg-card px-3 py-1.5 text-sm hover:border-ink">
            Communities
          </a>
        </div>
        <p id="latest" className="mt-5 text-sm leading-6 text-muted">
          {creator.film}
        </p>
        <p id="letter" className="mt-1 text-sm leading-6 text-muted">
          {creator.letter}
        </p>
        <p className="mt-4 text-sm">
          <a href="#calls" className="underline decoration-line underline-offset-4">
            {snapshot.calls.length === 1 ? "1 call is live" : `${snapshot.calls.length} calls are live`}
          </a>
        </p>
      </div>

      <section id="communities" className="mt-10">
        <h2 className="font-display text-3xl tracking-tight">Join a community</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Pick the interest that fits, then pitch one idea. The desk groups it with the other notes and shows why it
          made the short list.
        </p>
        <div className="mt-4 space-y-4">
          {snapshot.communities.map((community) => {
            const showError = error !== null && errorCommunity === community.id;
            const sent = sentCommunity === community.id;
            return (
              <article
                key={community.id}
                id={community.id}
                className={`scroll-mt-24 rounded-3xl border border-line border-l-4 bg-card p-5 ${ACCENT[community.id] ?? "border-l-ink"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-3xl leading-none tracking-tight">{community.name}</h3>
                  <p className="shrink-0 text-sm text-muted">{community.members.length} fans</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted">{community.line}</p>
                <Facepile people={community.members} />
                {community.joined ? (
                  <>
                    <p className="mt-4 text-sm">Joined as {snapshot.viewer?.name}.</p>
                    {sent ? (
                      <p role="status" className="mt-3 rounded-2xl bg-[#e7f3ec] px-3 py-2 text-sm leading-6">
                        Sent to Rhea&apos;s desk.{" "}
                        <Link href="/desk" className="font-semibold underline">
                          Open the creator desk
                        </Link>
                      </p>
                    ) : null}
                    <p className="mt-3 text-sm">
                      <Link href={`/?sample=1&c=${community.id}#${community.id}`} className="underline decoration-line underline-offset-4">
                        Fill a sample pitch
                      </Link>
                    </p>
                    <PitchForm
                      key={sampleCommunity === community.id ? `${community.id}-sample` : community.id}
                      communityId={community.id}
                      sample={sampleCommunity === community.id}
                    />
                    {showError ? (
                      <p role="alert" className="mt-2 text-sm text-clay">
                        {error}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <form action={joinCommunity} className="mt-4 space-y-3">
                    <input type="hidden" name="communityId" value={community.id} />
                    {snapshot.viewer ? (
                      <p className="text-sm">Join as {snapshot.viewer.name}.</p>
                    ) : (
                      <div>
                        <label htmlFor={`name-${community.id}`} className="text-sm font-medium">
                          Your name
                        </label>
                        <input
                          id={`name-${community.id}`}
                          name="name"
                          required
                          maxLength={40}
                          autoComplete="name"
                          placeholder="Amina Joseph"
                          className="mt-1 w-full rounded-2xl border border-line bg-paper px-3 py-2.5 text-base"
                        />
                      </div>
                    )}
                    {showError ? (
                      <p role="alert" className="text-sm text-clay">
                        {error}
                      </p>
                    ) : null}
                    <SubmitButton pendingLabel="Joining...">Join community</SubmitButton>
                  </form>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section id="calls" className="mt-10 scroll-mt-24">
        <h2 className="font-display text-3xl tracking-tight">Calls from Rhea</h2>
        {posted ? (
          <p role="status" className="mt-2 text-sm text-pine">
            The new call is live.
          </p>
        ) : (
          <p className="mt-2 text-sm leading-6 text-muted">When Rhea accepts a pitch, the call shows up here.</p>
        )}
        <ul className="mt-4 space-y-3">
          {snapshot.calls.map((call) => (
            <li
              key={call.id}
              className={
                call.fresh
                  ? "rounded-3xl border border-pine bg-[#e7f3ec] p-4"
                  : "rounded-3xl border border-line bg-card p-4"
              }
            >
              <p className="text-sm text-muted">
                {call.communityName}
                {call.fresh ? " · New" : ""} · {timeAgo(call.postedAt)}
              </p>
              <p className="mt-1 text-base leading-6">{call.text}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
