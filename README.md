# Fanbase OS

A working room for a creator and the people who already care.

Built for Persist Startupathon: Build the Operating System for Fanbases.

## Problem

Fan comments are a pile. A good idea sits next to spam, repeats, and one line cheers. The creator cannot tell what the room actually wants, and members cannot build on each other's posts.

## Core flow

1. A creator opens a community around one interest.
2. Members post ideas.
3. Members upvote, comment, and join an idea with a note about what they will do.
4. Each new idea is filtered. Spam and thin posts are turned away. Similar ideas are grouped.
5. The creator reads a daily letter about the top ideas, then pins one, marks it in progress, or marks it shipped.

The seeded room is Field Notes, Lena Park's community for city walks and the next season of her series. You can open it with no account.

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:3000 and choose Enter Field Notes.

Useful scripts:

```bash
npm test
npm run lint
npm run build
```

With no environment variables, the app stores data in `data/store.json` and uses the built in house rules for filtering, clustering, and the daily letter. On Vercel, that file fallback uses `/tmp`, which does not last across instances. Set `DATABASE_URL` for a room that keeps posts.

## Env vars

Copy `.env.example` to `.env.local`.

| Name | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string from Neon or Supabase. Optional. |
| `DATABASE_SSL` | Set to `disable` for a local Postgres without SSL. |
| `AUTH_SECRET` | Signs session cookies. Set a long random value in production. |
| `APP_URL` | Public site URL, no trailing slash. Used for magic links and the GitHub callback. |
| `AI_API_KEY` | Key for an OpenAI compatible chat API. Preferred name. |
| `OPENAI_API_KEY` | Used when `AI_API_KEY` is empty. |
| `AI_BASE_URL` | API base. Default `https://api.openai.com/v1`. For Vercel AI Gateway use `https://ai-gateway.vercel.sh/v1`. |
| `AI_MODEL` | Default `gpt-4o-mini`. |
| `GITHUB_CLIENT_ID` | GitHub OAuth. Callback is `{APP_URL}/api/auth/github/callback`. |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth secret. |
| `RESEND_API_KEY` | Sends magic links. When empty, the sign in page shows the link. |
| `EMAIL_FROM` | From address for Resend. |

Demo sign in does not need any of these. Use Demo member (Jordan Hale) or Demo creator (Lena Park). Magic link and GitHub are real sign in paths for everyone else. A new email joins Field Notes, or the room in the link you came from.

## Where AI is used and why

All three jobs live in `src/server/ai.ts`.

1. **Filter.** When a member posts an idea, the module checks for spam, copies, and posts with nothing to do. The creator should not have to read junk. Comments and collaboration notes use the same spam screen.
2. **Cluster.** After a kept idea, the module groups posts that propose a similar thing, such as night walks or episode pitches. Repeats become one theme instead of a long list.
3. **Daily letter.** When the creator asks, the module writes a short brief that names the leading ideas and the newest post, plus one next step.

If `AI_API_KEY` and `OPENAI_API_KEY` are empty, or the model call fails, the same module uses house rules: a spam list, a concrete detail check, shared phrases for clusters, and a template letter. The demo runs with no key. The idea page labels the path as House filter or Model filter. The letter says House letter or Model.

## Deploy

From a logged in Vercel account:

```bash
npx vercel --prod
```

Set `DATABASE_URL` on the project so posts last. Without it, the app uses `/tmp` on Vercel. The seeded room still loads, and new posts can disappear when that instance resets.

## Demo

See [DEMO_SCRIPT.md](DEMO_SCRIPT.md) for a two minute walkthrough.

Lena can restore the original Field Notes data from the daily letter page. That also removes rooms created after the seed.
