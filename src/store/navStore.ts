// Which screen is showing when no game is in progress (SPEC §8.1). A game in progress always shows
// the game table (see App.tsx).
import { create } from 'zustand';

export type Screen =
  { name: 'home' } | { name: 'lessons' } | { name: 'lesson'; id: string } | { name: 'rules' };

type NavStore = { screen: Screen; go: (screen: Screen) => void };

export const useNavStore = create<NavStore>()((set) => ({
  screen: { name: 'home' },
  go: (screen) => {
    set({ screen });
    globalThis.scrollTo?.(0, 0);
  },
}));
