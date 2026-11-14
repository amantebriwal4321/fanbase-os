export const POINTS = {
  detail: 2,
  ask: 2,
  repeat: 2,
  fresh: 1,
} as const;

export const SURFACE_SCORE = 5;
export const SURFACE_LIMIT = 3;
export const MAX_PER_TOPIC = 2;
export const REPEAT_OTHERS = 2;
export const FRESH_DAYS = 7;

export const TOPICS = ["Night market", "Test kitchen", "Guest spot", "Other"] as const;
export type Topic = (typeof TOPICS)[number];

export const RANKING_RULES: { title: string; body: string }[] = [
  {
    title: `Concrete detail, +${POINTS.detail}`,
    body: "A place, time, number, or named thing.",
  },
  {
    title: `Clear ask, +${POINTS.ask}`,
    body: "It says what Rhea or the community should do next.",
  },
  {
    title: `Others on this topic, +${POINTS.repeat}`,
    body: `At least ${REPEAT_OTHERS} other open notes share the topic.`,
  },
  {
    title: `This week, +${POINTS.fresh}`,
    body: `It arrived in the last ${FRESH_DAYS} days.`,
  },
  {
    title: "Set aside",
    body: "Spam is dropped. So is a note with no detail and no ask.",
  },
  {
    title: "The desk",
    body: `At most ${SURFACE_LIMIT} notes, and at most ${MAX_PER_TOPIC} from the same topic. A note needs ${SURFACE_SCORE} points to be eligible.`,
  },
];

const TOPIC_PHRASES: { topic: Topic; phrases: string[] }[] = [
  {
    topic: "Night market",
    phrases: ["dosa", "princess street", "fort kochi", "night stall", "side street", "dosa cart", "11pm", "midnight"],
  },
  {
    topic: "Test kitchen",
    phrases: ["fish curry", "coconut", "bakery", "minute", "recipe", "pantry", "weeknight bowl"],
  },
  {
    topic: "Guest spot",
    phrases: ["spice shop", "guest spot", "boat kitchen", "collab"],
  },
];

const SPAM = [
  /buy\s+followers/i,
  /\bfollowers\b/i,
  /click here/i,
  /bit\.ly/i,
  /tinyurl/i,
  /\bcrypto\b/i,
  /\bdm me\b/i,
  /\b10k\b/i,
  /work from home/i,
  /free money/i,
];

const ASK = [
  /\b(can you|could you|please)\b/i,
  /\bi can \w+/i,
  /\b(film|record|shoot|map|sketch|print|test|cook|feature)\s+(the|this|a|my|our|it|them|two|three|\d+)\b/i,
  /\b(open the|come by|walk the|try it|try this|mark which|mark the)\b/i,
  /\byou should\b/i,
  /\bif you (record|film|shoot|come|open|try|mark)\b/i,
];

const DETAIL =
  /\b(\d|monday|tuesday|wednesday|thursday|friday|saturday|sunday|stalls?|carts?|shops?|baker(?:y|ies)|markets?|minutes?|midnight|street|princess|kochi)\b/i;

export type InboxItem = {
  id: string;
  kind: "pitch" | "message";
  title: string;
  body: string;
  createdAt: string;
  topic?: string;
};

export type Flags = {
  detail: boolean;
  ask: boolean;
  repeat: boolean;
  fresh: boolean;
};

export type Scored = {
  id: string;
  kind: "pitch" | "message";
  title: string;
  body: string;
  createdAt: string;
  topic: Topic;
  score: number;
  spam: boolean;
  thin: boolean;
  aside: boolean;
  flags: Flags;
  reason: string;
  topicCount: number;
};

export type Chip = { id: string; label: string; points: number };

