import type { Metadata } from "next";
import { Desk } from "@/components/desk";
import { GROUP_NOTES } from "@/server/ai";
import { errorText } from "@/server/errors";
import { loadSnapshot } from "@/server/store";

export const metadata: Metadata = { title: "Creator desk" };

export default async function DeskPage({
  searchParams,
}: {
  searchParams: Promise<{ accept?: string; e?: string; grouped?: string }>;
}) {
  const query = await searchParams;
  const { snapshot } = await loadSnapshot();
  const grouped = query.grouped && query.grouped in GROUP_NOTES ? (query.grouped as keyof typeof GROUP_NOTES) : null;
  const acceptId = query.accept ?? "";
  return (
    <Desk
      snapshot={snapshot}
      acceptId={acceptId}
      error={errorText(query.e)}
      grouped={grouped}
      focus={acceptId || (grouped ? "desk-heading" : "")}
    />
  );
}
