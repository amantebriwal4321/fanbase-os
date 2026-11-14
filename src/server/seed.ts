import { hoursAgo } from "./text";
import type { Community, Fan, Kind } from "./types";

export const CREATOR = {
  name: "Rhea Kapoor",
  handle: "@sundaytable",
  line: "I film the meals people actually cook.",
  place: "Kochi",
  audience: "180k on the channel",
  film: "Latest film: one dosa order on Princess Street, Thursday night.",
  letter: "Sunday letter: one table, one recipe, no ads.",
};

export const DEMO_PITCH = {
  title: "Map the Fort Kochi stalls before close",
  body: "Walk the Fort Kochi night stalls this Saturday and mark which ones still serve after midnight. I can sketch the map if you film two stops.",
};

export const COMMUNITIES: Community[] = [
  {
    id: "night-market",
    name: "Night Market Club",
    line: "Late stalls, maps, and who is worth filming.",
  },
  {
    id: "test-kitchen",
    name: "Test Kitchen",
    line: "Recipes to try on the next Sunday Table film.",
  },
  {
    id: "guest-spots",
    name: "Guest spots",
    line: "Shops and boats that want a scene.",
  },
];

export const FANS: Fan[] = [
  { id: "f-kabir", name: "Kabir Menon", note: "Maps night markets in Kochi", hue: 18 },
  { id: "f-priya", name: "Priya Shah", note: "Draws simple maps", hue: 152 },
  { id: "f-jonah", name: "Jonah Reed", note: "Films on a phone", hue: 200 },
  { id: "f-nina", name: "Nina Kapadia", note: "Watches every film", hue: 340 },
  { id: "f-meera", name: "Meera Iyer", note: "Tests Sunday recipes", hue: 28 },
  { id: "f-hassan", name: "Hassan Ali", note: "Keeps a pantry for the show", hue: 262 },
  { id: "f-lila", name: "Lila Costa", note: "Bakes the first tray", hue: 122 },
  { id: "f-sam", name: "Sam Ortega", note: "Cooks after work", hue: 42 },
  { id: "f-arun", name: "Arun Desai", note: "Runs a spice shop in Mattancherry", hue: 12 },
  { id: "f-dev", name: "Dev Krishnan", note: "Runs a boat kitchen", hue: 210 },
  { id: "f-rio", name: "Rio Alvarez", note: "Sends promotion notes", hue: 4 },
];

export const JOINS: { fanId: string; communityId: string }[] = [
  { fanId: "f-kabir", communityId: "night-market" },
  { fanId: "f-priya", communityId: "night-market" },
  { fanId: "f-jonah", communityId: "night-market" },
  { fanId: "f-nina", communityId: "night-market" },
  { fanId: "f-meera", communityId: "test-kitchen" },
  { fanId: "f-hassan", communityId: "test-kitchen" },
  { fanId: "f-lila", communityId: "test-kitchen" },
  { fanId: "f-sam", communityId: "test-kitchen" },
  { fanId: "f-arun", communityId: "guest-spots" },
  { fanId: "f-dev", communityId: "guest-spots" },
];

type SeedSpec = {
  id: string;
  kind: Kind;
  communityId: string;
  fanId: string;
  title: string;
  body: string;
  hoursAgo: number;
  status: "open" | "accepted";
  cta?: string;
  ctaHoursAgo?: number;
};

