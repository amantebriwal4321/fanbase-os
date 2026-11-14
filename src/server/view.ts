import { emptyDelta } from "./delta";
import { compareScored, firedRules, isTopic, rankInbox, selectDesk, suggestedCall, TOPICS, type Scored } from "./rank";
import { COMMUNITIES, CREATOR, FANS, JOINS, seedItems } from "./seed";
import { initials } from "./text";
import type { Delta, Fan, ItemStatus, Viewer } from "./types";

export type Person = {
  id: string;
  name: string;
  note: string;
  hue: number;
  initials: string;
};

export type Call = {
  id: string;
  communityId: string;
  communityName: string;
  title: string;
  text: string;
  postedAt: string;
  fresh: boolean;
};

export type Note = {
  id: string;
  kind: "pitch" | "message";
  communityId: string;
  communityName: string;
  fan: Person;
  title: string;
  body: string;
  createdAt: string;
  topic: string;
  summary: string;
  classifySource: "rules" | "model";
  score: number;
  reason: string;
  aside: boolean;
  chips: { id: string; label: string; points: number }[];
  suggested: string;
};

export type Snapshot = {
  creator: typeof CREATOR;
  viewer: Person | null;
  communities: {
    id: string;
    name: string;
    line: string;
    members: Person[];
    joined: boolean;
  }[];
  calls: Call[];
  surfaced: Note[];
  groups: { topic: string; notes: Note[] }[];
  aside: Note[];
  modelCount: number;
  openCount: number;
};

type Live = {
  id: string;
  kind: "pitch" | "message";
  communityId: string;
  fanId: string;
  title: string;
  body: string;
  createdAt: string;
  topic: string;
  summary: string;
  classifySource: "rules" | "model";
  status: ItemStatus;
  cta: string | null;
  postedAt: string | null;
};

function asPerson(fan: Fan): Person {
  return { ...fan, initials: initials(fan.name) };
}

function fanById(fans: Fan[], id: string): Person {
  const fan = fans.find((item) => item.id === id);
  if (fan) return asPerson(fan);
  return { id, name: "Fan", note: "", hue: 24, initials: "?" };
}

function communityName(id: string): string {
  return COMMUNITIES.find((community) => community.id === id)?.name ?? "Community";
}

export function isMember(delta: Delta, fanId: string, communityId: string): boolean {
  return (
    JOINS.some((join) => join.fanId === fanId && join.communityId === communityId) ||
    delta.joins.some((join) => join.fanId === fanId && join.communityId === communityId)
  );
}

export function liveItems(now: Date, delta: Delta): Live[] {
  const reads = new Map(delta.reads.map((read) => [read.itemId, read]));
  const decisions = new Map(delta.decisions.map((decision) => [decision.itemId, decision]));
  const fromSeed = seedItems(now).map((item) => {
    const read = reads.get(item.id);
    const decision = decisions.get(item.id);
    return {
      id: item.id,
      kind: item.kind,
      communityId: item.communityId,
      fanId: item.fanId,
      title: item.title,
      body: item.body,
      createdAt: item.createdAt,
      topic: read?.topic ?? "",
      summary: read?.summary ?? "",
      classifySource: read?.classifySource ?? "rules",
      status: decision?.action ?? item.status,
      cta: decision ? decision.cta || null : item.cta,
      postedAt: decision?.postedAt ?? item.postedAt,
    } satisfies Live;
  });
  const extra = delta.items.map((item) => {
    const read = reads.get(item.id);
    const decision = decisions.get(item.id);
    return {
      id: item.id,
      kind: item.kind,
      communityId: item.communityId,
      fanId: item.fanId,
      title: item.title,
      body: item.body,
      createdAt: item.createdAt,
      topic: read?.topic ?? item.topic,
      summary: read?.summary ?? item.summary,
      classifySource: read?.classifySource ?? item.classifySource,
      status: decision?.action ?? "open",
      cta: decision?.action === "accepted" ? decision.cta : null,
      postedAt: decision?.postedAt ?? null,
    } satisfies Live;
  });
  return [...fromSeed, ...extra];
}

