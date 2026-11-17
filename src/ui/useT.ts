import { useCallback } from 'react';
import { translate, type MessageKey, type TParams } from '../content/i18n/t';
import { useSettingsStore } from '../store/settingsStore';

export type TFunction = (key: MessageKey, params?: TParams) => string;

/**
 * Returns `t(key, params?)` for the current language. Every component that shows text
 * should call this. Components re-render as soon as the language changes.
 */
export function useT(): TFunction {
  const language = useSettingsStore((state) => state.language);
  return useCallback<TFunction>((key, params) => translate(language, key, params), [language]);
}
