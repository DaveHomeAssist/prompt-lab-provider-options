#!/usr/bin/env node

import { readFile, mkdir, cp, rm, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const sourceDir = resolve(scriptDir, '..');
const repoDir = resolve(sourceDir, '..');
const sourceVercelDir = join(sourceDir, '.vercel');
const repoVercelDir = join(repoDir, '.vercel');
const sourceProjectFile = join(sourceVercelDir, 'project.json');
const repoProjectFile = join(repoVercelDir, 'project.json');
const prod = process.argv.includes('--prod');

async function pathExists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

async function ensureSourceProjectLink() {
  if (!await pathExists(sourceProjectFile)) {
    throw new Error('Missing prompt-lab-source/.vercel/project.json. Run `vercel link` from prompt-lab-source first.');
  }
}

async function prepareRepoLink() {
  const sourceProjectJson = await readFile(sourceProjectFile, 'utf8');

  if (await pathExists(repoProjectFile)) {
    const repoProjectJson = await readFile(repoProjectFile, 'utf8');
    if (repoProjectJson.trim() !== sourceProjectJson.trim()) {
      throw new Error('Repo root already has a different .vercel/project.json. Remove it or deploy manually.');
    }
    return false;
  }

  await mkdir(repoVercelDir, { recursive: true });
  await cp(sourceProjectFile, repoProjectFile);

  const sourceReadme = join(sourceVercelDir, 'README.txt');
  if (await pathExists(sourceReadme)) {
    await cp(sourceReadme, join(repoVercelDir, 'README.txt'));
  }

  return true;
}

async function runDeploy() {
  await ensureSourceProjectLink();
  const createdRepoLink = await prepareRepoLink();

  try {
    await new Promise((resolvePromise, rejectPromise) => {
      const child = spawn(
        'vercel',
        ['deploy', '-y', ...(prod ? ['--prod'] : [])],
        { cwd: repoDir, stdio: 'inherit' },
      );

      child.on('error', rejectPromise);
      child.on('close', (code) => {
        if (code === 0) {
          resolvePromise();
          return;
        }
        rejectPromise(new Error(`vercel deploy exited with code ${code ?? 'unknown'}`));
      });
    });
  } finally {
    if (createdRepoLink) {
      await rm(repoVercelDir, { recursive: true, force: true });
    }
  }
}

runDeploy().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
