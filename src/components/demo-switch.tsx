"use client";

import { usePathname } from "next/navigation";
import { signInDemo } from "@/app/actions";

const button = "rounded-full border border-ink/15 px-3 py-1.5 text-sm hover:border-ink";

export function DemoSwitch({ memberActive, creatorActive }: { memberActive: boolean; creatorActive: boolean }) {
  const path = usePathname() || "/c/field-notes";
  const next = path.startsWith("/login") ? "/c/field-notes" : path;
  return (
    <div className="flex items-center gap-2">
      <form action={signInDemo}>
        <input type="hidden" name="role" value="member" />
        <input type="hidden" name="next" value={next} />
        <button className={`${button} ${memberActive ? "border-ink bg-ink text-paper" : "bg-card"}`} aria-pressed={memberActive}>
          Demo member
        </button>
      </form>
      <form action={signInDemo}>
        <input type="hidden" name="role" value="creator" />
        <input type="hidden" name="next" value={next} />
        <button className={`${button} ${creatorActive ? "border-ink bg-ink text-paper" : "bg-card"}`} aria-pressed={creatorActive}>
          Demo creator
        </button>
      </form>
    </div>
  );
}
