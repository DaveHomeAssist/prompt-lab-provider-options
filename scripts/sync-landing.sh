#!/bin/sh
# Builds the landing page source into the GitHub Pages deploy directory.
# Run from repo root: ./scripts/sync-landing.sh

set -e

if [ ! -f "prompt-lab-source/package.json" ]; then
  echo "Error: prompt-lab-source/package.json not found" >&2
  exit 1
fi

npm --prefix prompt-lab-source run build:landing
