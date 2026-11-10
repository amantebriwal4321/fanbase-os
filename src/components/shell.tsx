import Link from "next/link";
import { signOut } from "@/app/actions";
import { FIELD } from "@/server/seed";
import type { User } from "@/server/types";
import { DemoSwitch } from "./demo-switch";

export function Shell({ user, children }: { user: User | null; children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-card focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <Link href="/" className="font-display text-2xl tracking-tight">
            Fanbase OS
          </Link>
          <nav className="flex flex-wrap items-center gap-2" aria-label="Account">
            <DemoSwitch memberActive={user?.id === FIELD.jordan} creatorActive={user?.id === FIELD.lena} />
            {user ? (
              <>
                <span className="px-1 text-sm text-muted">{user.name}</span>
                <Link href="/communities/new" className="rounded-full px-2 py-1.5 text-sm font-medium hover:bg-card">
                  New room
                </Link>
                <form action={signOut}>
                  <button className="rounded-full px-2 py-1.5 text-sm hover:bg-card">Sign out</button>
                </form>
              </>
            ) : (
              <Link href="/login" className="rounded-full bg-pine px-3 py-1.5 text-sm font-medium text-paper">
                Sign in
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-5xl px-5 py-8">
        {children}
      </main>
      <footer className="mx-auto max-w-5xl px-5 pb-12 text-sm leading-6 text-muted">
        Fanbase OS is a working demo for Persist Startupathon. Field Notes is seeded, so you can use the room
        without an account.
      </footer>
    </div>
  );
}
