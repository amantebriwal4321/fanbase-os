import { clusterIdeasFallback, type IdeaText } from "./ai";
import type { ClusterDraft, StoreData } from "./types";

function slugPart(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return base || "group";
}

function covers(drafts: ClusterDraft[], ids: Set<string>): boolean {
  const flat = drafts.flatMap((draft) => draft.ideaIds);
  return flat.length === ids.size && new Set(flat).size === ids.size && flat.every((id) => ids.has(id));
}

export function assignClusters(data: StoreData, communityId: string, preferred: ClusterDraft[] | null): void {
  const ideas = data.ideas.filter((idea) => idea.communityId === communityId);
  const texts: IdeaText[] = ideas.map((idea) => ({ id: idea.id, title: idea.title, body: idea.body }));
  const ids = new Set(texts.map((idea) => idea.id));
  const drafts = preferred && covers(preferred, ids) ? preferred : clusterIdeasFallback(texts);
  data.clusters = data.clusters.filter((cluster) => cluster.communityId !== communityId);
  const used = new Set<string>();
  const now = new Date().toISOString();
  const suffix = communityId.replace(/^comm_/, "").slice(0, 12);
  for (const draft of drafts) {
    const base = `clu_${slugPart(draft.label)}_${suffix}`;
    let id = base;
    let n = 2;
    while (used.has(id)) {
      id = `${base}-${n}`;
      n += 1;
    }
    used.add(id);
    data.clusters.push({
      id,
      communityId,
      label: draft.label,
      summary: draft.summary,
      updatedAt: now,
    });
    for (const ideaId of draft.ideaIds) {
      const idea = data.ideas.find((item) => item.id === ideaId);
      if (idea) idea.clusterId = id;
    }
  }
}
