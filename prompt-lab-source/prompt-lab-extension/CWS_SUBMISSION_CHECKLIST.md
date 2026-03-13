# Chrome Web Store Submission Checklist

## Current state

- Privacy policy already exists in [PRIVACY_POLICY.md](./PRIVACY_POLICY.md).
- Manifest permissions are narrow: `storage`, `sidePanel`, and explicit host permissions for Anthropic, OpenAI, Gemini, OpenRouter, and local Ollama endpoints.
- The extension does not request broad host access such as `<all_urls>`.
- CI exists for the extension in `.github/workflows/extension-ci.yml` and currently gates `npm test` and `npm run build`.
- The desktop app is a separate Tauri target and is out of scope for Chrome Web Store packaging.

## Still needed for submission

- Store listing copy: short description, full description, category, support URL, and contact email.
- Store visuals: screenshots, small promo tile, large promo tile, and marquee assets if you plan to use them.
- Final review of onboarding copy so provider-specific key handling matches the store listing and privacy disclosures.
- Decide whether the public store build should include Ollama localhost permissions or whether that stays in a separate developer/distribution build.

## Permissions review

- `storage`: required for provider settings, saved prompts, eval history, and local extension state.
- `sidePanel`: required because the product is delivered as an MV3 side panel.
- Cloud provider host permissions are scoped to the exact API origins used by the background worker.
- Localhost Ollama access is useful for development and local inference, but it is the permission most likely to need explanation during CWS review.

## Recommended pre-submit checks

- Verify the privacy policy explicitly states that provider API keys are stored locally in extension storage and only sent to the selected provider.
- Confirm `manifest.json`, `README.md`, options UI, and store listing all describe the same five-provider support matrix.
- Rebuild `dist/` from the release commit and test a clean unpacked install before uploading.
- Run `npm test`, `npm run build`, and the extension smoke test before packaging the release ZIP.
