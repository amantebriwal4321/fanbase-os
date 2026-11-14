"use client";

import { useActionState } from "react";
import { sendPitch, type PitchState } from "@/app/actions";
import { DEMO_PITCH } from "@/server/seed";
import { SubmitButton } from "./submit-button";

export function PitchForm({ communityId, sample }: { communityId: string; sample: boolean }) {
  const [state, action] = useActionState(sendPitch, null as PitchState);
  return (
    <form action={action} className="mt-4 space-y-3">
      <input type="hidden" name="communityId" value={communityId} />
      <div>
        <label htmlFor={`title-${communityId}`} className="text-sm font-medium">
          Idea title
        </label>
        <input
          id={`title-${communityId}`}
          name="title"
          required
          minLength={8}
          maxLength={80}
          defaultValue={state?.title ?? (sample ? DEMO_PITCH.title : "")}
          placeholder="A short title"
          className="mt-1 w-full rounded-2xl border border-line bg-paper px-3 py-2.5 text-base placeholder:text-muted/80"
        />
      </div>
      <div>
        <label htmlFor={`body-${communityId}`} className="text-sm font-medium">
          What should the community do?
        </label>
        <textarea
          id={`body-${communityId}`}
          name="body"
          required
          minLength={40}
          maxLength={500}
          rows={4}
          defaultValue={state?.body ?? (sample ? DEMO_PITCH.body : "")}
          placeholder="Where, when, and what should Rhea do?"
          className="mt-1 w-full rounded-2xl border border-line bg-paper px-3 py-2.5 text-base leading-6 placeholder:text-muted/80"
        />
      </div>
      {state?.error ? (
        <p role="alert" className="text-sm text-clay">
          {state.error}
        </p>
      ) : null}
      <SubmitButton pendingLabel="Sending...">Send pitch</SubmitButton>
    </form>
  );
}
