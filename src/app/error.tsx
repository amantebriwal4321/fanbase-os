"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-5 py-16">
      <h1 className="font-display text-5xl tracking-tight">Something broke.</h1>
      <p className="mt-3 text-sm leading-6 text-muted">The page did not load. Try again.</p>
      <button type="button" onClick={() => reset()} className="mt-6 rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper">
        Try again
      </button>
    </div>
  );
}
