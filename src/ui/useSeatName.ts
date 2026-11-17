import { useCallback } from 'react';
import { DEFAULT_GAME_SETTINGS, type Seat } from '../engine/types';
import { useSettingsStore } from '../store/settingsStore';
import { useT } from './useT';

/** An empty name falls back to the default bot name. Seat 0 is "ඔයා" / "You"; bots use the editable names from settings (SPEC §8.5). */
export function useSeatName(): (seat: Seat) => string {
  const t = useT();
  const botNames = useSettingsStore((s) => s.botNames);
  return useCallback(
    (seat: Seat) =>
      seat === 0 ? t('seat.you') : botNames[seat] || DEFAULT_GAME_SETTINGS.botNames[seat],
    [t, botNames],
  );
}
