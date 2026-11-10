import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CommunityView } from "@/components/community-view";
import { getCurrentUser } from "@/server/auth";
import { getRepo } from "@/server/store";

const views = new Set(["all", "pinned", "in_progress", "open", "shipped"]);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await getRepo().getCommunity(slug, null, "all", "");
  return { title: page?.community.name || "Room" };
}

export default async function CommunityPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ view?: string; cluster?: string; error?: string; notice?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const user = await getCurrentUser();
  const view = views.has(query.view || "") ? query.view || "all" : "all";
  const page = await getRepo().getCommunity(slug, user?.id ?? null, view, query.cluster || "");
  if (!page) notFound();
  return (
    <CommunityView
      page={page}
      view={view}
      clusterId={query.cluster || ""}
      notice={query.notice}
      error={query.error}
      signedIn={Boolean(user)}
    />
  );
}
