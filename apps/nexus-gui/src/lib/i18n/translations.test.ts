import { describe, expect, it } from 'vitest';

import { APP_COPY } from './translations';

type FlatStringMap = Record<string, string>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function flattenStringLeafNodes(value: unknown, path = '', out: FlatStringMap = {}): FlatStringMap {
  if (typeof value === 'string') {
    out[path] = value;
    return out;
  }

  if (!isRecord(value)) {
    return out;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    const nestedPath = path.length > 0 ? `${path}.${key}` : key;
    flattenStringLeafNodes(nestedValue, nestedPath, out);
  }

  return out;
}

function extractPlaceholders(text: string): string[] {
  const matches = text.matchAll(/\{([a-zA-Z0-9_]+)\}/g);
  return Array.from(new Set(Array.from(matches, (match) => match[1]))).sort();
}

describe('translations', () => {
  it('keeps identical key paths between English and Myanmar copies', () => {
    const english = flattenStringLeafNodes(APP_COPY.en);
    const myanmar = flattenStringLeafNodes(APP_COPY.my);

    expect(Object.keys(myanmar).sort()).toEqual(Object.keys(english).sort());
  });

  it('keeps placeholder variables aligned between English and Myanmar copies', () => {
    const english = flattenStringLeafNodes(APP_COPY.en);
    const myanmar = flattenStringLeafNodes(APP_COPY.my);
    const keys = Object.keys(english);

    for (const key of keys) {
      const englishPlaceholders = extractPlaceholders(english[key]);
      const myanmarPlaceholders = extractPlaceholders(myanmar[key] ?? '');
      expect(myanmarPlaceholders).toEqual(englishPlaceholders);
    }
  });
});
