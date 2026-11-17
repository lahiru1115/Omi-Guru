// Equivalent cards (SPEC §5.1): same-suit cards that are adjacent once played cards are removed count
// as the same card. The logic lives in src/ai/ because the Hard bot also uses it to skip simulating
// cards that are equally good.
export { areEquivalent, groupEquivalent, knownCards } from '../ai/equivalence';
