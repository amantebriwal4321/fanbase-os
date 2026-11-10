export type Stage = "open" | "in_progress" | "shipped";

export type User = {
  id: string;
  name: string;
  email: string;
  handle: string;
  bio: string;
  hue: number;
  createdAt: string;
};

export type Community = {
  id: string;
  slug: string;
  name: string;
  interest: string;
  description: string;
  creatorId: string;
  createdAt: string;
};

export type Member = {
  communityId: string;
  userId: string;
  joinedAt: string;
};

export type Idea = {
  id: string;
  communityId: string;
  authorId: string;
  title: string;
  body: string;
  pinned: boolean;
  stage: Stage;
  qualityScore: number;
  moderationNote: string;
  moderationSource: "llm" | "fallback";
  clusterId: string | null;
  createdAt: string;
};

export type Vote = {
  ideaId: string;
  userId: string;
};

export type Comment = {
  id: string;
  ideaId: string;
  authorId: string;
  body: string;
  createdAt: string;
};

export type Collaboration = {
  id: string;
  ideaId: string;
  userId: string;
  note: string;
  createdAt: string;
};

export type Cluster = {
  id: string;
  communityId: string;
  label: string;
  summary: string;
  updatedAt: string;
};

export type Summary = {
  id: string;
  communityId: string;
  day: string;
  headline: string;
  body: string;
  source: "llm" | "fallback";
  topIdeaIds: string[];
  createdAt: string;
};

export type MagicToken = {
  token: string;
  email: string;
  expiresAt: string;
  used: boolean;
};

export type StoreData = {
  seedVersion: number;
  users: User[];
  communities: Community[];
  members: Member[];
  ideas: Idea[];
  votes: Vote[];
  comments: Comment[];
  collaborations: Collaboration[];
  clusters: Cluster[];
  summaries: Summary[];
  magicTokens: MagicToken[];
};

export type PublicUser = Pick<User, "id" | "name" | "email" | "handle" | "bio" | "hue">;

export type ClusterDraft = {
  label: string;
  summary: string;
  ideaIds: string[];
};

export type Moderation = {
  ok: boolean;
  reason: string;
  qualityScore: number;
  source: "llm" | "fallback";
};
