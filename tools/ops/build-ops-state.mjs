#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT = { id: "prompt-lab", name: "PromptLab" };
const SCHEMA_VERSION = 1;
const STALE_AFTER_MINUTES = 1440;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..", "..");
const SOURCE = join(ROOT, "prompt-lab-source");
const EXTENSION = join(SOURCE, "prompt-lab-extension");
const DESKTOP = join(SOURCE, "prompt-lab-desktop");
const WEB = join(SOURCE, "prompt-lab-web");
const OUT = join(ROOT, "ops-state.json");

function safeRead(filePath) {
  try { return readFileSync(filePath, "utf8"); } catch { return null; }
}

function safeJson(filePath) {
  const raw = safeRead(filePath);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function safeStat(filePath) {
  try { return statSync(filePath); } catch { return null; }
}

function safeReaddir(dirPath) {
  try { return readdirSync(dirPath); } catch { return []; }
}

function git(args) {
  try {
    return execFileSync("git", ["-C", ROOT, ...args], { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return null;
  }
}

function minutesSince(iso) {
  if (!iso) return null;
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return null;
  return Math.round((Date.now() - time) / 60000);
}

function packageInfo(dirPath) {
  const pkg = safeJson(join(dirPath, "package.json"));
  return {
    exists: Boolean(pkg),
    version: pkg?.version || null,
    scripts: pkg?.scripts || {},
  };
}

function hasAnyScript(pkg, names) {
  return names.some((name) => Boolean(pkg.scripts?.[name]));
}

function workflowCount() {
  return safeReaddir(join(ROOT, ".github", "workflows")).filter((name) => /\.ya?ml$/i.test(name)).length;
}

const rootPkg = packageInfo(SOURCE);
const extensionPkg = packageInfo(EXTENSION);
const desktopPkg = packageInfo(DESKTOP);
const webPkg = packageInfo(WEB);
const hasSource = existsSync(SOURCE);
const hasNodeModules = existsSync(join(SOURCE, "node_modules"));
const hasExtensionDist = existsSync(join(EXTENSION, "dist"));
const hasDesktopDist = existsSync(join(DESKTOP, "dist"));
const hasWebDist = existsSync(join(WEB, "dist"));
const hasArchitecture = existsSync(join(SOURCE, "ARCHITECTURE.md"));
const hasDocsInventory = existsSync(join(SOURCE, "DOCS_INVENTORY.md"));
const hasClaude = existsSync(join(SOURCE, "CLAUDE.md"));
const hasCodex = existsSync(join(SOURCE, "CODEX.md"));
const hasPreflight = existsSync(join(SOURCE, "scripts", "preflight.mjs"));
const hasPlaywright = existsSync(join(EXTENSION, "playwright.config.js"));
const workflows = workflowCount();

const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]);
const lastCommitAt = git(["log", "-1", "--format=%cI"]);
const dirtyOutput = git(["status", "--porcelain"]);
const dirty = dirtyOutput == null ? null : dirtyOutput.length > 0;
const ageMinutes = minutesSince(lastCommitAt);

let freshness = "unknown";
if (lastCommitAt && ageMinutes != null) {
  freshness = ageMinutes <= STALE_AFTER_MINUTES ? "fresh" : "stale";
} else if (!existsSync(join(ROOT, ".git"))) {
  freshness = "missing";
}

const kpis = [
  { label: "Root package", value: rootPkg.exists ? rootPkg.version || "present" : "missing", status: rootPkg.exists ? "ok" : "err" },
  { label: "Extension shell", value: extensionPkg.exists ? "present" : "missing", status: extensionPkg.exists ? "ok" : "err" },
  { label: "Desktop shell", value: desktopPkg.exists ? "present" : "missing", status: desktopPkg.exists ? "ok" : "warn" },
  { label: "Web shell", value: webPkg.exists ? "present" : "missing", status: webPkg.exists ? "ok" : "warn" },
  { label: "Branch", value: branch || "unknown", status: branch === "main" ? "ok" : branch ? "warn" : "unknown" },
  { label: "Working tree", value: dirty == null ? "unknown" : dirty ? "dirty" : "clean", status: dirty == null ? "unknown" : dirty ? "warn" : "ok" },
  { label: "Deps installed", value: hasNodeModules ? "yes" : "no", status: hasNodeModules ? "ok" : "warn" },
  { label: "Build script", value: hasAnyScript(rootPkg, ["build"]) ? "present" : "missing", status: hasAnyScript(rootPkg, ["build"]) ? "ok" : "warn" },
  { label: "Test script", value: hasAnyScript(rootPkg, ["test"]) ? "present" : "missing", status: hasAnyScript(rootPkg, ["test"]) ? "ok" : "warn" },
  { label: "Preflight", value: hasPreflight && hasAnyScript(rootPkg, ["preflight"]) ? "configured" : "missing", status: hasPreflight && hasAnyScript(rootPkg, ["preflight"]) ? "ok" : "warn" },
  { label: "Playwright", value: hasPlaywright ? "configured" : "missing", status: hasPlaywright ? "ok" : "warn" },
  { label: "Workflows", value: String(workflows), status: workflows > 0 ? "ok" : "warn" },
  { label: "Extension dist", value: hasExtensionDist ? "present" : "missing", status: hasExtensionDist ? "ok" : "warn" },
  { label: "Desktop dist", value: hasDesktopDist ? "present" : "missing", status: hasDesktopDist ? "ok" : "warn" },
  { label: "Web dist", value: hasWebDist ? "present" : "missing", status: hasWebDist ? "ok" : "warn" },
  { label: "Architecture doc", value: hasArchitecture ? "present" : "missing", status: hasArchitecture ? "ok" : "warn" },
  { label: "Docs inventory", value: hasDocsInventory ? "present" : "missing", status: hasDocsInventory ? "ok" : "warn" },
];

const issues = [];
if (!hasSource) issues.push({ id: "missing-source", severity: "P1", status: "open", title: "prompt-lab-source is missing", source: "prompt-lab-source" });
if (!rootPkg.exists) issues.push({ id: "missing-root-package", severity: "P1", status: "open", title: "Root source package.json is missing", source: "prompt-lab-source/package.json" });
if (dirty === true) issues.push({ id: "git-dirty", severity: "P3", status: "open", title: "Working tree has uncommitted changes", source: ".git" });
if (!hasPreflight) issues.push({ id: "missing-preflight", severity: "P2", status: "open", title: "Preflight script is missing", source: "prompt-lab-source/scripts/preflight.mjs" });
if (!hasArchitecture) issues.push({ id: "missing-architecture", severity: "P2", status: "open", title: "Architecture document is missing", source: "prompt-lab-source/ARCHITECTURE.md" });

function rollup() {
  if (kpis.some((kpi) => kpi.status === "err") || issues.some((issue) => issue.severity === "P0" || issue.severity === "P1")) return "err";
  if (kpis.some((kpi) => kpi.status === "warn") || issues.some((issue) => issue.severity === "P2")) return "warn";
  if (kpis.some((kpi) => kpi.status === "unknown")) return "unknown";
  return "ok";
}

const status = rollup();
const recommendations = [];
function recommend(priority, title, reason, command = null) {
  recommendations.push({ priority, title, reason, command });
}

if (dirty === true) recommend("P2", "Stabilize working tree", "PromptLab has many uncommitted changes, so ops status should be reviewed before release.", "git status --short");
if (freshness === "stale") recommend("P2", "Refresh project activity", "Latest commit activity is outside the freshness window.");
if (!hasExtensionDist) recommend("P2", "Build extension shell", "The shared extension shell has no dist output.", "npm run build");
if (!hasDesktopDist) recommend("P3", "Build or document desktop output", "Desktop dist is missing.");
if (!hasWebDist) recommend("P3", "Build or document web output", "Web dist is missing.");
if (!hasPreflight) recommend("P2", "Restore preflight surface", "The root package references preflight and should keep that check healthy.");
if (!hasArchitecture || !hasDocsInventory) recommend("P3", "Review canonical docs", "Architecture and docs inventory should stay present and current.");

const sections = [
  {
    title: "Shells",
    items: kpis.filter((item) => ["Extension shell", "Desktop shell", "Web shell"].includes(item.label)),
  },
  {
    title: "Validation",
    items: kpis.filter((item) => ["Build script", "Test script", "Preflight", "Playwright", "Workflows"].includes(item.label)),
  },
  {
    title: "Artifacts",
    items: kpis.filter((item) => ["Extension dist", "Desktop dist", "Web dist", "Deps installed"].includes(item.label)),
  },
  {
    title: "Git and Docs",
    items: kpis.filter((item) => ["Branch", "Working tree", "Architecture doc", "Docs inventory"].includes(item.label)),
  },
];

const summaryParts = [];
summaryParts.push(rootPkg.version ? `v${rootPkg.version}` : "version unclear");
summaryParts.push("three shell architecture");
if (branch) summaryParts.push(`branch ${branch}`);
if (dirty != null) summaryParts.push(dirty ? "dirty tree" : "clean tree");
if (issues.length) summaryParts.push(`${issues.length} open issue${issues.length === 1 ? "" : "s"}`);

const links = [];
if (hasClaude) links.push({ label: "CLAUDE.md", path: "prompt-lab-source/CLAUDE.md" });
if (hasCodex) links.push({ label: "CODEX.md", path: "prompt-lab-source/CODEX.md" });
if (hasArchitecture) links.push({ label: "ARCHITECTURE.md", path: "prompt-lab-source/ARCHITECTURE.md" });
if (hasDocsInventory) links.push({ label: "DOCS_INVENTORY.md", path: "prompt-lab-source/DOCS_INVENTORY.md" });
if (rootPkg.exists) links.push({ label: "Root package", path: "prompt-lab-source/package.json" });
if (extensionPkg.exists) links.push({ label: "Extension package", path: "prompt-lab-source/prompt-lab-extension/package.json" });
if (desktopPkg.exists) links.push({ label: "Desktop package", path: "prompt-lab-source/prompt-lab-desktop/package.json" });
if (webPkg.exists) links.push({ label: "Web package", path: "prompt-lab-source/prompt-lab-web/package.json" });

const state = {
  project: PROJECT,
  status,
  freshness,
  updatedAt: new Date().toISOString(),
  summary: summaryParts.join(" · "),
  recommendations,
  sections,
  kpis,
  issues,
  links,
  metadata: {
    generator: "tools/ops/build-ops-state.mjs",
    schemaVersion: SCHEMA_VERSION,
    root: relative(process.cwd(), ROOT) || ".",
    sourceRoot: relative(ROOT, SOURCE),
    lastCommitAt,
    lastCommitAgeMinutes: ageMinutes,
    staleAfterMinutes: STALE_AFTER_MINUTES,
  },
};

try {
  writeFileSync(OUT, JSON.stringify(state, null, 2) + "\n", "utf8");
} catch (error) {
  console.error("[ops] write failed:", error?.message || error);
  process.exit(2);
}

console.log(`[ops] wrote ${OUT}`);
console.log(`[ops] status=${status} freshness=${freshness} kpis=${kpis.length} issues=${issues.length} recommendations=${recommendations.length} sections=${sections.length}`);
