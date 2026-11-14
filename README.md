# Fanbase OS

A link in bio hub that turns a creator's inbox into communities, ranked ideas, and a call the fans can act on.

Built for Persist Ventures Startupathon, round 1: Build the Operating System for Fanbases.

## Problem

Creators with large audiences drown in DMs, comments, and half formed ideas. The useful people in that audience never get a way to work together, and "pay to message me" throws away what is sitting in the inbox.

## Core loop

One creator, one loop:

1. A fan opens the creator's public hub, the link that would sit in a bio.
2. The fan joins an interest community and pitches an idea.
3. The creator's desk groups pitches and messages by topic, then puts a few on top. Each one has a score and a short reason. The ranking rules stay on screen.
4. The creator accepts a pitch and posts a call to action. The call shows on the public hub.

The seeded creator is Rhea Kapoor (`@sundaytable`). Her fans already left pitches and messages, so the desk is alive before you add anything. No account, no payment, no app install.

## Architecture

Next.js App Router and TypeScript. The pages are server rendered. Forms post to server actions.

There is no database. Vercel does not give every function a shared disk, and provisioning Postgres or Redis would be extra setup this demo does not need. The seed lives in `src/server/seed.ts`, so every visitor, on every instance, sees Rhea, her communities, and the inbox. Joins, new pitches, and calls are stored in an httpOnly cookie on that browser. The next request can hit any instance. The server reads the cookie and lays it over the seed. Reset demo clears the cookie.

The tradeoff is honest: notes you add live in that browser only. Two people on two phones will not see each other's new pitches. The shared story is the seed, which is the same everywhere. That is enough for a zero setup deploy, and it is what a two minute demo needs. The cookie is capped around 3.5 KB. If a session outgrows it, the desk asks you to reset.

Ranking does not depend on a model. `src/server/rank.ts` scores every open note:

| Rule | Points |
| --- | --- |
| Concrete detail (a place, time, number, or named thing) | +2 |
| Clear ask (what to do next) | +2 |
| At least two other open notes share the topic | +2 |
| Arrived in the last 7 days | +1 |

Spam is dropped. So is a note with no detail and no ask. A note needs 5 points to be eligible. The desk shows at most 3, and at most 2 from the same topic, so one loud group cannot fill the list. The same rules are rendered from that module, so the panel cannot drift from the code.

## How AI is used

The model does two jobs only: name a topic, and write a one sentence summary. It does not pick the winner and it does not change the score.

`src/server/ai.ts` calls Gemini when `GEMINI_API_KEY` is set. Otherwise it calls an OpenAI compatible chat API when `OPENAI_API_KEY` or `AI_API_KEY` is set. If both are set, Gemini wins. The button on the desk is Group again with the model.

If no key is set, or the call fails, or the JSON is unusable, the same screen keeps working. Topics come from house rules (keyword phrases for night markets, the test kitchen, and guest spots). The badge on each note says Topic from rules or Topic from the model. Scores always say which rules fired.

New pitches are classified with house rules immediately, so sending one never waits on the network. Group again is the model step.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. You are on Rhea's hub. Creator desk is in the header.

```bash
npm test
npm run lint
npm run build
```

Copy `.env.example` to `.env.local` only if you want the model. The demo is complete with every variable empty.

## Env vars

| Name | Required | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | No | Gemini. Names topics and writes summaries. Wins if other keys are also set. |
| `OPENAI_API_KEY` | No | OpenAI, or any compatible chat API. Used when `GEMINI_API_KEY` is empty. |
| `AI_API_KEY` | No | Alias for `OPENAI_API_KEY`. |
| `AI_BASE_URL` | No | OpenAI compatible base. Default `https://api.openai.com/v1`. |
| `AI_MODEL` | No | Overrides the model for the active provider. Gemini default `gemini-2.5-flash`. OpenAI default `gpt-4o-mini`. |

No database URL. No auth secret.

## Deploy on Vercel

The repo root is the app.

- Framework preset: Next.js
- Root directory: `.`
- Build command: `next build` (the default)
- Install command: `npm install` (the default)
- Output: leave the default Next.js output. Do not set a custom directory.
- Node.js: 20 or newer

Do not add a Postgres, Redis, Blob, or KV integration. Do not set any environment variable for the basic demo. Add `GEMINI_API_KEY` or `OPENAI_API_KEY` only if you want Group again to call a model.

Cookies must be allowed. They are on by default. The cookie is marked Secure when `VERCEL` is set, which Vercel does on every deploy. Local http still works.

## Demo

See [DEMO_SCRIPT.md](DEMO_SCRIPT.md) for the two minute path: public hub, join, pitch, grouped desk, accept, call back on the hub.
