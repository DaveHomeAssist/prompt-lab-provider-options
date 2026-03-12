const DEFAULT_COMPLEX_THRESHOLD = 420;

export const LINT_RULES = Object.freeze({
  GOAL: 'goal-intent',
  ROLE: 'role-definition',
  CONSTRAINTS: 'constraints',
  OUTPUT_FORMAT: 'output-format',
  EXAMPLE_IO: 'example-io',
});

export const LINT_QUICK_FIXES = Object.freeze([
  {
    id: 'role-section',
    label: 'Insert role section',
    snippet: 'Role:\nYou are a precise assistant specialized in this task.\n\n',
    placement: 'top',
  },
  {
    id: 'constraints-section',
    label: 'Insert constraints section',
    snippet: '\nConstraints:\n- Keep response under 200 words.\n- Use concise, plain language.\n- Include only relevant details.\n',
    placement: 'bottom',
  },
  {
    id: 'output-format-section',
    label: 'Insert output format section',
    snippet: '\nOutput format:\n- Use markdown headings.\n- Include a short summary, then bullet points.\n',
    placement: 'bottom',
  },
  {
    id: 'example-io-block',
    label: 'Insert example I/O block',
    snippet: '\nExample:\nInput: "Summarize this release note for executives."\nOutput:\n## Executive Summary\n- Key outcome...\n- Risks...\n',
    placement: 'bottom',
  },
]);

function lineFromIndex(text, index) {
  if (index <= 0) return 1;
  return text.slice(0, index).split('\n').length;
}

function findInTopLines(lines, regex, maxLines = 4) {
  return lines.slice(0, maxLines).some((line) => regex.test(line));
}

function findMatchMeta(text, regex, fallbackLine = 1) {
  const match = text.match(regex);
  if (!match || typeof match.index !== 'number') {
    return {
      line: fallbackLine,
      range: { start: 0, end: 0 },
    };
  }
  return {
    line: lineFromIndex(text, match.index),
    range: { start: match.index, end: match.index + match[0].length },
  };
}

export function lintPrompt(prompt, options = {}) {
  const text = String(prompt || '');
  const trimmed = text.trim();
  if (!trimmed) return [];

  const complexThreshold = Number(options.complexThreshold || DEFAULT_COMPLEX_THRESHOLD);
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  const issues = [];

  const hasGoalNearTop = findInTopLines(
    lines,
    /\b(goal|objective|task|you will|please|need to|generate|create|write|analyze|summarize)\b/i
  );
  if (!hasGoalNearTop) {
    issues.push({
      id: LINT_RULES.GOAL,
      message: 'Add an explicit goal/intent sentence near the top.',
      severity: 'warning',
      ...findMatchMeta(text, /^[^\n]+/m),
    });
  }

  const needsRole = trimmed.length > 140;
  const hasRole = /\b(you are|act as|your role|role:)\b/i.test(text);
  if (needsRole && !hasRole) {
    issues.push({
      id: LINT_RULES.ROLE,
      message: 'Consider defining a role ("You are ...") for complex tasks.',
      severity: 'info',
      ...findMatchMeta(text, /^[^\n]+/m),
    });
  }

  const hasConstraints = /\b(must|should|do not|don't|avoid|at most|no more than|exactly|limit|constraint)\b/i.test(text);
  if (!hasConstraints) {
    issues.push({
      id: LINT_RULES.CONSTRAINTS,
      message: 'Add constraints (length, style, exclusions, or boundaries).',
      severity: 'info',
      ...findMatchMeta(text, /^[^\n]+/m),
    });
  }

  const hasFormat = /\b(output|format|respond in|json|yaml|xml|markdown|table|bullet|list|sections?)\b/i.test(text);
  if (!hasFormat) {
    issues.push({
      id: LINT_RULES.OUTPUT_FORMAT,
      message: 'Specify the desired output format (e.g., JSON, list, markdown sections).',
      severity: 'warning',
      ...findMatchMeta(text, /^[^\n]+/m),
    });
  }

  const complexTask = trimmed.length > complexThreshold;
  const hasExample = /\bexample\b/i.test(text) || (/\binput\b/i.test(text) && /\boutput\b/i.test(text));
  if (complexTask && !hasExample) {
    issues.push({
      id: LINT_RULES.EXAMPLE_IO,
      message: 'For long/complex prompts, include at least one example input/output block.',
      severity: 'info',
      ...findMatchMeta(text, /^[^\n]+/m),
    });
  }

  return issues;
}

export function applyQuickFix(prompt, fixId) {
  const text = String(prompt || '');
  const fix = LINT_QUICK_FIXES.find((entry) => entry.id === fixId);
  if (!fix) return text;
  if (fix.placement === 'top') return `${fix.snippet}${text}`.trim();
  return `${text}${fix.snippet}`.trim();
}
