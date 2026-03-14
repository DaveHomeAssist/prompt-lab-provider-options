# Prompt Lab — Hosted Web

Prompt Lab's public web deployment lives at `https://promptlab.tools` and is built from `prompt-lab-web/`.

The public site has two routes:

- `/` — landing page and product marketing surface
- `/app/` — shared Prompt Lab React application

The `/app/` shell reuses the same frontend source as the extension and desktop app.

## How it works

Provider API requests from the hosted app route through a Vercel Edge Function at `/api/proxy` to bypass CORS. The proxy validates the target domain against an allowlist (Anthropic, OpenAI, Gemini, OpenRouter) and forwards the request. Ollama requests go direct to localhost. API keys are entered by the user and never stored server-side.

## Dev setup

```bash
npm install
npm run dev
```

Local routes:

- `http://localhost:5174/` — landing page
- `http://localhost:5174/app/` — hosted app shell

For local proxy testing, install the Vercel CLI and use `vercel dev` instead of `npm run dev`.

## Build

```bash
npm run build
```

The Vite build is configured as a multi-page app:

- `dist/index.html` for the landing page
- `dist/app/index.html` for the shared app shell

## Deploy

```bash
cd ..
vercel
```

Vercel builds `prompt-lab-web/`, serves `prompt-lab-web/dist`, and deploys the root edge function at `/api/proxy`.

## Key files

- `../api/proxy.js` — CORS proxy edge function
- `../vercel.json` — root Vercel build config and `/app` rewrites
- `index.html` — landing page entry served at `/`
- `app/index.html` — app entry served at `/app/`
- `public/` — static assets published at the site root
- `vite.config.js` — sets `VITE_WEB_MODE=true` and builds both HTML entry points
