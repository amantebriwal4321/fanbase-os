export type Kind = "pitch" | "message";

export type ItemStatus = "open" | "accepted" | "passed";

export type ClassifySource = "rules" | "model";

export type Fan = {
  id: string;
  name: string;
  note: string;
  hue: number;
};

export type Community = {
  id: string;
  name: string;
  line: string;
};

export type Viewer = {
  id: string;
  name: string;
};

export type DeltaItem = {
  id: string;
  kind: Kind;
  communityId: string;
  fanId: string;
  title: string;
  body: string;
  createdAt: string;
  topic: string;
  summary: string;
  classifySource: ClassifySource;
};

export type Decision = {
  itemId: string;
  action: "accepted" | "passed";
  cta: string;
  postedAt: string;
};

export type ReadOverride = {
  itemId: string;
  topic: string;
  summary: string;
  classifySource: ClassifySource;
};

export type Join = {
  fanId: string;
  communityId: string;
};

export type Delta = {
  fans: Fan[];
  joins: Join[];
  items: DeltaItem[];
  decisions: Decision[];
  reads: ReadOverride[];
};
