"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pendingLabel,
  tone = "primary",
}: {
  children: ReactNode;
  pendingLabel: string;
  tone?: "primary" | "quiet";
}) {
  const { pending } = useFormStatus();
  const className =
    tone === "quiet"
      ? "text-sm text-muted underline decoration-line underline-offset-4 disabled:opacity-60"
      : "inline-flex items-center justify-center rounded-full bg-pine px-4 py-2.5 text-sm font-semibold text-paper disabled:opacity-60";
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingLabel : children}
    </button>
  );
}
