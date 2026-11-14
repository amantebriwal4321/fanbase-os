export const ERRORS = {
  name: "Use your name so Rhea knows who pitched.",
  title: "Give the idea a title, between 8 and 80 characters.",
  body: "Say what to do next, and add one concrete detail.",
  join: "Join this community before you pitch.",
  call: "Write the call in one or two sentences.",
  pitch: "Only a pitch can be accepted.",
  missing: "That note is not on the desk anymore.",
  full: "This browser session is full. Reset the demo on the creator desk.",
  community: "That community is not on the hub.",
} as const;

export type ErrorCode = keyof typeof ERRORS;

export function errorText(code: string | undefined): string | null {
  if (!code || !(code in ERRORS)) return null;
  return ERRORS[code as ErrorCode];
}
