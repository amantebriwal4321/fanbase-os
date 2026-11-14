import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptyDelta, parseDelta, serializeDelta } from "./delta";
import { ERRORS } from "./errors";
import { RANKING_RULES } from "./rank";
import { COMMUNITIES, CREATOR, DEMO_PITCH, FANS } from "./seed";
import { buildSnapshot } from "./view";

const now = new Date("2026-11-14T12:00:00.000Z");
const dash = /[—–]/;

function walk(value: unknown) {
  if (typeof value === "string") assert.equal(dash.test(value), false, value);
  else if (Array.isArray(value)) value.forEach(walk);
  else if (value && typeof value === "object") Object.values(value).forEach(walk);
}

function findNote(snapshot: ReturnType<typeof buildSnapshot>, id: string) {
  return [...snapshot.groups.flatMap((group) => group.notes), ...snapshot.aside].find((note) => note.id === id);
}

describe("seeded desk", () => {
  const snapshot = buildSnapshot(now);

  it("puts three pitches on the desk and keeps the rules visible in the data", () => {
    assert.deepEqual(
      snapshot.surfaced.map((note) => note.id),
      ["p-dosa", "p-curry", "p-map"],
    );
    assert.equal(snapshot.surfaced[0]?.topic, "Night market");
    assert.equal(snapshot.surfaced[0]?.score, 7);
    assert.equal(snapshot.surfaced[1]?.topic, "Test kitchen");
    assert.ok(snapshot.surfaced.every((note) => note.kind === "pitch"));
    assert.match(snapshot.surfaced[0]?.reason ?? "", /other fans are already on this topic/);
    assert.ok((snapshot.surfaced[0]?.chips.length ?? 0) >= 3);
  });

  it("groups pitches and messages by topic and sets spam aside", () => {
    assert.deepEqual(
      snapshot.groups.find((group) => group.topic === "Night market")?.notes.map((note) => note.id),
      ["p-dosa", "p-map", "m-audio"],
    );
    assert.deepEqual(
      snapshot.groups.find((group) => group.topic === "Test kitchen")?.notes.map((note) => note.id),
      ["p-curry", "p-pantry", "m-bakery"],
    );
    assert.deepEqual(
      snapshot.groups.find((group) => group.topic === "Guest spot")?.notes.map((note) => note.id),
      ["p-spice", "m-boat"],
    );
    assert.equal(findNote(snapshot, "m-spam")?.aside, true);
    assert.match(findNote(snapshot, "m-spam")?.reason ?? "", /spam/);
    assert.equal(findNote(snapshot, "m-cheer")?.aside, true);
    assert.equal(findNote(snapshot, "p-spice")?.score, 5);
    assert.equal(snapshot.surfaced.some((note) => note.id === "p-spice"), false);
    assert.equal(snapshot.calls[0]?.id, "p-bowl");
    assert.equal(snapshot.calls[0]?.fresh, false);
    assert.equal(snapshot.communities.find((community) => community.id === "night-market")?.members.length, 4);
  });

  it("keeps user facing copy free of em dashes", () => {
    walk(snapshot);
    walk(CREATOR);
    walk(DEMO_PITCH);
    walk(COMMUNITIES);
    walk(FANS);
    walk(RANKING_RULES);
    walk(ERRORS);
  });
});

describe("fan pitch joins the night market group and takes the top spot", () => {
  it("surfaces the sample pitch first", () => {
    const delta = emptyDelta();
    delta.fans.push({ id: "fan-amina01", name: "Amina Joseph", note: "Joined today", hue: 20 });
    delta.joins.push({ fanId: "fan-amina01", communityId: "night-market" });
    delta.items.push({
      id: "pitch-demo01",
      kind: "pitch",
      communityId: "night-market",
      fanId: "fan-amina01",
      title: DEMO_PITCH.title,
      body: DEMO_PITCH.body,
      createdAt: new Date(now.getTime() - 60_000).toISOString(),
      topic: "Other",
      summary: "",
      classifySource: "rules",
    });
    const snapshot = buildSnapshot(now, delta, { id: "fan-amina01", name: "Amina Joseph" });
    assert.deepEqual(
      snapshot.surfaced.map((note) => note.id),
      ["pitch-demo01", "p-dosa", "p-curry"],
    );
    const night = snapshot.groups.find((group) => group.topic === "Night market");
    assert.ok(night);
    assert.ok((night?.notes.filter((note) => note.kind === "pitch").length ?? 0) >= 3);
    assert.equal(snapshot.communities.find((community) => community.id === "night-market")?.joined, true);

    delta.decisions.push({
      itemId: "pitch-demo01",
      action: "accepted",
      cta: "Night Market Club: map the Fort Kochi stalls before close. Reply here if you can help.",
      postedAt: now.toISOString(),
    });
    const posted = buildSnapshot(now, delta, { id: "fan-amina01", name: "Amina Joseph" });
    assert.equal(posted.calls[0]?.fresh, true);
    assert.match(posted.calls[0]?.text ?? "", /Fort Kochi/);
    assert.equal(posted.surfaced.some((note) => note.id === "pitch-demo01"), false);
    assert.equal(posted.calls.some((call) => call.id === "p-bowl"), true);
  });
});

describe("delta cookie", () => {
  it("drops a corrupt cookie and round trips a small one", () => {
    assert.deepEqual(parseDelta("nope"), emptyDelta());
    assert.deepEqual(parseDelta(undefined), emptyDelta());
    const delta = emptyDelta();
    delta.items.push({
      id: "pitch-demo01",
      kind: "pitch",
      communityId: "night-market",
      fanId: "fan-amina01",
      title: DEMO_PITCH.title,
      body: DEMO_PITCH.body,
      createdAt: now.toISOString(),
      topic: "Night market",
      summary: "",
      classifySource: "rules",
    });
    const raw = serializeDelta(delta);
    assert.ok(raw);
    assert.equal(raw.length <= 3500, true);
    const parsed = parseDelta(raw);
    assert.equal(parsed.items[0]?.title, DEMO_PITCH.title);
    assert.equal(parseDelta('{"items":[{"id":"bad","kind":"pitch"}]}').items.length, 0);
  });
});
