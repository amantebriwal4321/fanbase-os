import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createCommunity } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { getCurrentUser } from "@/server/auth";
import { readFlash } from "@/server/flash";

export const metadata: Metadata = { title: "New room" };

const field = "mt-1 w-full rounded-2xl border border-line bg-white px-3 py-2 text-sm";

export default async function NewCommunityPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/communities/new");
  const query = await searchParams;
  let draft = { name: "", interest: "", description: "" };
  if (query.error) {
    const raw = await readFlash("fb_room_draft");
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { name?: string; interest?: string; description?: string };
        draft = {
          name: parsed.name || "",
          interest: parsed.interest || "",
          description: parsed.description || "",
        };
      } catch {
        draft = { name: "", interest: "", description: "" };
      }
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-5xl tracking-tight">Start a room</h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        One interest, one creator, one place for ideas. You can post in it as soon as it exists.
      </p>
      {query.error ? (
        <p role="alert" className="mt-4 rounded-2xl border border-clay bg-[#fde8df] px-4 py-3 text-sm text-clay">
          {query.error}
        </p>
      ) : null}
      <form action={createCommunity} className="mt-6 space-y-4">
        <label className="block text-sm font-medium">
          Room name
          <input name="name" required minLength={3} maxLength={60} defaultValue={draft.name} className={field} />
        </label>
        <label className="block text-sm font-medium">
          Interest
          <input
            name="interest"
            required
            minLength={3}
            maxLength={80}
            defaultValue={draft.interest}
            placeholder="What this fanbase is about"
            className={field}
          />
        </label>
        <label className="block text-sm font-medium">
          Description
          <textarea
            name="description"
            required
            minLength={20}
            maxLength={500}
            rows={5}
            defaultValue={draft.description}
            className={field}
          />
        </label>
        <SubmitButton
          pendingLabel="Creating..."
          className="rounded-full bg-pine px-4 py-2 text-sm font-medium text-paper disabled:opacity-60"
        >
          Create room
        </SubmitButton>
      </form>
    </div>
  );
}
