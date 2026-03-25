#!/usr/bin/env node

const REQUIRED_MAJOR = 22;
const [major] = process.versions.node.split('.').map(Number);

if (major !== REQUIRED_MAJOR) {
  console.warn(
    `[prompt-lab] Node ${REQUIRED_MAJOR}.x is recommended. Current runtime: ${process.versions.node}.`
  );
  console.warn('[prompt-lab] Run `nvm use` in the repo root if you hit compatibility issues.');
}
