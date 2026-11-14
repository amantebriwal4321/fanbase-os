"use client";

import { useEffect } from "react";

export function ScrollTo({ id }: { id: string }) {
  useEffect(() => {
    if (!id) return;
    document.getElementById(id)?.scrollIntoView({ block: "start" });
  }, [id]);
  return null;
}
