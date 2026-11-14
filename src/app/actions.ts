"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { classifyNotes } from "@/server/ai";
import { ERRORS } from "@/server/errors";
import { communityById } from "@/server/seed";
import { clearSession, readSession, writeDelta, writeViewer } from "@/server/store";
import { cleanBody, cleanLine, hueFromName } from "@/server/text";
import type { Delta, Viewer } from "@/server/types";
import { isMember, liveItems, openForModel } from "@/server/view";

export type PitchState = { error: string; title: string; body: string } | null;
export type CallState = { error: string; cta: string } | null;

function refresh() {
  revalidatePath("/");
  revalidatePath("/desk");
}

function ensureFan(delta: Delta, viewer: Viewer) {
  if (delta.fans.some((fan) => fan.id === viewer.id)) return;
  delta.fans.push({
    id: viewer.id,
    name: viewer.name,
    note: "Joined today",
    hue: hueFromName(viewer.name),
  });
}

function cleanName(input: string): string | null {
  const name = cleanLine(input, 40);
  if (!/^[\p{L}][\p{L}\s.'-]{1,39}$/u.test(name)) return null;
  return name;
}

export async function joinCommunity(formData: FormData) {
  const communityId = String(formData.get("communityId") || "");
  if (!communityById(communityId)) redirect(`/?e=community`);
  const session = await readSession();
  const delta = session.delta;
  let viewer = session.viewer;
  if (!viewer) {
    const name = cleanName(String(formData.get("name") || ""));
    if (!name) redirect(`/?e=name&c=${communityId}#${communityId}`);
    viewer = { id: `fan-${randomBytes(4).toString("hex")}`, name };
    await writeViewer(viewer);
  }
  ensureFan(delta, viewer);
  if (!isMember(delta, viewer.id, communityId)) {
    delta.joins.push({ fanId: viewer.id, communityId });
  }
  if (!(await writeDelta(delta))) redirect(`/?e=full&c=${communityId}#${communityId}`);
  refresh();
  redirect(`/?c=${communityId}#${communityId}`);
}

export async function sendPitch(_prev: PitchState, formData: FormData): Promise<PitchState> {
  const communityId = String(formData.get("communityId") || "");
  const title = cleanLine(String(formData.get("title") || ""), 80);
  const body = cleanBody(String(formData.get("body") || ""), 500);
  if (!communityById(communityId)) return { error: ERRORS.community, title, body };
  if (title.length < 8 || title.length > 80) return { error: ERRORS.title, title, body };
  if (body.length < 40 || body.length > 500) return { error: ERRORS.body, title, body };
  const session = await readSession();
  const viewer = session.viewer;
  if (!viewer || !isMember(session.delta, viewer.id, communityId)) {
    return { error: ERRORS.join, title, body };
  }
  const delta = session.delta;
  ensureFan(delta, viewer);
  delta.items.push({
    id: `pitch-${randomBytes(4).toString("hex")}`,
    kind: "pitch",
    communityId,
    fanId: viewer.id,
    title,
    body,
    createdAt: new Date().toISOString(),
    topic: "Other",
    summary: "",
    classifySource: "rules",
  });
  if (!(await writeDelta(delta))) return { error: ERRORS.full, title, body };
  refresh();
  redirect(`/?sent=1&c=${communityId}#${communityId}`);
}

export async function postCall(_prev: CallState, formData: FormData): Promise<CallState> {
  const itemId = String(formData.get("itemId") || "");
  const cta = cleanLine(String(formData.get("cta") || ""), 180);
  if (!/^[a-z0-9-]{4,40}$/.test(itemId)) return { error: ERRORS.missing, cta };
  if (cta.length < 20 || cta.length > 180) return { error: ERRORS.call, cta };
  const session = await readSession();
  const item = liveItems(new Date(), session.delta).find((note) => note.id === itemId);
  if (!item || item.status !== "open") return { error: ERRORS.missing, cta };
  if (item.kind !== "pitch") return { error: ERRORS.pitch, cta };
  const delta = session.delta;
  delta.decisions = delta.decisions.filter((decision) => decision.itemId !== itemId);
  delta.decisions.push({ itemId, action: "accepted", cta, postedAt: new Date().toISOString() });
  if (!(await writeDelta(delta))) return { error: ERRORS.full, cta };
  refresh();
  redirect("/?posted=1#calls");
}

export async function passNote(formData: FormData) {
  const itemId = String(formData.get("itemId") || "");
  if (!/^[a-z0-9-]{4,40}$/.test(itemId)) redirect("/desk?e=missing");
  const session = await readSession();
  const item = liveItems(new Date(), session.delta).find((note) => note.id === itemId);
  if (!item || item.status !== "open") redirect("/desk?e=missing");
  const delta = session.delta;
  delta.decisions = delta.decisions.filter((decision) => decision.itemId !== itemId);
  delta.decisions.push({ itemId, action: "passed", cta: "", postedAt: new Date().toISOString() });
  if (!(await writeDelta(delta))) redirect("/desk?e=full");
  refresh();
  redirect("/desk");
}

export async function groupAgain() {
  const session = await readSession();
  const now = new Date();
  const result = await classifyNotes(openForModel(now, session.delta));
  if (result.mode === "model") {
    session.delta.reads = result.items
      .filter((item) => item.source === "model")
      .map((item) => ({
        itemId: item.id,
        topic: item.topic,
        summary: item.summary,
        classifySource: "model" as const,
      }));
    if (!(await writeDelta(session.delta))) redirect("/desk?grouped=model_failed&e=full");
  }
  refresh();
  redirect(`/desk?grouped=${result.mode}`);
}

export async function resetDemo() {
  await clearSession();
  refresh();
  redirect("/");
}
