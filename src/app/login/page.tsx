import type { Metadata } from "next";
import { requestMagicLink, signInDemo } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { safeNext } from "@/lib/format";
import { readFlash } from "@/server/flash";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string; next?: string }>;
}) {
  const query = await searchParams;
  const next = safeNext(query.next);
  const link = query.notice?.includes("link below") ? await readFlash("fb_magic_link") : null;
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-5xl tracking-tight">Sign in</h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
        The demo works in one click. A magic link creates a real member account. GitHub is available when the app has
        OAuth keys.
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
      {link ? (
        <p className="mt-3 break-all text-sm">
          <a href={link} className="font-medium text-pine">
            {link}
          </a>
        </p>
      ) : null}

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <form action={signInDemo} className="rounded-3xl border border-line bg-card p-5">
          <input type="hidden" name="role" value="member" />
          <input type="hidden" name="next" value={next} />
          <h2 className="font-display text-3xl">Jordan Hale</h2>
          <p className="mt-2 text-sm leading-6 text-muted">Member. Post ideas, vote, comment, and join the work.</p>
          <SubmitButton className="mt-4 rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper">
            Continue as Jordan
          </SubmitButton>
        </form>
        <form action={signInDemo} className="rounded-3xl border border-line bg-card p-5">
          <input type="hidden" name="role" value="creator" />
          <input type="hidden" name="next" value={next} />
          <h2 className="font-display text-3xl">Lena Park</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Creator. Pin an idea, mark it in progress or shipped, and write the daily letter.
          </p>
          <SubmitButton className="mt-4 rounded-full bg-pine px-4 py-2 text-sm font-medium text-paper">
            Open Lena&apos;s desk
          </SubmitButton>
        </form>
      </div>

      <form action={requestMagicLink} className="mt-8 rounded-3xl border border-line bg-card p-5">
        <input type="hidden" name="next" value={next} />
        <h2 className="font-display text-3xl">Email magic link</h2>
        <label className="mt-3 block text-sm font-medium">
          Email
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="mt-1 w-full rounded-2xl border border-line bg-white px-3 py-2 text-sm"
          />
        </label>
        <SubmitButton
          pendingLabel="Sending..."
          className="mt-4 rounded-full border border-ink px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          Email me a link
        </SubmitButton>
      </form>

      <p className="mt-6 text-sm">
        <a href={`/api/auth/github?next=${encodeURIComponent(next)}`} className="font-medium text-pine">
          Continue with GitHub
        </a>
      </p>
    </div>
  );
}
