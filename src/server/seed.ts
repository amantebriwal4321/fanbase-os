import { assignClusters } from "./assign";
import { todayKey } from "@/lib/format";
import type { Comment, Collaboration, Community, Idea, Member, StoreData, User, Vote } from "./types";

export const SEED_VERSION = 1;

export const FIELD = {
  slug: "field-notes",
  communityId: "comm_field",
  lena: "user_lena",
  jordan: "user_jordan",
  sam: "user_sam",
  priya: "user_priya",
  mateo: "user_mateo",
  june: "user_june",
  amina: "user_amina",
  freight: "idea_freight",
  river: "idea_river",
  lit: "idea_lit",
  notebook: "idea_notebook",
  mic: "idea_mic",
  zine: "idea_zine",
  bakery: "idea_bakery",
  ferry: "idea_ferry",
  garden: "idea_garden",
  saturday: "idea_saturday",
  postcard: "idea_postcard",
  map: "idea_map",
} as const;

const KEPT = "Kept by house rules. It names a concrete plan and does not copy an open idea.";

function ago(days: number, hours = 0): string {
  return new Date(Date.now() - (days * 24 + hours) * 3600 * 1000).toISOString();
}

export function buildSeed(now = new Date()): StoreData {
  const users: User[] = [
    {
      id: FIELD.lena,
      name: "Lena Park",
      email: "lena@fieldnotes.example",
      handle: "lena",
      bio: "I film people walking their cities, then cut the footage into Field Notes.",
      hue: 158,
      createdAt: ago(40),
    },
    {
      id: FIELD.jordan,
      name: "Jordan Hale",
      email: "jordan@fieldnotes.example",
      handle: "jordan",
      bio: "I carry a film camera and a paper map on every walk.",
      hue: 18,
      createdAt: ago(30),
    },
    {
      id: FIELD.sam,
      name: "Sam Okonkwo",
      email: "sam@fieldnotes.example",
      handle: "sam",
      bio: "I record city sound: horns, fans, and rooms with the lights off.",
      hue: 205,
      createdAt: ago(28),
    },
    {
      id: FIELD.priya,
      name: "Priya Shah",
      email: "priya@fieldnotes.example",
      handle: "priya",
      bio: "I sew small kits and print short runs on a risograph.",
      hue: 280,
      createdAt: ago(26),
    },
    {
      id: FIELD.mateo,
      name: "Mateo Ruiz",
      email: "mateo@fieldnotes.example",
      handle: "mateo",
      bio: "I ride the dawn ferry and know half the regulars.",
      hue: 36,
      createdAt: ago(24),
    },
    {
      id: FIELD.june,
      name: "June Adler",
      email: "june@fieldnotes.example",
      handle: "june",
      bio: "I bake the early shift and walk home when the streetlights turn off.",
      hue: 332,
      createdAt: ago(22),
    },
    {
      id: FIELD.amina,
      name: "Amina Diallo",
      email: "amina@fieldnotes.example",
      handle: "amina",
      bio: "I edit fan photos into small zines.",
      hue: 190,
      createdAt: ago(20),
    },
  ];

  const community: Community = {
    id: FIELD.communityId,
    slug: FIELD.slug,
    name: "Field Notes",
    interest: "City walks and the next season of Field Notes",
    description:
      "The fan room for Field Notes. Bring a walk, a kit, or a pitch for the next season. Spam stays out. The ideas that repeat get grouped. Lena reads a short letter each day.",
    creatorId: FIELD.lena,
    createdAt: ago(40),
  };

  const members: Member[] = users.map((user) => ({
    communityId: community.id,
    userId: user.id,
    joinedAt: user.createdAt,
  }));

  const idea = (
    partial: Pick<Idea, "id" | "authorId" | "title" | "body" | "pinned" | "stage" | "createdAt">,
  ): Idea => ({
    ...partial,
    communityId: community.id,
    qualityScore: 0.82,
    moderationNote: KEPT,
    moderationSource: "fallback",
    clusterId: null,
  });

  const ideas: Idea[] = [
    idea({
      id: FIELD.freight,
      authorId: FIELD.jordan,
      title: "Night walk on the freight spur",
      body: "Do a night walk along the old freight spur behind the mill. One flashlight each, and no phones out until the last bridge. I can sketch a one page map.",
      pinned: false,
      stage: "open",
      createdAt: ago(4, 3),
    }),
    idea({
      id: FIELD.river,
      authorId: FIELD.sam,
      title: "Night walk from the river steps",
      body: "A night walk that starts at the river steps and ends at the radio tower. Keep a quiet pace and note every block that still has a diner open.",
      pinned: false,
      stage: "open",
      createdAt: ago(5, 2),
    }),
    idea({
      id: FIELD.lit,
      authorId: FIELD.amina,
      title: "Night walk map of lit blocks",
      body: "Build a night walk map of blocks that stay lit after midnight. Fans mark porch lights, late windows, and safe crossings. Lena can open a night episode with it.",
      pinned: false,
      stage: "open",
      createdAt: ago(6, 1),
    }),
    idea({
      id: FIELD.notebook,
      authorId: FIELD.priya,
      title: "Make kit: pocket notebook",
      body: "Make a pocket notebook from scrap leather and a folded city map. Each fan sews one cover before the next group outing. I can cut the paper patterns.",
      pinned: false,
      stage: "open",
      createdAt: ago(9, 4),
    }),
    idea({
      id: FIELD.mic,
      authorId: FIELD.sam,
      title: "Make kit: tin can mic",
      body: "Make a tin can mic so fans can record street musicians. Keep the parts under ten dollars, then share the tapes in the members feed. I will test the first build.",
      pinned: false,
      stage: "open",
      createdAt: ago(10, 2),
    }),
    idea({
      id: FIELD.zine,
      authorId: FIELD.amina,
      title: "Make kit: risograph zine",
      body: "Make a risograph zine from last month's fan photos. Ten pages, two inks, stapled at the next meetup. I can run the scans this week.",
      pinned: false,
      stage: "open",
      createdAt: ago(11, 5),
    }),
    idea({
      id: FIELD.bakery,
      authorId: FIELD.june,
      title: "Episode pitch: the 4am bakery",
      body: "Episode pitch for season four. Follow the bakery that opens at 4am and the regulars who never speak until the second coffee. Film one service, with no voiceover.",
      pinned: false,
      stage: "open",
      createdAt: ago(3, 6),
    }),
    idea({
      id: FIELD.ferry,
      authorId: FIELD.mateo,
      title: "Episode pitch: the ferry worker",
      body: "Episode pitch for season four. The ferry worker who knows every regular by their order and their stop. Ride three dawn crossings and let him talk.",
      pinned: false,
      stage: "open",
      createdAt: ago(7, 3),
    }),
    idea({
      id: FIELD.garden,
      authorId: FIELD.jordan,
      title: "Episode pitch: the depot garden",
      body: "Episode pitch for season four. The rooftop garden above the bus depot, kept by the late shift drivers. Visit at shift change and cook one meal from what is ripe.",
      pinned: false,
      stage: "open",
      createdAt: ago(8, 1),
    }),
    idea({
      id: FIELD.saturday,
      authorId: FIELD.lena,
      title: "Members walk this Saturday",
      body: "Hold the next members walk this Saturday at 8pm. Meet under the stone arch by the market clock. Cap it at 18 people so it stays a walk and not a crowd.",
      pinned: true,
      stage: "open",
      createdAt: ago(1, 4),
    }),
    idea({
      id: FIELD.postcard,
      authorId: FIELD.sam,
      title: "City sound postcard",
      body: "Record a 20 minute city sound postcard for the members feed. Capture the footbridge, a hood fan, and one boat horn. No music under it.",
      pinned: false,
      stage: "in_progress",
      createdAt: ago(2, 5),
    }),
    idea({
      id: FIELD.map,
      authorId: FIELD.lena,
      title: "Paper map from season 3",
      body: "The folded paper map from season 3, with the routes we actually finished. It went out last month. Fans still write corrections in the margins.",
      pinned: false,
      stage: "shipped",
      createdAt: ago(20, 2),
    }),
  ];

  const vote = (ideaId: string, ...userIds: string[]): Vote[] => userIds.map((userId) => ({ ideaId, userId }));
  const votes: Vote[] = [
    ...vote(FIELD.freight, FIELD.lena, FIELD.sam, FIELD.priya, FIELD.mateo, FIELD.june, FIELD.amina),
    ...vote(FIELD.river, FIELD.jordan, FIELD.priya, FIELD.mateo, FIELD.june),
    ...vote(FIELD.lit, FIELD.jordan, FIELD.sam, FIELD.priya),
    ...vote(FIELD.notebook, FIELD.jordan, FIELD.amina, FIELD.lena, FIELD.mateo),
    ...vote(FIELD.mic, FIELD.priya, FIELD.jordan, FIELD.amina),
    ...vote(FIELD.zine, FIELD.priya, FIELD.june, FIELD.lena),
    ...vote(FIELD.bakery, FIELD.lena, FIELD.jordan, FIELD.sam, FIELD.mateo, FIELD.amina),
    ...vote(FIELD.ferry, FIELD.june, FIELD.jordan, FIELD.lena, FIELD.priya),
    ...vote(FIELD.garden, FIELD.sam, FIELD.june, FIELD.mateo),
    ...vote(FIELD.saturday, FIELD.jordan, FIELD.sam, FIELD.priya, FIELD.mateo, FIELD.june, FIELD.amina),
    ...vote(FIELD.postcard, FIELD.lena, FIELD.jordan, FIELD.amina),
    ...vote(FIELD.map, FIELD.jordan, FIELD.sam, FIELD.priya, FIELD.mateo, FIELD.june, FIELD.amina),
  ];

  const comments: Comment[] = [
    {
      id: "com_map_print",
      ideaId: FIELD.freight,
      authorId: FIELD.priya,
      body: "I can print the one page map if we keep it to a single side.",
      createdAt: ago(4, 1),
    },
    {
      id: "com_lights",
      ideaId: FIELD.freight,
      authorId: FIELD.sam,
      body: "I will bring two extra flashlights.",
      createdAt: ago(3, 8),
    },
    {
      id: "com_tower",
      ideaId: FIELD.river,
      authorId: FIELD.mateo,
      body: "The tower path locks at 11. If we start at 9 we still make it.",
      createdAt: ago(5),
    },
    {
      id: "com_bakery_ask",
      ideaId: FIELD.bakery,
      authorId: FIELD.lena,
      body: "This is the pitch I keep hearing in my head. June, would you ask them?",
      createdAt: ago(3, 2),
    },
    {
      id: "com_bakery_yes",
      ideaId: FIELD.bakery,
      authorId: FIELD.june,
      body: "I work the Friday pre shift. I can ask the owner before service.",
      createdAt: ago(3, 1),
    },
    {
      id: "com_cap",
      ideaId: FIELD.saturday,
      authorId: FIELD.jordan,
      body: "I can hold the list at 18 and turn people toward the next date.",
      createdAt: ago(1, 2),
    },
    {
      id: "com_horn",
      ideaId: FIELD.postcard,
      authorId: FIELD.lena,
      body: "I started the field recording. The boat horn is already in the first minute.",
      createdAt: ago(1, 6),
    },
    {
      id: "com_mic_cost",
      ideaId: FIELD.mic,
      authorId: FIELD.jordan,
      body: "If the parts stay under ten dollars I will build one this week.",
      createdAt: ago(9),
    },
  ];

  const collaborations: Collaboration[] = [
    {
      id: "col_print",
      ideaId: FIELD.freight,
      userId: FIELD.priya,
      note: "I will print the one page map.",
      createdAt: ago(4),
    },
    {
      id: "col_list",
      ideaId: FIELD.saturday,
      userId: FIELD.jordan,
      note: "I will keep the headcount at 18.",
      createdAt: ago(1, 1),
    },
    {
      id: "col_intro",
      ideaId: FIELD.bakery,
      userId: FIELD.june,
      note: "I can introduce Lena to the owner before Friday service.",
      createdAt: ago(3),
    },
    {
      id: "col_mic",
      ideaId: FIELD.mic,
      userId: FIELD.jordan,
      note: "I will test one build and report how it sounds.",
      createdAt: ago(8),
    },
    {
      id: "col_cut",
      ideaId: FIELD.postcard,
      userId: FIELD.amina,
      note: "I can cut the quiet parts so the feed version stays short.",
      createdAt: ago(2),
    },
  ];

  const data: StoreData = {
    seedVersion: SEED_VERSION,
    users,
    communities: [community],
    members,
    ideas,
    votes,
    comments,
    collaborations,
    clusters: [],
    summaries: [],
    magicTokens: [],
  };

  assignClusters(data, community.id, null);

  data.summaries.push({
    id: "sum_seed",
    communityId: community.id,
    day: todayKey(now),
    headline: "Saturday's walk is full, and the night routes are piling up",
    body: [
      "Members are ready for the Saturday walk under the stone arch. Jordan offered to hold the list at 18. The night walks on the freight spur, from the river steps, and across the lit blocks are really one idea: a quiet route after dark.",
      "The strongest season four pitch is the 4am bakery. June can make the introduction. The pocket notebook, the tin can mic, and the risograph zine are kits people can make together. The paper map from season 3 has already shipped.",
    ].join("\n\n"),
    source: "fallback",
    topIdeaIds: [FIELD.saturday, FIELD.freight, FIELD.bakery],
    createdAt: ago(0, 2),
  });

  return data;
}
