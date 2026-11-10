"use client";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  void error;
  return (
    <div>
      <h1 className="font-display text-5xl tracking-tight">Something broke.</h1>
      <p className="mt-3 text-sm text-muted">The room did not load. Try again.</p>
      <button onClick={() => reset()} className="mt-6 rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper">
        Try again
      </button>
    </div>
  );
}
