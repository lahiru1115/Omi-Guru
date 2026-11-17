import { describe, expect, it } from 'vitest';
import en from '../../src/content/i18n/en.json';
import si from '../../src/content/i18n/si.json';
import { interpolate, isLanguage, translate, type MessageKey } from '../../src/content/i18n/t';

const dictionaries = { si, en } as const;
const siKeys = Object.keys(si) as MessageKey[];

function placeholderNames(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
}

describe('i18n dictionaries (SPEC §12 Content)', () => {
  it('si.json and en.json have exactly the same keys', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(si).sort());
  });

  it('has no empty strings', () => {
    for (const [lang, dictionary] of Object.entries(dictionaries)) {
      for (const [key, value] of Object.entries(dictionary)) {
        expect(value.trim(), `${lang}: ${key}`).not.toBe('');
      }
    }
  });

  it('uses the same {placeholders} in both languages', () => {
    for (const key of siKeys) {
      expect(placeholderNames(en[key]), key).toEqual(placeholderNames(si[key]));
    }
  });
});

describe('translate', () => {
  it('returns Sinhala and English text for the same key', () => {
    expect(translate('si', 'app.title')).toBe('ඕමි ගුරු');
    expect(translate('en', 'app.title')).toBe('Omi Guru');
  });

  it('returns the dictionary text unchanged when there are no params', () => {
    for (const key of siKeys) {
      expect(translate('si', key)).toBe(si[key]);
      expect(translate('en', key)).toBe(en[key]);
    }
  });
});

describe('interpolate', () => {
  it('fills in {placeholder} params, including numbers', () => {
    expect(interpolate('{suit} තෝරන්න: {count}ක්', { suit: 'ඉස්කෝප්පු', count: 3 })).toBe(
      'ඉස්කෝප්පු තෝරන්න: 3ක්',
    );
  });

  it('replaces every occurrence of a placeholder', () => {
    expect(interpolate('{suit} and {suit}', { suit: 'Spades' })).toBe('Spades and Spades');
  });

  it('leaves unknown placeholders untouched', () => {
    expect(interpolate('{card} wins', { suit: 'Hearts' })).toBe('{card} wins');
  });

  it('returns the template as is when params are omitted', () => {
    expect(interpolate('{card} wins')).toBe('{card} wins');
  });
});

describe('isLanguage', () => {
  it('accepts only supported languages', () => {
    expect(isLanguage('si')).toBe(true);
    expect(isLanguage('en')).toBe(true);
    expect(isLanguage('ta')).toBe(false);
    expect(isLanguage(undefined)).toBe(false);
  });
});
