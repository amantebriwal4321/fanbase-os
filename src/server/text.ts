export function cleanLine(input: string, max: number): string {
  return input
    .replace(/[—–]/g, ", ")
    .replace(/[\u0000-\u001F]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function cleanBody(input: string, max: number): string {
  const text = input.replace(/[—–]/g, ", ").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]+/g, " ");
  return text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, max);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const letters = parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
  return letters || "?";
}

export function hueFromName(name: string): number {
  let value = 0;
  for (const char of name) value = (value + char.charCodeAt(0) * 17) % 360;
  return value;
}

export function hoursAgo(now: Date, hours: number): string {
  return new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();
}

export function timeAgo(iso: string, now = Date.now()): string {
  const delta = Math.max(0, now - new Date(iso).getTime());
  const minutes = Math.floor(delta / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return minutes === 1 ? "1 min ago" : `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days < 14) return days === 1 ? "1 day ago" : `${days} days ago`;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(iso));
}
