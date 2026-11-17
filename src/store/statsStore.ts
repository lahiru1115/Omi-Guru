// Zustand store for the stats (SPEC §10.3), saved to omi.stats.v1 after every event.
import { create } from 'zustand';
import { loadJSON, saveJSON, STORAGE_KEYS } from '../storage/persist';
import { applyStatsEvent, emptyStats, parseStats, type StatsData, type StatsEvent } from './stats';

type StatsStore = StatsData & {
  record: (event: StatsEvent) => void;
  reset: () => void;
};

function dataOf(state: StatsData): StatsData {
  return { v: 1, real: state.real, practice: state.practice };
}

export const useStatsStore = create<StatsStore>()((set, get) => ({
  ...parseStats(loadJSON(STORAGE_KEYS.stats)),
  record: (event) => {
    const next = applyStatsEvent(dataOf(get()), event);
    set(next);
    saveJSON(STORAGE_KEYS.stats, next);
  },
  reset: () => set(emptyStats()),
}));

/** Records a stats event from non-React code (the game store). */
export function recordStats(event: StatsEvent): void {
  useStatsStore.getState().record(event);
}
