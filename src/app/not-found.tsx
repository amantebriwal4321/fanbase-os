import Link from "next/link";

export default function NotFound() {
  return (
    <div>
      <h1 className="font-display text-5xl tracking-tight">That page is not in the room.</h1>
      <p className="mt-3 text-sm text-muted">Try Field Notes, the seeded demo.</p>
      <Link href="/c/field-notes" className="mt-6 inline-block rounded-full bg-pine px-4 py-2 text-sm font-medium text-paper">
        Enter Field Notes
      </Link>
    </div>
  );
}
