import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-5 py-16">
      <h1 className="font-display text-5xl tracking-tight">That page is not here.</h1>
      <p className="mt-3 text-sm text-muted">Rhea&apos;s hub is the public link.</p>
      <Link href="/" className="mt-6 inline-block rounded-full bg-pine px-4 py-2 text-sm font-medium text-paper">
        Back to the hub
      </Link>
    </div>
  );
}