const SPECS: SeedSpec[] = [
  {
    id: "p-dosa",
    kind: "pitch",
    communityId: "night-market",
    fanId: "f-kabir",
    title: "Film the 11pm dosa cart on Princess Street",
    body: "Can you film the dosa cart on Princess Street this Thursday at 11pm? The cook will talk if you stay for one order. I can hold the light.",
    hoursAgo: 20,
    status: "open",
  },
  {
    id: "p-map",
    kind: "pitch",
    communityId: "night-market",
    fanId: "f-priya",
    title: "A one page map for the night stalls",
    body: "Print a one page map of the Fort Kochi stalls before the next night shoot. I can sketch it from last week's walk if you mark the two you will film.",
    hoursAgo: 30,
    status: "open",
  },
  {
    id: "m-audio",
    kind: "message",
    communityId: "night-market",
    fanId: "f-jonah",
    title: "Quieter audio behind the cart",
    body: "The side street behind the dosa cart is quieter if you record there. The same cook steps out around 11pm.",
    hoursAgo: 18,
    status: "open",
  },
  {
    id: "p-curry",
    kind: "pitch",
    communityId: "test-kitchen",
    fanId: "f-meera",
    title: "Time the coconut fish curry",
    body: "Test the coconut fish curry at 20 minutes on Sunday Table. I cooked it twice and the fish stays soft. Can you try it on the next film?",
    hoursAgo: 26,
    status: "open",
  },
  {
    id: "p-pantry",
    kind: "pitch",
    communityId: "test-kitchen",
    fanId: "f-hassan",
    title: "A pantry card for the curry",
    body: "Print a pantry card for the coconut fish curry with the 20 minute clock on it. I can bring the coconut and the fish on Sunday.",
    hoursAgo: 36,
    status: "open",
  },
  {
    id: "m-bakery",
    kind: "message",
    communityId: "test-kitchen",
    fanId: "f-lila",
    title: "The first tray at 4am",
    body: "The first tray comes out of the bakery at 4am. The buns smell like butter and the street is still empty.",
    hoursAgo: 40,
    status: "open",
  },
  {
    id: "p-spice",
    kind: "pitch",
    communityId: "guest-spots",
    fanId: "f-arun",
    title: "Morning light at the spice shop",
    body: "Open the spice shop at 7am and film the first customers. I can clear the front counter for you on Saturday.",
    hoursAgo: 15,
    status: "open",
  },
  {
    id: "m-boat",
    kind: "message",
    communityId: "guest-spots",
    fanId: "f-dev",
    title: "Boat kitchen on Sunday",
    body: "The boat kitchen is free on Sunday morning if you ever want a quiet scene.",
    hoursAgo: 50,
    status: "open",
  },
  {
    id: "m-cheer",
    kind: "message",
    communityId: "night-market",
    fanId: "f-nina",
    title: "Loved the last film",
    body: "Loved the last film.",
    hoursAgo: 8,
    status: "open",
  },
  {
    id: "m-spam",
    kind: "message",
    communityId: "guest-spots",
    fanId: "f-rio",
    title: "Grow the channel fast",
    body: "I can get you 10k followers this week. DM me for the package.",
    hoursAgo: 6,
    status: "open",
  },
  {
    id: "p-bowl",
    kind: "pitch",
    communityId: "test-kitchen",
    fanId: "f-sam",
    title: "Weeknight bowls for the next film",
    body: "Can you cook three weeknight bowls that take 20 minutes? I can send the recipes I use after work.",
    hoursAgo: 120,
    status: "accepted",
    cta: "Send one weeknight bowl that takes 20 minutes. I will cook three of them in the next film.",
    ctaHoursAgo: 90,
  },
];

export type SeedItem = {
  id: string;
  kind: Kind;
  communityId: string;
  fanId: string;
  title: string;
  body: string;
  createdAt: string;
  status: "open" | "accepted";
  cta: string | null;
  postedAt: string | null;
};

export function seedItems(now: Date): SeedItem[] {
  return SPECS.map((spec) => ({
    id: spec.id,
    kind: spec.kind,
    communityId: spec.communityId,
    fanId: spec.fanId,
    title: spec.title,
    body: spec.body,
    createdAt: hoursAgo(now, spec.hoursAgo),
    status: spec.status,
    cta: spec.cta ?? null,
    postedAt: spec.ctaHoursAgo != null ? hoursAgo(now, spec.ctaHoursAgo) : null,
  }));
}

export function communityById(id: string): Community | null {
  return COMMUNITIES.find((community) => community.id === id) ?? null;
}
