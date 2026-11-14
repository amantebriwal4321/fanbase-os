import { isTopic, topicFor, type Topic } from "./rank";
import { cleanLine } from "./text";

export type ClassifyMode = "model" | "rules" | "model_failed";

export type NoteInput = {
  id: string;
  title: string;
  body: string;
};

export type Classified = {
  id: string;
  topic: Topic;
  summary: string;
  source: "rules" | "model";
};

export type ClassifyResult = {
  mode: ClassifyMode;
  items: Classified[];
};

type Provider = {
  kind: "gemini" | "openai";
  key: string;
  model: string;
  base: string;
};

export function modelProvider(): Provider | null {
  const gemini = process.env.GEMINI_API_KEY?.trim();
  if (gemini) {
    return {
      kind: "gemini",
      key: gemini,
      model: process.env.AI_MODEL?.trim() || "gemini-2.5-flash",
      base: "",
    };
  }
  const openai = process.env.OPENAI_API_KEY?.trim() || process.env.AI_API_KEY?.trim();
  if (openai) {
    return {
      kind: "openai",
      key: openai,
      model: process.env.AI_MODEL?.trim() || "gpt-4o-mini",
      base: (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, ""),
    };
  }
  return null;
}

export function hasModelKey(): boolean {
  return Boolean(modelProvider());
}

function rulesFor(note: NoteInput): Classified {
  return {
    id: note.id,
    topic: topicFor(`${note.title}\n${note.body}`),
    summary: "",
    source: "rules",
  };
}

export function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) return raw.slice(start, end + 1);
  return raw;
}

export function parseModelPayload(raw: string, ids: string[]): Record<string, { topic: Topic; summary: string }> | null {
  let data: unknown;
  try {
    data = JSON.parse(extractJson(raw));
  } catch {
    return null;
  }
  const items = Array.isArray(data) ? data : data && typeof data === "object" ? (data as { items?: unknown }).items : null;
  if (!Array.isArray(items)) return null;
  const allowed = new Set(ids);
  const parsed: Record<string, { topic: Topic; summary: string }> = {};
  for (const row of items) {
    if (!row || typeof row !== "object") continue;
    const record = row as { id?: unknown; topic?: unknown; summary?: unknown };
    const id = typeof record.id === "string" ? record.id : "";
    const topic = typeof record.topic === "string" ? record.topic : "";
    const summary = cleanLine(typeof record.summary === "string" ? record.summary : "", 180);
    if (!allowed.has(id) || !isTopic(topic) || summary.length < 12) continue;
    parsed[id] = { topic, summary };
  }
  return Object.keys(parsed).length > 0 ? parsed : null;
}

function promptFor(notes: NoteInput[]): string {
  const list = notes.map((note) => `id: ${note.id}\ntitle: ${note.title}\nbody: ${note.body}`).join("\n\n");
  return [
    "Classify each fan note for Rhea Kapoor, who films home cooking and night food.",
    'Return JSON only: {"items":[{"id":"...","topic":"Night market","summary":"..."}]}',
    "topic must be one of: Night market, Test kitchen, Guest spot, Other.",
    "summary is one short sentence about what the fan wants. Do not score. Do not use em dashes or en dashes.",
    "Include every id.",
    "",
    list,
  ].join("\n");
}

async function complete(provider: Provider, prompt: string): Promise<string> {
  if (provider.kind === "gemini") {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(provider.model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": provider.key,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0, responseMimeType: "application/json" },
        }),
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!response.ok) throw new Error("model request failed");
    const data = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const parts = data.candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts)) throw new Error("model response was empty");
    return parts.map((part) => part.text || "").join("");
  }
  const response = await fetch(`${provider.base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${provider.key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: provider.model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You return only JSON." },
        { role: "user", content: prompt },
      ],
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error("model request failed");
  const data = (await response.json()) as { choices?: { message?: { content?: unknown } }[] };
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new Error("model response was empty");
  return content;
}

export async function classifyNotes(notes: NoteInput[]): Promise<ClassifyResult> {
  const rules = notes.map(rulesFor);
  const provider = modelProvider();
  if (!provider || notes.length === 0) return { mode: "rules", items: rules };
  try {
    const raw = await complete(provider, promptFor(notes));
    const parsed = parseModelPayload(raw, notes.map((note) => note.id));
    if (!parsed) return { mode: "model_failed", items: rules };
    return {
      mode: "model",
      items: rules.map((item) => {
        const update = parsed[item.id];
        if (!update) return item;
        return { id: item.id, topic: update.topic, summary: update.summary, source: "model" as const };
      }),
    };
  } catch {
    return { mode: "model_failed", items: rules };
  }
}

export const GROUP_NOTES = {
  model: "The model renamed the topics and rewrote the summaries. Scores still use the rules.",
  rules: "No model key set. Topics stay on house rules. Scores always use the rules.",
  model_failed: "The model did not answer. Topics stay on house rules.",
} as const;
