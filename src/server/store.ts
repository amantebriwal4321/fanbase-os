import { randomBytes } from "crypto";
import fs from "fs/promises";
import path from "path";
import postgres from "postgres";
import { slugify, todayKey } from "@/lib/format";
import { assignClusters } from "./assign";
import { clusterIdeas, hardScreenIdea, moderateIdea, screenNote, writeDailyBrief } from "./ai";
import { buildSeed, FIELD } from "./seed";
import type {
  Community,
  Idea,
  PublicUser,
  Stage,
  StoreData,
  Summary,
  User,
} from "./types";

export type Persistence = {
  read: () => Promise<StoreData | null>;
  write: (data: StoreData) => Promise<void>;
};

export type IdeaCard = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  pinned: boolean;
  stage: Stage;
  qualityScore: number;
  moderationNote: string;
  moderationSource: "llm" | "fallback";
  cluster: { id: string; label: string } | null;
  author: PublicUser;
  votes: number;
  voted: boolean;
  commentCount: number;
  collaboratorCount: number;
};

export type CommunityPage = {
  community: Community;
  creator: PublicUser;
  members: PublicUser[];
  viewerIsMember: boolean;
  viewerIsCreator: boolean;
  ideas: IdeaCard[];
  clusters: { id: string; label: string; summary: string; count: number }[];
  summary: Summary | null;
  ideaCount: number;
};

export type CommentView = {
  id: string;
  body: string;
  createdAt: string;
  author: PublicUser;
};

export type CollaboratorView = {
  id: string;
  note: string;
  createdAt: string;
  author: PublicUser;
};

export type IdeaPage = {
  community: Community;
  creator: PublicUser;
  viewerIsMember: boolean;
  viewerIsCreator: boolean;
  idea: IdeaCard;
  comments: CommentView[];
  collaborators: CollaboratorView[];
  viewerJoined: boolean;
};

export type SummaryPage = {
  community: Community;
  creator: PublicUser;
  viewerIsCreator: boolean;
  summaries: Summary[];
  ideas: { id: string; title: string }[];
};

export type HomeCard = {
  slug: string;
  name: string;
  interest: string;
  description: string;
  creatorName: string;
  memberCount: number;
  ideaCount: number;
};

type Result<T extends object = object> = ({ ok: true } & T) | { ok: false; error: string };

export type Repo = {
  home: () => Promise<{ communities: HomeCard[]; field: CommunityPage | null }>;
  getCommunity: (slug: string, viewerId: string | null, view: string, clusterId: string) => Promise<CommunityPage | null>;
  getIdea: (slug: string, ideaId: string, viewerId: string | null) => Promise<IdeaPage | null>;
  getSummary: (slug: string, viewerId: string | null) => Promise<SummaryPage | null>;
  findUser: (id: string) => Promise<User | null>;
  toggleVote: (slug: string, ideaId: string, userId: string) => Promise<Result<{ votes: number }>>;
  createIdea: (input: { slug: string; authorId: string; title: string; body: string }) => Promise<Result<{ ideaId: string }>>;
  addComment: (input: { slug: string; ideaId: string; authorId: string; body: string }) => Promise<Result>;
  joinIdea: (input: { slug: string; ideaId: string; userId: string; note: string }) => Promise<Result>;
  setPinned: (input: { slug: string; ideaId: string; actorId: string; pinned: boolean }) => Promise<Result>;
  setStage: (input: { slug: string; ideaId: string; actorId: string; stage: Stage }) => Promise<Result>;
  writeBrief: (slug: string, actorId: string) => Promise<Result<{ source: "llm" | "fallback" }>>;
  createCommunity: (input: {
    creatorId: string;
    name: string;
    interest: string;
    description: string;
  }) => Promise<Result<{ slug: string }>>;
  joinCommunity: (slug: string, userId: string) => Promise<Result>;
  createMagicToken: (email: string) => Promise<string>;
  consumeMagicToken: (token: string) => Promise<{ email: string } | null>;
  upsertFromLogin: (input: { email: string; name: string; handle: string; joinSlug: string | null }) => Promise<User>;
  restoreDemo: (userId: string) => Promise<Result>;
};

function pub(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    handle: user.handle,
    bio: user.bio,
    hue: user.hue,
  };
}

function authorOf(data: StoreData, userId: string): PublicUser {
  const user = data.users.find((item) => item.id === userId);
  if (!user) return { id: userId, name: "Former member", email: "", handle: "member", bio: "", hue: 24 };
  return pub(user);
}

