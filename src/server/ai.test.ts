import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyNotes, GROUP_NOTES, parseModelPayload } from "./ai";

const KEYS = ["GEMINI_API_KEY", "OPENAI_API_KEY", "AI_API_KEY", "AI_MODEL", "AI_BASE_URL"] as const;

async function withEnv(values: Partial<Record<(typeof KEYS)[number], string>>, run: () => Promise<void>) {
  const previous = new Map(KEYS.map((key) => [key, process.env[key]]));
  for (const key of KEYS) {
    const next = values[key];
    if (next === undefined) delete process.env[key];
    else process.env[key] = next;
  }
  try {
    await run();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

const dosa = {
  id: "p-dosa",
  title: "Film the 11pm dosa cart on Princess Street",
  body: "Can you film the dosa cart on Princess Street this Thursday at 11pm? The cook will talk if you stay for one order.",
};

describe("model fallback", () => {
  it("parses a fenced payload and ignores a bad topic", () => {
    const parsed = parseModelPayload(
      '```json\n{"items":[{"id":"p-dosa","topic":"Night market","summary":"Kabir wants a Thursday film at the dosa cart."},{"id":"p-map","topic":"Nope","summary":"Too short"}]}\n```',
      ["p-dosa", "p-map"],
    );
    assert.deepEqual(parsed?.["p-dosa"], {
      topic: "Night market",
      summary: "Kabir wants a Thursday film at the dosa cart.",
    });
    assert.equal(parsed?.["p-map"], undefined);
    assert.equal(parseModelPayload("hello", ["p-dosa"]), null);
    walkGroupNotes();
  });

  it("does not call the network when no key is set", async () => {
    await withEnv({}, async () => {
      let called = false;
      const original = globalThis.fetch;
      globalThis.fetch = async () => {
        called = true;
        throw new Error("network");
      };
      try {
        const result = await classifyNotes([dosa]);
        assert.equal(result.mode, "rules");
        assert.equal(result.items[0]?.topic, "Night market");
        assert.equal(result.items[0]?.source, "rules");
        assert.equal(called, false);
      } finally {
        globalThis.fetch = original;
      }
    });
  });

  it("uses Gemini when that key is set, and falls back if the model answer is junk", async () => {
    await withEnv({ GEMINI_API_KEY: "test-gemini", OPENAI_API_KEY: "test-openai" }, async () => {
      const original = globalThis.fetch;
      let url = "";
      globalThis.fetch = async (input) => {
        url = String(input);
        return new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        items: [{ id: "p-dosa", topic: "Night market", summary: "Kabir wants the Thursday dosa cart film." }],
                      }),
                    },
                  ],
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      };
      try {
        const result = await classifyNotes([dosa]);
        assert.match(url, /generativelanguage\.googleapis\.com/);
        assert.equal(url.includes("test-openai"), false);
        assert.equal(result.mode, "model");
        assert.equal(result.items[0]?.source, "model");
        assert.match(result.items[0]?.summary ?? "", /dosa cart/);
      } finally {
        globalThis.fetch = original;
      }
    });

    await withEnv({ OPENAI_API_KEY: "test-openai" }, async () => {
      const original = globalThis.fetch;
      globalThis.fetch = async () => new Response("nope", { status: 200 });
      try {
        const result = await classifyNotes([dosa]);
        assert.equal(result.mode, "model_failed");
        assert.equal(result.items[0]?.source, "rules");
        assert.equal(result.items[0]?.topic, "Night market");
      } finally {
        globalThis.fetch = original;
      }
    });
  });
});

function walkGroupNotes() {
  for (const note of Object.values(GROUP_NOTES)) assert.equal(/[—–]/.test(note), false);
}
