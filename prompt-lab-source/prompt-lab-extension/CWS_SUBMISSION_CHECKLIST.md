# Chrome Web Store Submission Checklist

## Current state

- Privacy policy already exists in [PRIVACY_POLICY.md](./PRIVACY_POLICY.md).
- Manifest permissions are narrow: `storage`, `sidePanel`, and explicit host permissions for Anthropic, OpenAI, Gemini, OpenRouter, and local Ollama endpoints.
- The extension does not request broad host access such as `<all_urls>`.

## Still needed for submission

- Store listing copy: short description, full description, category, support URL, and contact email.
- Store visuals: screenshots, small promo tile, large promo tile, and marquee assets if you plan to use them.
- Final review of onboarding copy so provider-specific key handling matches the store listing and privacy disclosures.

## Permissions review

- `storage`: required for provider settings, saved prompts, eval history, and local extension state.
- `sidePanel`: required because the product is delivered as an MV3 side panel.
- Cloud provider host permissions are scoped to the exact API origins used by the background worker.
- Localhost Ollama access is useful for development and local inference, but it is the permission most likely to need explanation during CWS review.

## Recommended pre-submit checks

- Decide whether Ollama stays in the public store build or ships in a separate developer build.
- Verify the privacy policy explicitly states that provider API keys are stored locally in extension storage and only sent to the selected provider.
- Confirm `manifest.json` description, options text, and store listing all describe the same provider set and data handling model.
- Rebuild `dist/` from the release commit and test a clean unpacked install before uploading.
