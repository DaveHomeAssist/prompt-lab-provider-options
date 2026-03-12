# Prompt Lab — Browser Extension

AI prompt enhancer, library, composer, A/B tester, and notepad.  
Manifest V3 · Vivaldi / Chrome · No `unsafe-eval`

## Quick Start (Load Unpacked)

1. Unzip `prompt-lab-dist.zip`
2. Open `vivaldi://extensions` (or `chrome://extensions`)
3. Enable **Developer mode**
4. **Load unpacked** → select the `dist/` folder
5. Click extension icon → **Options**
6. Choose provider:
   - **Anthropic API**: paste your key and save
   - **Ollama (local)**: set base URL (default `http://localhost:11434`) and model (for example `llama3.2:3b`)
6. Web Panel: right-click sidebar → **Add Web Panel** → `chrome-extension://<ID>/panel.html`

## Development

```bash
# Install
npm install

# Generate icons (one-time)
node scripts/gen-icons.js

# Dev server (hot reload, no extension features)
npm run dev

# Production build + extension assembly
npm run build
```

Build output lands in `dist/` — that folder IS the loadable extension.

## Project Structure

```
src/
  main.jsx          Entry point
  App.jsx           Full app (Editor, Composer, A/B Test, Pad)
  icons.jsx         SVG icon system (replaces lucide-react)
  api.js            chrome.runtime.sendMessage wrapper
  index.css         Tailwind directives + scrollbar styles

extension/
  manifest.json     MV3 manifest (no unsafe-eval)
  background.js     Service worker — holds API key, proxies fetch
  options.html/js   API key management page
  icons/            16, 48, 128px PNGs

scripts/
  assemble.js       Post-build: copies extension/* into dist/
  gen-icons.js      Generates icons with pngjs
```

## Key Architecture Decisions

- **No `unsafe-eval`**: Vite compiles JSX at build time. No Babel standalone needed at runtime.
- **Provider isolation**: Credentials/settings live in `chrome.storage.local`, accessed only by `background.js`. Never touches the page.
- **Icon system**: Custom `Ic` component with inline SVG paths. No npm icon library needed.
- **Clipboard**: Hybrid — `navigator.clipboard` first, `execCommand` fallback for restricted contexts.
- **Storage**: `localStorage` for library, collections, pad, and color mode.

## Model Config

- Anthropic mode: `claude-sonnet-4-20250514`
- Ollama mode: configured local model (default `llama3.2:3b`)
- Enhance: 1500 max tokens
- A/B Test: 800 max tokens
