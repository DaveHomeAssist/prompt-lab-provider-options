# Prompt Lab — Hosted Web

Vite SPA deployed to Vercel. Shares the same React frontend as the extension and desktop app.

## How it works

Provider API requests are routed through a Vercel Edge Function at `/api/proxy` to bypass CORS. The proxy validates the target domain against an allowlist (Anthropic, OpenAI, Gemini, OpenRouter) and forwards the request. Ollama requests go direct to localhost. API keys are entered by the user and never stored server-side.

## Dev setup

```bash
npm install
npm run dev          # http://localhost:5174
```

For local proxy testing, install the Vercel CLI and use `vercel dev` instead of `npm run dev`.

## Deploy

```bash
cd ..
vercel               # run from prompt-lab-source/
```

Vercel builds `prompt-lab-web/`, serves `prompt-lab-web/dist`, and deploys the root edge function at `/api/proxy`.

## Key files

- `../api/proxy.js` — CORS proxy edge function (~40 lines)
- `../vercel.json` — root Vercel build config
- `vite.config.js` — sets `VITE_WEB_MODE=true` to activate proxy fetch injection