function voteCount(data: StoreData, ideaId: string): number {
  return data.votes.filter((vote) => vote.ideaId === ideaId).length;
}

function isMember(data: StoreData, communityId: string, userId: string | null): boolean {
  if (!userId) return false;
  return data.members.some((member) => member.communityId === communityId && member.userId === userId);
}

function toCard(data: StoreData, idea: Idea, viewerId: string | null): IdeaCard {
  const cluster = data.clusters.find((item) => item.id === idea.clusterId) ?? null;
  return {
    id: idea.id,
    title: idea.title,
    body: idea.body,
    createdAt: idea.createdAt,
    pinned: idea.pinned,
    stage: idea.stage,
    qualityScore: idea.qualityScore,
    moderationNote: idea.moderationNote,
    moderationSource: idea.moderationSource,
    cluster: cluster ? { id: cluster.id, label: cluster.label } : null,
    author: authorOf(data, idea.authorId),
    votes: voteCount(data, idea.id),
    voted: Boolean(viewerId && data.votes.some((vote) => vote.ideaId === idea.id && vote.userId === viewerId)),
    commentCount: data.comments.filter((comment) => comment.ideaId === idea.id).length,
    collaboratorCount: data.collaborations.filter((item) => item.ideaId === idea.id).length,
  };
}

function communityBySlug(data: StoreData, slug: string) {
  return data.communities.find((community) => community.slug === slug) ?? null;
}

