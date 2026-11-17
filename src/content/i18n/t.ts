// Pure translation helper (SPEC §9.1). No React here, so any module can use it.
// React components use the `useT()` hook in src/ui/useT.ts, which follows the language setting.
import en from './en.json';
import si from './si.json';

export type Language = 'si' | 'en';
export type MessageKey = keyof typeof si;
export type TParams = Readonly<Record<string, string | number>>;

export const LANGUAGES: readonly Language[] = ['si', 'en'];
export const DEFAULT_LANGUAGE: Language = 'si';

// Both dictionaries are typed against the Sinhala keys, so the compiler rejects an en.json
// that is missing a key. tests/content/i18n.test.ts also catches keys that exist only in en.json.
const dictionaries: Record<Language, Record<MessageKey, string>> = { si, en };

const PLACEHOLDER = /\{(\w+)\}/g;

export function isLanguage(value: unknown): value is Language {
  return value === 'si' || value === 'en';
}

/** Replaces each `{name}` with `params.name`. Unknown placeholders are left as they are. */
export function interpolate(template: string, params?: TParams): string {
  if (!params) return template;
  return template.replace(PLACEHOLDER, (match, name: string) =>
    Object.hasOwn(params, name) ? String(params[name]) : match,
  );
}

/** Looks up `key` in `lang`, falling back to Sinhala, then fills in `{placeholder}` params. */
export function translate(lang: Language, key: MessageKey, params?: TParams): string {
  const template = dictionaries[lang][key] ?? dictionaries[DEFAULT_LANGUAGE][key] ?? key;
  return interpolate(template, params);
}
