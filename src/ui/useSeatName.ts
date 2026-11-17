import { useCallback } from 'react';
import type { Seat } from '../engine/types';
import { useSettingsStore } from '../store/settingsStore';
import { useT } from './useT';

/** Seat 0 is "ඔයා" / "You"; bots use the editable names from settings (SPEC §8.5). */
export function useSeatName(): (seat: Seat) => string {
  const t = useT();
  const botNames = useSettingsStore((s) => s.botNames);
  return useCallback(
    (seat: Seat) => (seat === 0 ? t('seat.you') : botNames[seat] || t('seat.you')),
    [t, botNames],
  );
}
