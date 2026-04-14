# Canonical Prompt Lab Tools

These public tool pages are canonical product surfaces. Do not delete, rename, or move them during cleanup, bundling, or route consolidation work unless the retirement steps in this document are completed in the same change.

## Cleanup Contract

- Treat these files as shipped product, not scratch HTML.
- Do not delete them because they appear standalone, old, or lightly referenced.
- If a route changes, add a redirect in `vercel.json` instead of breaking old URLs.
- If a tool is retired, update `tools.html`, `sitemap.xml`, `README.md` if needed, and this manifest in the same change.
- If a tool gains a required support asset, list that asset here too.

## Canonical Tools

| Tool | Source file | Canonical route | Legacy route coverage | Runtime notes | Owner |
|---|---|---|---|---|---|
| Script Agent | `prompt-lab-web/public/script-agent.html` | `/script-agent` | `/scriptagent.html` | Browser only. BYO key. Direct calls to Gemini, Anthropic, or OpenAI. | Dave |
| Prompt Explorer | `prompt-lab-web/public/prompt-explorer.html` | `/prompt-explorer` | `/tools/prompt-explorer.html` | Browser only. BYO key. Standalone prompt branching and image workflow. | Dave |
| Thread Namer | `prompt-lab-web/public/thread-namer.html` | `/thread-namer` | `/tools/thread-namer.html` | Browser only. BYO key. Standalone title generation workflow. | Dave |
| Prompt Embed | `prompt-lab-web/public/prompt-embed.html` | `/prompt-embed.html` | `/embed`, `/tools/prompt-embed.html` | Browser only. No provider call required. | Dave |
| Tools Hub | `prompt-lab-web/public/tools.html` | `/tools` | `/tools/index.html` | Directory page for the canonical public tool set. | Dave |

## Retirement Steps

If one of these tools is intentionally retired:

1. Replace the public route with a redirect or a clear successor route.
2. Remove or update the card in `prompt-lab-web/public/tools.html`.
3. Remove or update the entry in `prompt-lab-web/public/sitemap.xml`.
4. Update this file and `DOCS_INVENTORY.md`.
5. Verify the public build and confirm old links no longer hard fail without explanation.

## Review Notes

- `.github/CODEOWNERS` should continue to require Dave review for these files.
- HTML banner comments at the top of each canonical tool file are intentional and should remain.