function hasPhrase(text: string, phrase: string): boolean {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}s?\\b`, "i").test(text);
}

export function topicFor(text: string): Topic {
  let best: Topic = "Other";
  let bestScore = 0;
  for (const row of TOPIC_PHRASES) {
    let score = 0;
    for (const phrase of row.phrases) {
      if (hasPhrase(text, phrase)) score += phrase.includes(" ") ? 2 : 1;
    }
    if (score > bestScore) {
      best = row.topic;
      bestScore = score;
    }
  }
  return best;
}

export function isTopic(value: string): value is Topic {
  return (TOPICS as readonly string[]).includes(value);
}

function signals(text: string): { spam: boolean; ask: boolean; detail: boolean; thin: boolean } {
  const spam = SPAM.some((pattern) => pattern.test(text));
  const ask = ASK.some((pattern) => pattern.test(text));
  const detail = DETAIL.test(text);
  return { spam, ask, detail, thin: !spam && !ask && !detail };
}

function isFresh(iso: string, now: Date): boolean {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return false;
  const age = now.getTime() - time;
  return age >= -60_000 && age <= FRESH_DAYS * 24 * 60 * 60 * 1000;
}

export function reasonFor(input: { spam: boolean; thin: boolean; flags: Flags }): string {
  if (input.spam) return "Set aside. It reads like spam.";
  if (input.thin) return "Set aside. No detail and no ask.";
  const bits: string[] = [];
  if (input.flags.detail && input.flags.ask) bits.push("it names a real detail and a next step");
  else if (input.flags.detail) bits.push("it names a real detail");
  else if (input.flags.ask) bits.push("it has a clear next step");
  if (input.flags.repeat) bits.push("other fans are already on this topic");
  if (input.flags.fresh) bits.push("it came in this week");
  if (bits.length === 0) return "It does not clear the bar yet.";
  const text = bits.join(", and ");
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
}

export function firedRules(flags: Flags): Chip[] {
  const chips: Chip[] = [];
  if (flags.detail) chips.push({ id: "detail", label: "Concrete detail", points: POINTS.detail });
  if (flags.ask) chips.push({ id: "ask", label: "Clear ask", points: POINTS.ask });
  if (flags.repeat) chips.push({ id: "repeat", label: "Others on this topic", points: POINTS.repeat });
  if (flags.fresh) chips.push({ id: "fresh", label: "This week", points: POINTS.fresh });
  return chips;
}

export function compareScored(a: Scored, b: Scored): number {
  if (b.score !== a.score) return b.score - a.score;
  if (b.topicCount !== a.topicCount) return b.topicCount - a.topicCount;
  if (a.kind !== b.kind) return a.kind === "pitch" ? -1 : 1;
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export function rankInbox(items: InboxItem[], now: Date): Scored[] {
  const prelim = items.map((item) => {
    const text = `${item.title}\n${item.body}`;
    const topic = item.topic && isTopic(item.topic) ? item.topic : topicFor(text);
    return { item, signal: signals(text), topic };
  });
  const counts = new Map<string, number>();
  for (const row of prelim) {
    if (row.signal.spam || row.signal.thin) continue;
    counts.set(row.topic, (counts.get(row.topic) ?? 0) + 1);
  }
  return prelim.map((row) => {
    const aside = row.signal.spam || row.signal.thin;
    const topicCount = counts.get(row.topic) ?? 0;
    const others = aside ? 0 : Math.max(0, topicCount - 1);
    const repeat = !aside && others >= REPEAT_OTHERS;
    const fresh = !aside && isFresh(row.item.createdAt, now);
    const flags: Flags = {
      detail: !aside && row.signal.detail,
      ask: !aside && row.signal.ask,
      repeat,
      fresh,
    };
    let score = 0;
    if (flags.detail) score += POINTS.detail;
    if (flags.ask) score += POINTS.ask;
    if (flags.repeat) score += POINTS.repeat;
    if (flags.fresh) score += POINTS.fresh;
    return {
      id: row.item.id,
      kind: row.item.kind,
      title: row.item.title,
      body: row.item.body,
      createdAt: row.item.createdAt,
      topic: row.topic,
      score,
      spam: row.signal.spam,
      thin: row.signal.thin,
      aside,
      flags,
      reason: reasonFor({ spam: row.signal.spam, thin: row.signal.thin, flags }),
      topicCount,
    };
  });
}

export function selectDesk(scored: Scored[]): Scored[] {
  const sorted = scored.filter((item) => !item.aside && item.score >= SURFACE_SCORE).sort(compareScored);
  const picked: Scored[] = [];
  const used = new Map<string, number>();
  for (const item of sorted) {
    const count = used.get(item.topic) ?? 0;
    if (count >= MAX_PER_TOPIC) continue;
    picked.push(item);
    used.set(item.topic, count + 1);
    if (picked.length >= SURFACE_LIMIT) break;
  }
  return picked;
}

export function suggestedCall(title: string): string {
  const lead = title.trim().replace(/[.?!]+$/g, "");
  return `${lead}. Reply here if you can help.`.slice(0, 180);
}
