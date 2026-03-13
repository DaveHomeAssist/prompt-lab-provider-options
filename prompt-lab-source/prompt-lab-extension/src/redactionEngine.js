import { patterns, scanForPII } from './lib/piiEngine.js';

export const REDACTION_SETTINGS_KEY = 'pl2-redaction-settings';

const TYPE_META = {
  ...Object.fromEntries(
    Object.entries(patterns).map(([type, meta]) => [type, {
      label: meta.label,
      description: meta.description,
      placeholder: meta.placeholder,
    }]),
  ),
  custom: {
    label: 'Custom pattern',
    description: 'Matched a user-defined sensitive-data pattern.',
    placeholder: 'REDACTED',
  },
};

export function defaultRedactionSettings() {
  return {
    enabled: true,
    patterns: Object.fromEntries([...Object.keys(patterns), 'custom'].map((type) => [type, true])),
    customPatterns: [],
  };
}

export function loadRedactionSettings() {
  try {
    const raw = localStorage.getItem(REDACTION_SETTINGS_KEY);
    if (!raw) return defaultRedactionSettings();
    const parsed = JSON.parse(raw);
    return {
      ...defaultRedactionSettings(),
      ...parsed,
      patterns: {
        ...defaultRedactionSettings().patterns,
        ...(parsed?.patterns || {}),
      },
      customPatterns: Array.isArray(parsed?.customPatterns)
        ? parsed.customPatterns.filter(p => typeof p === 'string' && p.trim())
        : [],
    };
  } catch {
    return defaultRedactionSettings();
  }
}

export function saveRedactionSettings(settings) {
  try {
    localStorage.setItem(REDACTION_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('[PromptLab] save redaction settings', e?.message || e);
  }
}

export function detectSensitiveData(text, settings = defaultRedactionSettings()) {
  if (!settings?.enabled) return [];
  const source = typeof text === 'string' ? text : '';
  if (!source.trim()) return [];

  return scanForPII(source, {
    patterns: settings.patterns,
    customPatterns: settings.customPatterns,
  }).findings;
}

function placeholderFor(type, index) {
  const base = TYPE_META[type]?.placeholder || 'REDACTED';
  return index > 1 ? `${base}_${index}` : base;
}

export function redactSensitiveData(text, matches, existingMap) {
  const source = typeof text === 'string' ? text : '';
  if (!Array.isArray(matches) || matches.length === 0) {
    return {
      redactedText: source,
      redactionMap: existingMap || {},
    };
  }

  const map = existingMap ? { ...existingMap } : {};
  const typeCounters = {};
  const sorted = [...matches]
    .filter(m => Number.isFinite(m.start) && Number.isFinite(m.end) && m.end > m.start)
    .sort((a, b) => b.start - a.start);

  let out = source;
  sorted.forEach((m) => {
    const value = source.slice(m.start, m.end);
    if (!value) return;
    if (!map[value]) {
      typeCounters[m.type] = (typeCounters[m.type] || 0) + 1;
      map[value] = placeholderFor(m.type, typeCounters[m.type]);
    }
    out = `${out.slice(0, m.start)}${map[value]}${out.slice(m.end)}`;
  });

  return {
    redactedText: out,
    redactionMap: map,
  };
}

export function redactPayloadStrings(payload, settings, existingMap) {
  const map = existingMap ? { ...existingMap } : {};
  const found = [];

  const visit = (value) => {
    if (typeof value === 'string') {
      const matches = detectSensitiveData(value, settings);
      if (!matches.length) return value;
      found.push(...matches);
      return redactSensitiveData(value, matches, map).redactedText;
    }
    if (Array.isArray(value)) return value.map(visit);
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, visit(v)]));
    }
    return value;
  };

  return {
    payload: visit(payload),
    matches: found,
    redactionMap: map,
  };
}

export function sensitiveTypeMeta() {
  return TYPE_META;
}
