import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clusterIdeasFallback, hardScreenIdea, moderateIdea } from "./ai";
import { buildSeed, FIELD } from "./seed";

const market = {
  id: "idea_market",
  title: "Night walk through the covered market",
  body: "Night walk through the covered market after the stalls close. The tile is still warm. We write down three smells and leave by the east gate.",
};

describe("house filter", () => {
  it("blocks spam and thin posts", async () => {
    const spam = await moderateIdea({
      interest: "city walks",
      title: "BUY FOLLOWERS NOW",
      body: "BUY FOLLOWERS NOW click here http://bit.ly/free money for fans",
      existing: [],
    });
    assert.equal(spam.ok, false);
    assert.match(spam.reason, /spam/i);

    const thin = await moderateIdea({
      interest: "city walks",
      title: "Cool idea",
      body: "It would be really cool if we did something fun for the fans sometime.",
      existing: [],
    });
    assert.equal(thin.ok, false);
  });

  it("keeps a concrete idea and rejects a copy", async () => {
    const seed = buildSeed();
    const existing = seed.ideas.map((idea) => ({ title: idea.title, body: idea.body }));
    const kept = await moderateIdea({
      interest: "city walks",
      title: market.title,
      body: market.body,
      existing,
    });
    assert.equal(kept.ok, true);
    assert.equal(kept.source, "fallback");

    const copy = hardScreenIdea("Night walk on the freight spur", seed.ideas[0].body, existing);
    assert.equal(copy.ok, false);
  });
});

describe("clustering", () => {
  it("groups the seeded room by shared phrases", () => {
    const seed = buildSeed();
    const clusters = clusterIdeasFallback(seed.ideas.map((idea) => ({ id: idea.id, title: idea.title, body: idea.body })));
    const of = (id: string) => clusters.find((cluster) => cluster.ideaIds.includes(id));
    assert.equal(of(FIELD.freight), of(FIELD.river));
    assert.equal(of(FIELD.freight), of(FIELD.lit));
    assert.notEqual(of(FIELD.freight), of(FIELD.bakery));
    assert.notEqual(of(FIELD.freight), of(FIELD.saturday));
    assert.equal(of(FIELD.notebook), of(FIELD.mic));
    assert.equal(of(FIELD.notebook), of(FIELD.zine));
    assert.equal(of(FIELD.bakery), of(FIELD.ferry));
    assert.equal(of(FIELD.bakery), of(FIELD.garden));
    assert.match(of(FIELD.freight)?.label || "", /night walk/i);
    assert.match(of(FIELD.notebook)?.label || "", /make kit/i);
    assert.match(of(FIELD.bakery)?.label || "", /episode pitch/i);
  });

  it("puts a new night walk with the night walks", () => {
    const seed = buildSeed();
    const clusters = clusterIdeasFallback([
      ...seed.ideas.map((idea) => ({ id: idea.id, title: idea.title, body: idea.body })),
      market,
    ]);
    const of = (id: string) => clusters.find((cluster) => cluster.ideaIds.includes(id));
    assert.equal(of(market.id), of(FIELD.freight));
  });
});
