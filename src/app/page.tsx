import { Hub } from "@/components/hub";
import { errorText } from "@/server/errors";
import { loadSnapshot } from "@/server/store";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; c?: string; sent?: string; posted?: string; sample?: string }>;
}) {
  const query = await searchParams;
  const { snapshot } = await loadSnapshot();
  const community = query.c ?? "";
  const focus = query.posted === "1" ? "calls" : community;
  return (
    <Hub
      snapshot={snapshot}
      error={errorText(query.e)}
      errorCommunity={community}
      sentCommunity={query.sent === "1" ? community : ""}
      posted={query.posted === "1"}
      sampleCommunity={query.sample === "1" ? community : ""}
      focus={focus}
    />
  );
}
