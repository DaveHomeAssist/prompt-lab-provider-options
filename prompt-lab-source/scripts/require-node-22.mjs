#!/usr/bin/env node

const REQUIRED_MAJOR = 22;
const [major] = process.versions.node.split('.').map(Number);

if (major !== REQUIRED_MAJOR) {
  console.warn(
    `[prompt-lab] Node ${REQUIRED_MAJOR}.x is recommended. Current runtime: ${process.versions.node}.`
  );
  console.warn(
    '[prompt-lab] Unsupported Node versions can cause local Vite builds to hang after emitting dist output.'
  );
  console.warn(
    '[prompt-lab] Use Node 22 before running build/deploy tasks. If you use a version manager, switch in the repo root first.'
  );
}