function toNote(item: Live, scored: Scored, fans: Fan[]): Note {
  return {
    id: item.id,
    kind: item.kind,
    communityId: item.communityId,
    communityName: communityName(item.communityId),
    fan: fanById(fans, item.fanId),
    title: item.title,
    body: item.body,
    createdAt: item.createdAt,
    topic: scored.topic,
    summary: item.classifySource === "model" ? item.summary : "",
    classifySource: item.classifySource,
    score: scored.score,
    reason: scored.reason,
    aside: scored.aside,
    chips: firedRules(scored.flags),
    suggested: suggestedCall(item.title),
  };
}

export function buildSnapshot(now: Date, delta: Delta = emptyDelta(), viewer: Viewer | null = null): Snapshot {
  const fans = [...FANS];
  for (const fan of delta.fans) {
    if (!fans.some((item) => item.id === fan.id)) fans.push(fan);
  }
  const joins = [...JOINS];
  for (const join of delta.joins) {
    if (!joins.some((item) => item.fanId === join.fanId && item.communityId === join.communityId)) joins.push(join);
  }
  const items = liveItems(now, delta);
  const open = items.filter((item) => item.status === "open");
  const scored = rankInbox(
    open.map((item) => ({
      id: item.id,
      kind: item.kind,
      title: item.title,
      body: item.body,
      createdAt: item.createdAt,
      topic: item.classifySource === "model" && isTopic(item.topic) ? item.topic : undefined,
    })),
    now,
  );
  const byId = new Map(open.map((item) => [item.id, item]));
  const notes = scored.flatMap((row) => {
    const item = byId.get(row.id);
    return item ? [toNote(item, row, fans)] : [];
  });
  const noteById = new Map(notes.map((note) => [note.id, note]));
  const scoreById = new Map(scored.map((row) => [row.id, row]));
  const surfaced = selectDesk(scored)
    .map((row) => noteById.get(row.id))
    .filter((note): note is Note => Boolean(note));
  const groups = TOPICS.flatMap((topic) => {
    const topicNotes = notes
      .filter((note) => !note.aside && note.topic === topic)
      .sort((a, b) => {
        const left = scoreById.get(a.id);
        const right = scoreById.get(b.id);
        if (!left || !right) return 0;
        return compareScored(left, right);
      });
    return topicNotes.length ? [{ topic, notes: topicNotes }] : [];
  });
  const aside = notes
    .filter((note) => note.aside)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const calls = items
    .filter((item) => item.status === "accepted" && item.cta && item.postedAt)
    .map((item) => ({
      id: item.id,
      communityId: item.communityId,
      communityName: communityName(item.communityId),
      title: item.title,
      text: item.cta || "",
      postedAt: item.postedAt || item.createdAt,
      fresh: now.getTime() - new Date(item.postedAt || item.createdAt).getTime() < 15 * 60 * 1000,
    }))
    .sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());

  return {
    creator: CREATOR,
    viewer: viewer ? fanById(fans, viewer.id) : null,
    communities: COMMUNITIES.map((community) => ({
      ...community,
      members: joins.filter((join) => join.communityId === community.id).map((join) => fanById(fans, join.fanId)),
      joined: Boolean(viewer && joins.some((join) => join.communityId === community.id && join.fanId === viewer.id)),
    })),
    calls,
    surfaced,
    groups,
    aside,
    modelCount: notes.filter((note) => note.classifySource === "model").length,
    openCount: notes.length,
  };
}

export function openForModel(now: Date, delta: Delta): { id: string; title: string; body: string }[] {
  return liveItems(now, delta)
    .filter((item) => item.status === "open")
    .map((item) => ({ id: item.id, title: item.title, body: item.body }));
}