function pageFor(
  data: StoreData,
  communityId: string,
  viewerId: string | null,
  view: string,
  clusterId: string,
): CommunityPage | null {
  const community = data.communities.find((item) => item.id === communityId);
  if (!community) return null;
  const creator = data.users.find((user) => user.id === community.creatorId);
  if (!creator) return null;
  const memberIds = data.members.filter((member) => member.communityId === community.id).map((member) => member.userId);
  const ideas = data.ideas
    .filter((idea) => idea.communityId === community.id)
    .filter((idea) => (clusterId ? idea.clusterId === clusterId : true))
    .filter((idea) => {
      if (view === "pinned") return idea.pinned;
      if (view === "in_progress") return idea.stage === "in_progress";
      if (view === "shipped") return idea.stage === "shipped";
      if (view === "open") return idea.stage === "open" && !idea.pinned;
      return true;
    })
    .sort((a, b) => {
      const bucket = (idea: Idea) => (idea.pinned ? 0 : idea.stage === "in_progress" ? 1 : idea.stage === "open" ? 2 : 3);
      const left = bucket(a);
      const right = bucket(b);
      if (left !== right) return left - right;
      const votes = voteCount(data, b.id) - voteCount(data, a.id);
      if (votes !== 0) return votes;
      return b.createdAt.localeCompare(a.createdAt);
    });
  const clusters = data.clusters
    .filter((cluster) => cluster.communityId === community.id)
    .map((cluster) => ({
      id: cluster.id,
      label: cluster.label,
      summary: cluster.summary,
      count: data.ideas.filter((idea) => idea.clusterId === cluster.id).length,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  const summaries = data.summaries
    .filter((summary) => summary.communityId === community.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return {
    community,
    creator: pub(creator),
    members: memberIds.map((id) => authorOf(data, id)),
    viewerIsMember: isMember(data, community.id, viewerId),
    viewerIsCreator: viewerId === community.creatorId,
    ideas: ideas.map((idea) => toCard(data, idea, viewerId)),
    clusters,
    summary: summaries[0] ?? null,
    ideaCount: data.ideas.filter((idea) => idea.communityId === community.id).length,
  };
}

function nid(prefix: string): string {
  return `${prefix}_${randomBytes(4).toString("hex")}`;
}

function hueFrom(input: string): number {
  let hue = 0;
  for (const char of input) hue = (hue * 33 + char.charCodeAt(0)) % 360;
  return hue;
}

function uniqueHandle(data: StoreData, base: string): string {
  const root = slugify(base).replace(/-/g, "") || "member";
  let handle = root.slice(0, 24);
  let n = 2;
  while (data.users.some((user) => user.handle === handle)) {
    handle = `${root.slice(0, 20)}${n}`;
    n += 1;
  }
  return handle;
}

function nameFromEmail(email: string): string {
  const local = email.split("@")[0]?.replace(/[._-]+/g, " ").trim() || "New member";
  return local.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

export function buildRepo(
  read: () => Promise<StoreData>,
  update: <T>(fn: (data: StoreData) => T) => Promise<T>,
): Repo {
  return {
    async home() {
      const data = await read();
      const communities = data.communities
        .map((community) => {
          const creator = data.users.find((user) => user.id === community.creatorId);
          return {
            slug: community.slug,
            name: community.name,
            interest: community.interest,
            description: community.description,
            creatorName: creator?.name || "Creator",
            memberCount: data.members.filter((member) => member.communityId === community.id).length,
            ideaCount: data.ideas.filter((idea) => idea.communityId === community.id).length,
          };
        })
        .sort((a, b) => b.ideaCount - a.ideaCount || a.name.localeCompare(b.name));
      return { communities, field: pageFor(data, FIELD.communityId, null, "all", "") };
    },
    async getCommunity(slug, viewerId, view, clusterId) {
      const data = await read();
      const community = communityBySlug(data, slug);
      if (!community) return null;
      return pageFor(data, community.id, viewerId, view, clusterId);
    },
    async getIdea(slug, ideaId, viewerId) {
      const data = await read();
      const community = communityBySlug(data, slug);
      if (!community) return null;
      const idea = data.ideas.find((item) => item.id === ideaId && item.communityId === community.id);
      if (!idea) return null;
      const creator = data.users.find((user) => user.id === community.creatorId);
      if (!creator) return null;
      const comments = data.comments
        .filter((comment) => comment.ideaId === idea.id)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map((comment) => ({
          id: comment.id,
          body: comment.body,
          createdAt: comment.createdAt,
          author: authorOf(data, comment.authorId),
        }));
      const collaborators = data.collaborations
        .filter((item) => item.ideaId === idea.id)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map((item) => ({
          id: item.id,
          note: item.note,
          createdAt: item.createdAt,
          author: authorOf(data, item.userId),
        }));
      return {
        community,
        creator: pub(creator),
        viewerIsMember: isMember(data, community.id, viewerId),
        viewerIsCreator: viewerId === community.creatorId,
        idea: toCard(data, idea, viewerId),
        comments,
        collaborators,
        viewerJoined: Boolean(viewerId && collaborators.some((item) => item.author.id === viewerId)),
      };
    },
    async getSummary(slug, viewerId) {
      const data = await read();
      const community = communityBySlug(data, slug);
      if (!community) return null;
      const creator = data.users.find((user) => user.id === community.creatorId);
      if (!creator) return null;
      return {
        community,
        creator: pub(creator),
        viewerIsCreator: viewerId === community.creatorId,
        summaries: data.summaries
          .filter((summary) => summary.communityId === community.id)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        ideas: data.ideas
          .filter((idea) => idea.communityId === community.id)
          .map((idea) => ({ id: idea.id, title: idea.title })),
      };
    },
    async findUser(id) {
      const data = await read();
      return data.users.find((user) => user.id === id) ?? null;
    },
    async toggleVote(slug, ideaId, userId) {
      return update((data) => {
        const community = communityBySlug(data, slug);
        const idea = community && data.ideas.find((item) => item.id === ideaId && item.communityId === community.id);
        if (!community || !idea) return { ok: false, error: "Idea not found." };
        if (!isMember(data, community.id, userId)) {
          return { ok: false, error: "Join this community before you vote." };
        }
        const index = data.votes.findIndex((vote) => vote.ideaId === idea.id && vote.userId === userId);
        if (index >= 0) data.votes.splice(index, 1);
        else data.votes.push({ ideaId: idea.id, userId });
        return { ok: true, votes: voteCount(data, idea.id) };
      });
    },
    async createIdea({ slug, authorId, title, body }) {
      const cleanTitle = title.trim();
      const cleanBody = body.trim();
      const snapshot = await read();
      const community = communityBySlug(snapshot, slug);
      if (!community) return { ok: false, error: "Community not found." };
      if (!isMember(snapshot, community.id, authorId)) {
        return { ok: false, error: "Join this community before you post." };
      }
      if (snapshot.ideas.filter((idea) => idea.communityId === community.id).length >= 200) {
        return { ok: false, error: "This room is full for now." };
      }
      const existing = snapshot.ideas.filter((idea) => idea.communityId === community.id);
      const moderation = await moderateIdea({
        interest: community.interest,
        title: cleanTitle,
        body: cleanBody,
        existing: existing.map((idea) => ({ title: idea.title, body: idea.body })),
      });
      if (!moderation.ok) return { ok: false, error: moderation.reason };
      const ideaId = `${slugify(cleanTitle)}-${randomBytes(2).toString("hex")}`;
      const pending = "pending_idea";
      const clustered = await clusterIdeas({
        interest: community.interest,
        ideas: [
          ...existing.map((idea) => ({ id: idea.id, title: idea.title, body: idea.body })),
          { id: pending, title: cleanTitle, body: cleanBody },
        ],
      });
      return update((data) => {
        const current = communityBySlug(data, slug);
        if (!current) return { ok: false, error: "Community not found." };
        if (!isMember(data, current.id, authorId)) return { ok: false, error: "Join this community before you post." };
        const latest = data.ideas.filter((idea) => idea.communityId === current.id);
        const hard = hardScreenIdea(
          cleanTitle,
          cleanBody,
          latest.map((idea) => ({ title: idea.title, body: idea.body })),
        );
        if (!hard.ok) return { ok: false, error: hard.reason };
        if (data.ideas.some((idea) => idea.id === ideaId)) return { ok: false, error: "Please try posting that again." };
        data.ideas.push({
          id: ideaId,
          communityId: current.id,
          authorId,
          title: cleanTitle,
          body: cleanBody,
          pinned: false,
          stage: "open",
          qualityScore: moderation.qualityScore,
          moderationNote: moderation.reason,
          moderationSource: moderation.source,
          clusterId: null,
          createdAt: new Date().toISOString(),
        });
        const preferred = clustered.clusters.map((cluster) => ({
          ...cluster,
          ideaIds: cluster.ideaIds.map((id) => (id === pending ? ideaId : id)),
        }));
        assignClusters(data, current.id, preferred);
        return { ok: true, ideaId };
      });
    },
    async addComment({ slug, ideaId, authorId, body }) {
      const clean = body.trim();
      if (clean.length < 2) return { ok: false, error: "Write a comment of at least a few words." };
      const screened = screenNote(clean);
      if (!screened.ok) return { ok: false, error: screened.reason };
      return update((data) => {
        const community = communityBySlug(data, slug);
        const idea = community && data.ideas.find((item) => item.id === ideaId && item.communityId === community.id);
        if (!community || !idea) return { ok: false, error: "Idea not found." };
        if (!isMember(data, community.id, authorId)) return { ok: false, error: "Join this community before you comment." };
        const again = screenNote(clean);
        if (!again.ok) return { ok: false, error: again.reason };
        data.comments.push({
          id: nid("com"),
          ideaId: idea.id,
          authorId,
          body: clean,
          createdAt: new Date().toISOString(),
        });
        return { ok: true };
      });
    },
    async joinIdea({ slug, ideaId, userId, note }) {
      const clean = note.trim();
      if (clean.length > 280) return { ok: false, error: "Keep the note under 280 characters." };
      const screened = screenNote(clean);
      if (!screened.ok) return { ok: false, error: screened.reason };
      return update((data) => {
        const community = communityBySlug(data, slug);
        const idea = community && data.ideas.find((item) => item.id === ideaId && item.communityId === community.id);
        if (!community || !idea) return { ok: false, error: "Idea not found." };
        if (!isMember(data, community.id, userId)) return { ok: false, error: "Join this community before you collaborate." };
        const again = screenNote(clean);
        if (!again.ok) return { ok: false, error: again.reason };
        const existing = data.collaborations.find((item) => item.ideaId === idea.id && item.userId === userId);
        if (existing) {
          existing.note = clean;
          return { ok: true };
        }
        data.collaborations.push({
          id: nid("col"),
          ideaId: idea.id,
          userId,
          note: clean,
          createdAt: new Date().toISOString(),
        });
        return { ok: true };
      });
    },
    async setPinned({ slug, ideaId, actorId, pinned }) {
      return update((data) => {
        const community = communityBySlug(data, slug);
        const idea = community && data.ideas.find((item) => item.id === ideaId && item.communityId === community.id);
        if (!community || !idea) return { ok: false, error: "Idea not found." };
        if (community.creatorId !== actorId) return { ok: false, error: "Only the creator can pin an idea." };
        idea.pinned = pinned;
        return { ok: true };
      });
    },
    async setStage({ slug, ideaId, actorId, stage }) {
      if (stage !== "open" && stage !== "in_progress" && stage !== "shipped") {
        return { ok: false, error: "Unknown status." };
      }
      return update((data) => {
        const community = communityBySlug(data, slug);
        const idea = community && data.ideas.find((item) => item.id === ideaId && item.communityId === community.id);
        if (!community || !idea) return { ok: false, error: "Idea not found." };
        if (community.creatorId !== actorId) return { ok: false, error: "Only the creator can change status." };
        idea.stage = stage;
        return { ok: true };
      });
    },
    async writeBrief(slug, actorId) {
      const snapshot = await read();
      const community = communityBySlug(snapshot, slug);
      if (!community) return { ok: false, error: "Community not found." };
      if (community.creatorId !== actorId) return { ok: false, error: "Only the creator can write the daily letter." };
      const creator = snapshot.users.find((user) => user.id === community.creatorId);
      if (!creator) return { ok: false, error: "Creator not found." };
      const ideas = snapshot.ideas
        .filter((idea) => idea.communityId === community.id)
        .map((idea) => ({
          id: idea.id,
          title: idea.title,
          body: idea.body,
          votes: voteCount(snapshot, idea.id),
          stage: idea.stage,
          pinned: idea.pinned,
          clusterLabel: snapshot.clusters.find((cluster) => cluster.id === idea.clusterId)?.label ?? null,
          createdAt: idea.createdAt,
        }));
      const brief = await writeDailyBrief({
        creatorName: creator.name,
        communityName: community.name,
        interest: community.interest,
        ideas,
      });
      const topIdeaIds = [...ideas].sort((a, b) => b.votes - a.votes).slice(0, 3).map((idea) => idea.id);
      return update((data) => {
        const current = communityBySlug(data, slug);
        if (!current || current.creatorId !== actorId) {
          return { ok: false, error: "Only the creator can write the daily letter." };
        }
        data.summaries.push({
          id: nid("sum"),
          communityId: current.id,
          day: todayKey(),
          headline: brief.headline,
          body: brief.body,
          source: brief.source,
          topIdeaIds,
          createdAt: new Date().toISOString(),
        });
        return { ok: true, source: brief.source };
      });
    },
    async createCommunity({ creatorId, name, interest, description }) {
      const cleanName = name.trim();
      const cleanInterest = interest.trim();
      const cleanDescription = description.trim();
      if (cleanName.length < 3 || cleanName.length > 60) return { ok: false, error: "Use a name between 3 and 60 characters." };
      if (cleanInterest.length < 3 || cleanInterest.length > 80) {
        return { ok: false, error: "Describe the interest in 3 to 80 characters." };
      }
      if (cleanDescription.length < 20 || cleanDescription.length > 500) {
        return { ok: false, error: "Write a short description, at least 20 characters." };
      }
      return update((data) => {
        if (!data.users.some((user) => user.id === creatorId)) return { ok: false, error: "Sign in first." };
        let slug = slugify(cleanName);
        let n = 2;
        while (data.communities.some((community) => community.slug === slug)) {
          slug = `${slugify(cleanName).slice(0, 40)}-${n}`;
          n += 1;
        }
        const id = nid("comm");
        const now = new Date().toISOString();
        data.communities.push({
          id,
          slug,
          name: cleanName,
          interest: cleanInterest,
          description: cleanDescription,
          creatorId,
          createdAt: now,
        });
        if (!isMember(data, id, creatorId)) {
          data.members.push({ communityId: id, userId: creatorId, joinedAt: now });
        }
        return { ok: true, slug };
      });
    },
    async joinCommunity(slug, userId) {
      return update((data) => {
        const community = communityBySlug(data, slug);
        if (!community) return { ok: false, error: "Community not found." };
        if (!data.users.some((user) => user.id === userId)) return { ok: false, error: "Sign in first." };
        if (!isMember(data, community.id, userId)) {
          data.members.push({ communityId: community.id, userId, joinedAt: new Date().toISOString() });
        }
        return { ok: true };
      });
    },
    async createMagicToken(email) {
      const token = randomBytes(24).toString("hex");
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      await update((data) => {
        const now = Date.now();
        data.magicTokens = data.magicTokens.filter((item) => !item.used && new Date(item.expiresAt).getTime() > now).slice(-40);
        data.magicTokens.push({ token, email: email.toLowerCase(), expiresAt, used: false });
      });
      return token;
    },
    async consumeMagicToken(token) {
      return update((data) => {
        const row = data.magicTokens.find((item) => item.token === token);
        if (!row || row.used || new Date(row.expiresAt).getTime() < Date.now()) return null;
        row.used = true;
        return { email: row.email };
      });
    },
    async upsertFromLogin({ email, name, handle, joinSlug }) {
      const cleanEmail = email.trim().toLowerCase();
      return update((data) => {
        let user = data.users.find((item) => item.email === cleanEmail);
        if (!user) {
          user = {
            id: nid("user"),
            name: name.trim() || nameFromEmail(cleanEmail),
            email: cleanEmail,
            handle: uniqueHandle(data, handle || cleanEmail.split("@")[0] || "member"),
            bio: "",
            hue: hueFrom(cleanEmail),
            createdAt: new Date().toISOString(),
          };
          data.users.push(user);
        }
        const community = joinSlug ? communityBySlug(data, joinSlug) : null;
        if (community && !isMember(data, community.id, user.id)) {
          data.members.push({ communityId: community.id, userId: user.id, joinedAt: new Date().toISOString() });
        }
        return user;
      });
    },
    async restoreDemo(userId) {
      return update((data) => {
        if (userId !== FIELD.lena) return { ok: false, error: "Only Lena can restore the demo data." };
        const fresh = buildSeed();
        for (const key of Object.keys(data) as (keyof StoreData)[]) delete data[key];
        Object.assign(data, fresh);
        return { ok: true };
      });
    },
  };
}

function queued(persistence: Persistence): {
  read: () => Promise<StoreData>;
  update: <T>(fn: (data: StoreData) => T) => Promise<T>;
} {
  let chain: Promise<unknown> = Promise.resolve();
  function update<T>(fn: (data: StoreData) => T): Promise<T> {
    const run = chain.then(async () => {
      const data = (await persistence.read()) ?? buildSeed();
      const result = fn(data);
      await persistence.write(data);
      return result;
    });
    chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }
  async function read(): Promise<StoreData> {
    const existing = await persistence.read();
    if (existing) return existing;
    return update((data) => data);
  }
  return { read, update };
}

export function createRepo(persistence: Persistence): Repo {
  const { read, update } = queued(persistence);
  return buildRepo(read, update);
}

export function createMemoryRepo(): Repo {
  let current: StoreData | null = null;
  return createRepo({
    async read() {
      return current ? structuredClone(current) : null;
    },
    async write(next) {
      current = structuredClone(next);
    },
  });
}

function storePath(): string {
  if (process.env.STORE_PATH) return process.env.STORE_PATH;
  if (process.env.VERCEL) return "/tmp/fanbase-os-store.json";
  return path.join(process.cwd(), "data", "store.json");
}

function filePersistence(file: string): Persistence {
  return {
    async read() {
      try {
        const text = await fs.readFile(file, "utf8");
        const parsed = JSON.parse(text) as StoreData;
        if (!parsed || !Array.isArray(parsed.users) || !Array.isArray(parsed.ideas)) return null;
        return parsed;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw error;
      }
    },
    async write(data) {
      await fs.mkdir(path.dirname(file), { recursive: true });
      const tmp = `${file}.${process.pid}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(data));
      await fs.rename(tmp, file);
    },
  };
}

function createPgRepo(url: string): Repo {
  const sql = postgres(url, {
    max: 1,
    idle_timeout: 20,
    prepare: false,
    ssl: process.env.DATABASE_SSL === "disable" || /localhost|127\.0\.0\.1/.test(url) ? false : "require",
  });
  let ready: Promise<void> | null = null;
  const ensure = () => {
    ready ??= sql`create table if not exists app_document (id text primary key, doc jsonb not null)`.then(() => undefined);
    return ready;
  };
  async function update<T>(fn: (data: StoreData) => T): Promise<T> {
    await ensure();
    const result = await sql.begin(async (tx) => {
      await tx`insert into app_document (id, doc) values ('main', ${tx.json(buildSeed() as never)}) on conflict (id) do nothing`;
      const rows = await tx`select doc from app_document where id = 'main' for update`;
      const data = rows[0].doc as StoreData;
      const value = fn(data);
      await tx`update app_document set doc = ${tx.json(data as never)} where id = 'main'`;
      return value;
    });
    return result as T;
  }
  async function read(): Promise<StoreData> {
    await ensure();
    const rows = await sql`select doc from app_document where id = 'main'`;
    if (rows.length === 0) return update((data) => data);
    return rows[0].doc as StoreData;
  }
  return buildRepo(read, update);
}

let singleton: Repo | null = null;

export function getRepo(): Repo {
  if (!singleton) {
    const url = process.env.DATABASE_URL;
    singleton = url ? createPgRepo(url) : createRepo(filePersistence(storePath()));
  }
  return singleton;
}
