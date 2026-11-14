import { isTopic } from "./rank";
import type { Decision, Delta, DeltaItem, Fan, Join, ReadOverride } from "./types";

const MAX_CHARS = 3500;

export function emptyDelta(): Delta {
  return { fans: [], joins: [], items: [], decisions: [], reads: [] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function fan(value: unknown): Fan | null {
  if (!isRecord(value)) return null;
  const id = text(value.id, 40);
  const name = text(value.name, 40);
  const note = text(value.note, 80);
  const hue = typeof value.hue === "number" && Number.isFinite(value.hue) ? Math.round(value.hue) % 360 : 24;
  if (!/^[a-z0-9-]{4,40}$/.test(id) || name.length < 2) return null;
  return { id, name, note, hue };
}

function join(value: unknown): Join | null {
  if (!isRecord(value)) return null;
  const fanId = text(value.fanId, 40);
  const communityId = text(value.communityId, 40);
  if (!fanId || !communityId) return null;
  return { fanId, communityId };
}

function item(value: unknown): DeltaItem | null {
  if (!isRecord(value)) return null;
  const id = text(value.id, 40);
  const kind = value.kind === "message" ? "message" : value.kind === "pitch" ? "pitch" : null;
  const communityId = text(value.communityId, 40);
  const fanId = text(value.fanId, 40);
  const title = text(value.title, 80);
  const body = text(value.body, 500);
  const createdAt = text(value.createdAt, 40);
  const topic = text(value.topic, 40);
  const summary = text(value.summary, 180);
  const classifySource = value.classifySource === "model" ? "model" : "rules";
  if (!kind || !/^[a-z0-9-]{4,40}$/.test(id) || title.length < 8 || body.length < 20) return null;
  if (Number.isNaN(new Date(createdAt).getTime())) return null;
  return {
    id,
    kind,
    communityId,
    fanId,
    title,
    body,
    createdAt,
    topic: isTopic(topic) ? topic : "Other",
    summary,
    classifySource,
  };
}

function decision(value: unknown): Decision | null {
  if (!isRecord(value)) return null;
  const itemId = text(value.itemId, 40);
  const action = value.action === "accepted" || value.action === "passed" ? value.action : null;
  const cta = text(value.cta, 180);
  const postedAt = text(value.postedAt, 40);
  if (!action || !/^[a-z0-9-]{4,40}$/.test(itemId)) return null;
  if (Number.isNaN(new Date(postedAt).getTime())) return null;
  if (action === "accepted" && cta.length < 20) return null;
  return { itemId, action, cta, postedAt };
}

function read(value: unknown): ReadOverride | null {
  if (!isRecord(value)) return null;
  const itemId = text(value.itemId, 40);
  const topic = text(value.topic, 40);
  const summary = text(value.summary, 180);
  const classifySource = value.classifySource === "model" ? "model" : value.classifySource === "rules" ? "rules" : null;
  if (!classifySource || !isTopic(topic) || !/^[a-z0-9-]{4,40}$/.test(itemId) || summary.length < 12) return null;
  return { itemId, topic, summary, classifySource };
}

function lastBy<T>(rows: T[], key: (row: T) => string): T[] {
  const map = new Map<string, T>();
  for (const row of rows) map.set(key(row), row);
  return [...map.values()];
}

export function normalizeDelta(value: unknown): Delta {
  if (!isRecord(value)) return emptyDelta();
  const fans = lastBy((Array.isArray(value.fans) ? value.fans : []).map(fan).filter((row): row is Fan => Boolean(row)), (row) => row.id);
  const joins = lastBy(
    (Array.isArray(value.joins) ? value.joins : []).map(join).filter((row): row is Join => Boolean(row)),
    (row) => `${row.fanId}:${row.communityId}`,
  );
  const items = lastBy(
    (Array.isArray(value.items) ? value.items : []).map(item).filter((row): row is DeltaItem => Boolean(row)),
    (row) => row.id,
  );
  const decisions = lastBy(
    (Array.isArray(value.decisions) ? value.decisions : []).map(decision).filter((row): row is Decision => Boolean(row)),
    (row) => row.itemId,
  );
  const reads = lastBy(
    (Array.isArray(value.reads) ? value.reads : []).map(read).filter((row): row is ReadOverride => Boolean(row)),
    (row) => row.itemId,
  );
  return { fans, joins, items, decisions, reads };
}

export function parseDelta(raw: string | undefined | null): Delta {
  if (!raw) return emptyDelta();
  try {
    return normalizeDelta(JSON.parse(raw));
  } catch {
    try {
      return normalizeDelta(JSON.parse(decodeURIComponent(raw)));
    } catch {
      return emptyDelta();
    }
  }
}

export function serializeDelta(delta: Delta): string | null {
  const attempts: Delta[] = [
    delta,
    { ...delta, reads: delta.reads.slice(-6) },
    { ...delta, reads: delta.reads.slice(-4), items: delta.items.slice(-4), decisions: delta.decisions.slice(-6) },
  ];
  for (const attempt of attempts) {
    const raw = JSON.stringify(attempt);
    if (raw.length <= MAX_CHARS) return raw;
  }
  return null;
}

export function parseViewer(raw: string | undefined | null): { id: string; name: string } | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as unknown;
    if (!isRecord(value)) return null;
    const id = text(value.id, 40);
    const name = text(value.name, 40);
    if (!/^[a-z0-9-]{4,40}$/.test(id) || name.length < 2) return null;
    return { id, name };
  } catch {
    return null;
  }
}
