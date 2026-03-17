#!/usr/bin/env node

const REQUIRED_MAJOR = 22;
const [major] = process.versions.node.split('.').map(Number);

if (major !== REQUIRED_MAJOR) {
  console.error(
    `[prompt-lab] Node ${REQUIRED_MAJOR}.x is required. Current runtime: ${process.versions.node}.`
  );
  console.error('[prompt-lab] Run `nvm use` in the repo root before building or testing.');
  process.exit(1);
}
