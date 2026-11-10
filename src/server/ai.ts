import type { ClusterDraft, Moderation } from "./types";

// One module for the three model jobs: filter posts, group similar ideas,
// and write the creator's daily letter. If no API key is set, or the call
// fails, each function uses the deterministic house rules below.

const STOP = new Set(
  `a an the and or of to for in on at by with from into over after before about as is are was were be been being it this that these those we you they i our your their my me us not just more most other some any can will would should could may might than then so if but also very really out up down each per via when while who what have has had do did does its let too all own same such only one two how why now new get got off onto within without across`.split(
    /\s+/,
  ),
);

const VAGUE = new Set(
  `something someone everyone really amazing awesome interesting together maybe please people things stuff great cool nice idea ideas think would could should community creator fans fan just very thing stuff kinda sort actually basically literally`.split(
    /\s+/,
  ),
);

const SPAM = [
  /buy\s+followers/i,
  /click here/i,
  /free money/i,
  /earn cash/i,
  /limited time offer/i,
  /work from home/i,
  /bit\.ly/i,
  /tinyurl/i,
  /viagra/i,
  /online casino/i,
  /seo services/i,
  /subscribe to my/i,
  /dm me for/i,
  /double your/i,
  /100%\s*free/i,
  /act now/i,
  /crypto airdrop/i,
  /buy crypto/i,
];

export type IdeaText = { id: string; title: string; body: string };

type AiConfig = { key: string; base: string; model: string };

function aiConfig(): AiConfig {
  const key = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || "";
  const base = (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.AI_MODEL || "gpt-4o-mini";
  return { key, base, model };
}

export function hasModelKey(): boolean {
  return Boolean(aiConfig().key);
}

function plain(text: string, max: number): string {
  return text.replace(/[—–]/g, ", ").replace(/[ \t]+\n/g, "\n").trim().slice(0, max);
}

function contentTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !STOP.has(token) && !/^\d+$/.test(token));
}

function bigrams(text: string): string[] {
  const tokens = contentTokens(text);
  const grams: string[] = [];
  for (let i = 0; i < tokens.length - 1; i += 1) {
    grams.push(`${tokens[i]} ${tokens[i + 1]}`);
  }
  return grams;
}

function asSet(values: string[]): Set<string> {
  return new Set(values);
}

function overlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const token of a) if (b.has(token)) shared += 1;
  return shared / Math.min(a.size, b.size);
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let shared = 0;
  for (const token of a) if (b.has(token)) shared += 1;
  const union = a.size + b.size - shared;
  return union === 0 ? 0 : shared / union;
}

function spamReason(text: string): string | null {
  if (SPAM.some((pattern) => pattern.test(text))) {
    return "Blocked by house rules. This looks like spam or a pitch for something else.";
  }
  const urls = text.match(/https?:\/\/|www\./gi);
  if (urls && urls.length > 2) {
    return "Blocked by house rules. Too many links.";
  }
  if (/(.)\1{7,}/.test(text)) {
    return "Blocked by house rules. This looks like noise.";
  }
  const letters = text.replace(/[^A-Za-z]/g, "");
  if (letters.length > 12 && letters === letters.toUpperCase()) {
    return "Blocked by house rules. Please write in normal case.";
  }
  return null;
}

function specificTokens(text: string): string[] {
  return [...asSet(contentTokens(text))].filter((token) => token.length >= 5 && !VAGUE.has(token));
}

