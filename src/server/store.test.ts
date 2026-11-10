import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createMemoryRepo } from "./store";
import { FIELD } from "./seed";
import { createSessionToken, readSessionToken } from "./session";

describe("session", () => {
  it("round trips a signed cookie", () => {
    const token = createSessionToken(FIELD.jordan);
    assert.equal(readSessionToken(token), FIELD.jordan);
    assert.equal(readSessionToken(`${token}x`), null);
  });
});

describe("demo room", () => {
  it("supports the core member and creator flow", async () => {
    const repo = createMemoryRepo();
    const room = await repo.getCommunity(FIELD.slug, FIELD.jordan, "all", "");
    assert.ok(room);
    assert.equal(room.community.name, "Field Notes");
    assert.ok(room.ideas.length >= 12);
    assert.ok(room.summary);
    assert.ok(room.clusters.some((cluster) => /night walk/i.test(cluster.label)));

    const freight = await repo.getIdea(FIELD.slug, FIELD.freight, FIELD.jordan);
    assert.ok(freight);
    assert.ok(freight.comments.length >= 2);
    assert.ok(freight.collaborators.some((person) => person.author.id === FIELD.priya));

    const before = freight.idea.votes;
    const voted = await repo.toggleVote(FIELD.slug, FIELD.freight, FIELD.jordan);
    assert.equal(voted.ok, true);
    if (voted.ok) assert.equal(voted.votes, before + 1);
    const removed = await repo.toggleVote(FIELD.slug, FIELD.freight, FIELD.jordan);
    assert.equal(removed.ok, true);
    if (removed.ok) assert.equal(removed.votes, before);

    const spam = await repo.createIdea({
      slug: FIELD.slug,
      authorId: FIELD.jordan,
      title: "BUY FOLLOWERS NOW",
      body: "BUY FOLLOWERS NOW click here http://bit.ly/x free money",
    });
    assert.equal(spam.ok, false);

    const posted = await repo.createIdea({
      slug: FIELD.slug,
      authorId: FIELD.jordan,
      title: "Night walk through the covered market",
      body: "Night walk through the covered market after the stalls close. The tile is still warm. We write down three smells and leave by the east gate.",
    });
    assert.equal(posted.ok, true);
    if (!posted.ok) return;
    const created = await repo.getIdea(FIELD.slug, posted.ideaId, FIELD.jordan);
    assert.ok(created);
    assert.match(created.idea.cluster?.label || "", /night walk/i);

    const comment = await repo.addComment({
      slug: FIELD.slug,
      ideaId: posted.ideaId,
      authorId: FIELD.jordan,
      body: "I can bring a notebook for the three smells.",
    });
    assert.equal(comment.ok, true);
    const joined = await repo.joinIdea({
      slug: FIELD.slug,
      ideaId: FIELD.mic,
      userId: FIELD.jordan,
      note: "I already said I would test a build. Adding a second note.",
    });
    assert.equal(joined.ok, true);

    const denied = await repo.setPinned({
      slug: FIELD.slug,
      ideaId: posted.ideaId,
      actorId: FIELD.jordan,
      pinned: true,
    });
    assert.equal(denied.ok, false);

    const pinned = await repo.setPinned({
      slug: FIELD.slug,
      ideaId: posted.ideaId,
      actorId: FIELD.lena,
      pinned: true,
    });
    assert.equal(pinned.ok, true);
    const stage = await repo.setStage({
      slug: FIELD.slug,
      ideaId: posted.ideaId,
      actorId: FIELD.lena,
      stage: "in_progress",
    });
    assert.equal(stage.ok, true);

    const brief = await repo.writeBrief(FIELD.slug, FIELD.lena);
    assert.equal(brief.ok, true);
    const letter = await repo.getSummary(FIELD.slug, FIELD.lena);
    assert.ok(letter);
    assert.match(letter.summaries[0].body, /covered market/i);
    assert.equal(letter.summaries[0].source, "fallback");

    const memberBrief = await repo.writeBrief(FIELD.slug, FIELD.jordan);
    assert.equal(memberBrief.ok, false);

    const restored = await repo.restoreDemo(FIELD.jordan);
    assert.equal(restored.ok, false);
    const reset = await repo.restoreDemo(FIELD.lena);
    assert.equal(reset.ok, true);
    const after = await repo.getIdea(FIELD.slug, posted.ideaId, null);
    assert.equal(after, null);
    const home = await repo.home();
    assert.equal(home.field?.ideaCount, 12);
  });

  it("lets a new person join by email and start a room", async () => {
    const repo = createMemoryRepo();
    const token = await repo.createMagicToken("newfan@fieldnotes.example");
    const first = await repo.consumeMagicToken(token);
    assert.equal(first?.email, "newfan@fieldnotes.example");
    assert.equal(await repo.consumeMagicToken(token), null);
    const user = await repo.upsertFromLogin({
      email: "newfan@fieldnotes.example",
      name: "New Fan",
      handle: "newfan",
      joinSlug: FIELD.slug,
    });
    const posted = await repo.createIdea({
      slug: FIELD.slug,
      authorId: user.id,
      title: "Make kit: cloth patch",
      body: "Make a cloth patch kit with the Field Notes mark, stitched in two colors, small enough for a jacket pocket.",
    });
    assert.equal(posted.ok, true);
    const created = await repo.createCommunity({
      creatorId: user.id,
      name: "Dawn Shift",
      interest: "Early morning routines",
      description: "A small room for people who are awake before the city is.",
    });
    assert.equal(created.ok, true);
    if (created.ok) {
      const room = await repo.getCommunity(created.slug, user.id, "all", "");
      assert.equal(room?.viewerIsCreator, true);
      assert.equal(room?.ideaCount, 0);
    }
  });
});
