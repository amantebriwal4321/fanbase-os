"use client";

import { useActionState } from "react";
import { postCall, type CallState } from "@/app/actions";
import { SubmitButton } from "./submit-button";

export function CallForm({
  itemId,
  suggested,
  communityName,
}: {
  itemId: string;
  suggested: string;
  communityName: string;
}) {
  const [state, action] = useActionState(postCall, null as CallState);
  return (
    <form action={action} className="mt-4 space-y-3">
      <input type="hidden" name="itemId" value={itemId} />
      <div>
        <label htmlFor={`cta-${itemId}`} className="text-sm font-medium">
          Call to action
        </label>
        <textarea
          id={`cta-${itemId}`}
          name="cta"
          required
          minLength={20}
          maxLength={180}
          rows={3}
          defaultValue={state?.cta ?? suggested}
          className="mt-1 w-full rounded-2xl border border-line bg-paper px-3 py-2.5 text-base leading-6"
        />
      </div>
      {state?.error ? (
        <p role="alert" className="text-sm text-clay">
          {state.error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingLabel="Posting...">Post to {communityName}</SubmitButton>
      </div>
    </form>
  );
}