export function hardScreenIdea(
  title: string,
  body: string,
  existing: { title: string; body: string }[],
): { ok: true } | { ok: false; reason: string } {
  const cleanTitle = title.trim();
  const cleanBody = body.trim();
  if (cleanTitle.length < 8 || cleanTitle.length > 80) {
    return { ok: false, reason: "Use a title between 8 and 80 characters." };
  }
  if (cleanBody.length < 40 || cleanBody.length > 2000) {
    return {
      ok: false,
      reason: "Blocked by house rules. Say what you want the community to do, and add one concrete detail.",
    };
  }
  const spam = spamReason(`${cleanTitle}\n${cleanBody}`);
  if (spam) return { ok: false, reason: spam };

  const titleBag = asSet(contentTokens(cleanTitle));
  const bag = asSet(contentTokens(`${cleanTitle} ${cleanBody}`));
  for (const idea of existing) {
    const otherTitle = asSet(contentTokens(idea.title));
    if (titleBag.size > 0 && jaccard(titleBag, otherTitle) >= 0.82) {
      return { ok: false, reason: `This is too close to "${idea.title}", which is already in the room.` };
    }
    const other = asSet(contentTokens(`${idea.title} ${idea.body}`));
    if (jaccard(bag, other) >= 0.72) {
      return { ok: false, reason: `This is too close to "${idea.title}", which is already in the room.` };
    }
  }
  return { ok: true };
}

function fallbackQuality(title: string, body: string): Moderation {
  const specific = specificTokens(`${title} ${body}`);
  if (specific.length < 3) {
    return {
      ok: false,
      reason: "Blocked by house rules. Add a concrete place, object, or step so people can act on it.",
      qualityScore: 0.25,
      source: "fallback",
    };
  }
  let score = 0.55;
  if (specific.length >= 6) score += 0.15;
  if (/\d/.test(`${title} ${body}`)) score += 0.1;
  if (body.trim().length >= 120) score += 0.1;
  return {
    ok: true,
    reason: "Kept by house rules. It names a concrete plan and does not copy an open idea.",
    qualityScore: Math.min(0.95, score),
    source: "fallback",
  };
}

