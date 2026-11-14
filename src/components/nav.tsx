"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteNav() {
  const path = usePathname();
  const desk = path.startsWith("/desk");
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-3">
        <Link href="/" className="font-display text-2xl tracking-tight">
          Fanbase OS
        </Link>
        <nav aria-label="Views" className="flex items-center gap-1">
          <Link
            href="/"
            aria-current={desk ? undefined : "page"}
            className={desk ? "rounded-full px-3 py-1.5 text-sm hover:bg-card" : "rounded-full bg-ink px-3 py-1.5 text-sm text-paper"}
          >
            Public hub
          </Link>
          <Link
            href="/desk"
            aria-current={desk ? "page" : undefined}
            className={desk ? "rounded-full bg-ink px-3 py-1.5 text-sm text-paper" : "rounded-full px-3 py-1.5 text-sm hover:bg-card"}
          >
            Creator desk
          </Link>
        </nav>
      </div>
    </header>
  );
}