async function completeJSON(system: string, user: string): Promise<unknown | null> {
  const { key, base, model } = aiConfig();
  if (!key) return null;
  try {
    const response = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const text = payload.choices?.[0]?.message?.content;
    if (!text) return null;
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function parseModeration(value: unknown): Omit<Moderation, "source"> | null {
  if (!value || typeof value !== "object") return null;
  const record = value as { ok?: unknown; reason?: unknown; qualityScore?: unknown };
  if (typeof record.ok !== "boolean" || typeof record.reason !== "string") return null;
  const reason = plain(record.reason, 280);
  if (!reason) return null;
  const score =
    typeof record.qualityScore === "number" && Number.isFinite(record.qualityScore)
      ? Math.min(1, Math.max(0, record.qualityScore))
      : record.ok
        ? 0.75
        : 0.2;
  return { ok: record.ok, reason, qualityScore: score };
}

export async function moderateIdea(input: {
  interest: string;
  title: string;
  body: string;
  existing: { title: string; body: string }[];
}): Promise<Moderation> {
  const hard = hardScreenIdea(input.title, input.body, input.existing);
  if (!hard.ok) {
    return { ok: false, reason: hard.reason, qualityScore: 0.1, source: "fallback" };
  }
  const llm = parseModeration(
    await completeJSON(
      "You moderate idea posts in a fan community. Reject spam, insults, scams, and posts with no usable idea. Keep a post when it proposes something the community could actually do. Return JSON with keys ok (boolean), reason (one plain sentence), and qualityScore (number from 0 to 1). Do not use em dashes or en dashes.",
      `Interest: ${input.interest}\nTitle: ${input.title.trim()}\nBody: ${input.body.trim()}`,
    ),
  );
  if (llm) return { ...llm, source: "llm" };
  return fallbackQuality(input.title, input.body);
}

export function screenNote(text: string): { ok: true } | { ok: false; reason: string } {
  const clean = text.trim();
  if (!clean) return { ok: true };
  if (clean.length > 800) return { ok: false, reason: "Keep this under 800 characters." };
  const spam = spamReason(clean);
  if (spam) return { ok: false, reason: spam };
  return { ok: true };
}

function sentenceLabel(phrase: string): string {
  const clean = phrase.trim();
  if (!clean) return "Other ideas";
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function scorePair(a: IdeaText, b: IdeaText): number {
  const tokenScore = overlap(asSet(contentTokens(`${a.title} ${a.body}`)), asSet(contentTokens(`${b.title} ${b.body}`)));
  const gramsA = asSet(bigrams(`${a.title} ${a.body}`));
  const gramsB = asSet(bigrams(`${b.title} ${b.body}`));
  let shared = false;
  for (const gram of gramsA) {
    if (gramsB.has(gram)) {
      shared = true;
      break;
    }
  }
  return tokenScore + (shared ? 0.6 : 0);
}

function labelFor(group: IdeaText[]): { label: string; summary: string } {
  if (group.length === 1) {
    const titleGrams = bigrams(group[0].title);
    const label = sentenceLabel(titleGrams[0] || group[0].title);
    return { label, summary: `One idea: "${group[0].title}".` };
  }
  const sets = group.map((idea) => asSet(bigrams(`${idea.title} ${idea.body}`)));
  const common = [...sets[0]].filter((gram) => sets.every((set) => set.has(gram))).sort();
  let label = common[0] ? sentenceLabel(common[0]) : "";
  if (!label) {
    const counts = new Map<string, number>();
    for (const idea of group) {
      for (const token of new Set(contentTokens(idea.title))) {
        counts.set(token, (counts.get(token) || 0) + 1);
      }
    }
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    label = sentenceLabel(top?.[0] || "Other ideas");
  }
  const names = group.slice(0, 2).map((idea) => idea.title);
  const summary = `${group.length} ideas around ${label.toLowerCase()}, including "${names[0]}" and "${names[1]}".`;
  return { label, summary };
}

export function clusterIdeasFallback(ideas: IdeaText[]): ClusterDraft[] {
  const ordered = [...ideas].sort((a, b) => a.id.localeCompare(b.id));
  const groups: IdeaText[][] = [];
  for (const idea of ordered) {
    let bestIndex = -1;
    let bestScore = 0;
    groups.forEach((group, index) => {
      const score = group.reduce((sum, member) => sum + scorePair(idea, member), 0) / group.length;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });
    if (bestIndex >= 0 && bestScore >= 0.55) groups[bestIndex].push(idea);
    else groups.push([idea]);
  }
  return groups
    .map((group) => {
      const text = labelFor(group);
      return { label: text.label, summary: text.summary, ideaIds: group.map((idea) => idea.id) };
    })
    .sort((a, b) => b.ideaIds.length - a.ideaIds.length || a.label.localeCompare(b.label));
}

function parseClusters(value: unknown, ids: string[]): ClusterDraft[] | null {
  if (!value || typeof value !== "object") return null;
  const clusters = (value as { clusters?: unknown }).clusters;
  if (!Array.isArray(clusters)) return null;
  const drafts: ClusterDraft[] = [];
  for (const item of clusters) {
    if (!item || typeof item !== "object") return null;
    const record = item as { label?: unknown; summary?: unknown; ideaIds?: unknown };
    if (typeof record.label !== "string" || typeof record.summary !== "string" || !Array.isArray(record.ideaIds)) {
      return null;
    }
    if (!record.ideaIds.every((id) => typeof id === "string")) return null;
    const label = plain(record.label, 40);
    const summary = plain(record.summary, 240);
    if (label.length < 2 || summary.length < 2) return null;
    drafts.push({ label, summary, ideaIds: record.ideaIds });
  }
  const flat = drafts.flatMap((draft) => draft.ideaIds);
  if (flat.length !== ids.length || new Set(flat).size !== ids.length) return null;
  if (!ids.every((id) => flat.includes(id))) return null;
  return drafts;
}

export async function clusterIdeas(input: { interest: string; ideas: IdeaText[] }): Promise<{
  clusters: ClusterDraft[];
  source: "llm" | "fallback";
}> {
  const fallback = clusterIdeasFallback(input.ideas);
  if (input.ideas.length === 0 || input.ideas.length > 40 || !aiConfig().key) {
    return { clusters: fallback, source: "fallback" };
  }
  const listing = input.ideas.map((idea) => `${idea.id} | ${idea.title} | ${idea.body}`).join("\n");
  const parsed = parseClusters(
    await completeJSON(
      "Group fan ideas that propose a similar thing. Use 2 to 6 clusters. Every idea id must appear once. Return JSON: {\"clusters\":[{\"label\":\"2 to 4 words\",\"summary\":\"one sentence\",\"ideaIds\":[\"id\"]}]}. Do not use em dashes or en dashes.",
      `Interest: ${input.interest}\nIdeas:\n${listing}`,
    ),
    input.ideas.map((idea) => idea.id),
  );
  if (!parsed) return { clusters: fallback, source: "fallback" };
  return { clusters: parsed, source: "llm" };
}

export type BriefIdea = IdeaText & {
  votes: number;
  stage: string;
  pinned: boolean;
  clusterLabel: string | null;
};

export function fallbackBrief(input: {
  communityName: string;
  ideas: (BriefIdea & { createdAt?: string })[];
}): { headline: string; body: string } {
  const ranked = [...input.ideas].sort((a, b) => b.votes - a.votes || Number(b.pinned) - Number(a.pinned));
  const top = ranked.slice(0, 3);
  const fresh = [...input.ideas].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))[0];
  const groups = new Map<string, number>();
  for (const idea of input.ideas) {
    const key = idea.clusterLabel || "Ungrouped";
    groups.set(key, (groups.get(key) || 0) + 1);
  }
  const themes = [...groups.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([label, count]) => `${label.toLowerCase()} (${count})`)
    .join(", ");
  const headline = top[0] ? `${top[0].title} is leading ${input.communityName}` : `${input.communityName} is quiet today`;
  const topLine = top.length
    ? `Top ideas right now: ${top.map((idea) => `"${idea.title}" with ${idea.votes} votes`).join(", ")}.`
    : "No ideas yet. The letter will fill in once members post.";
  const newestLine = fresh ? `Newest post: "${fresh.title}".` : "Nothing new yet.";
  const themeLine = themes ? `Themes in the room: ${themes}.` : "No themes yet.";
  const action =
    "Pin what the room should see first. Mark an idea in progress when you start it, and shipped when it is real.";
  return {
    headline: plain(headline, 120),
    body: [topLine, `${newestLine} ${themeLine}`, action].join("\n\n"),
  };
}

function parseBrief(value: unknown): { headline: string; body: string } | null {
  if (!value || typeof value !== "object") return null;
  const record = value as { headline?: unknown; body?: unknown };
  if (typeof record.headline !== "string" || typeof record.body !== "string") return null;
  const headline = plain(record.headline, 140);
  const body = plain(record.body, 1600);
  if (!headline || !body) return null;
  return { headline, body };
}

export async function writeDailyBrief(input: {
  creatorName: string;
  communityName: string;
  interest: string;
  ideas: (BriefIdea & { createdAt: string })[];
}): Promise<{ headline: string; body: string; source: "llm" | "fallback" }> {
  const local = fallbackBrief(input);
  if (!aiConfig().key || input.ideas.length === 0) return { ...local, source: "fallback" };
  const ranked = [...input.ideas].sort((a, b) => b.votes - a.votes).slice(0, 12);
  const newest = [...input.ideas].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const chosen = newest && !ranked.some((idea) => idea.id === newest.id) ? [newest, ...ranked] : ranked;
  const listing = chosen
    .map(
      (idea) =>
        `${idea.title} | ${idea.votes} votes | ${idea.pinned ? "pinned" : idea.stage} | ${idea.clusterLabel || "none"} | ${idea.body}`,
    )
    .join("\n");
  const parsed = parseBrief(
    await completeJSON(
      "You write a short daily letter to a creator about their fan community. Return JSON with headline and body. The body is two short paragraphs in plain sentences. Name the leading ideas by title and mention the newest idea by title. Say one clear next step. Do not use em dashes or en dashes. Do not use bullet characters.",
      `Creator: ${input.creatorName}\nCommunity: ${input.communityName}\nInterest: ${input.interest}\nIdeas:\n${listing}`,
    ),
  );
  if (!parsed) return { ...local, source: "fallback" };
  return { ...parsed, source: "llm" };
}
