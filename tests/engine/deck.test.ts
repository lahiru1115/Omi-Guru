import { describe, expect, it } from 'vitest';
import { createDeck, dealBlocks } from '../../src/engine/deck';
import { mulberry32, shuffle } from '../../src/engine/rng';
import { nextSeat, SEATS } from '../../src/engine/rules';
import { applyAction, createGame } from '../../src/engine/stateMachine';
import { settings } from './helpers';

describe('deck', () => {
  it('has 32 unique cards, 8 per suit, ranks A–7', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(32);
    expect(new Set(deck.map((c) => c.id)).size).toBe(32);
    for (const suit of ['S', 'H', 'D', 'C']) {
      expect(deck.filter((c) => c.suit === suit)).toHaveLength(8);
    }
  });
});

describe('dealBlocks', () => {
  it.each(SEATS)('deals 4 + 4 per player starting from next(dealer) (dealer %i)', (dealer) => {
    const deck = createDeck();
    const { first, second } = dealBlocks(deck, dealer);
    const order = [nextSeat(dealer)];
    while (order.length < 4) order.push(nextSeat(order[order.length - 1]!));
    expect(order[3]).toBe(dealer); // the dealer gets their cards last

    order.forEach((seat, i) => {
      expect(first[seat]).toEqual(deck.slice(i * 4, i * 4 + 4));
      expect(second[seat]).toEqual(deck.slice(16 + i * 4, 16 + i * 4 + 4));
    });
    const all = [...first.flat(), ...second.flat()].map((c) => c.id);
    expect(new Set(all).size).toBe(32);
  });

  it('rejects a deck that is not 32 cards', () => {
    expect(() => dealBlocks(createDeck().slice(1), 0)).toThrow();
  });
});

describe('seeded deal', () => {
  const firstHands = (seed: number) =>
    applyAction(createGame(settings(), seed), { type: 'START_ROUND' }).round.hands;

  it('is reproducible with the same seed', () => {
    expect(firstHands(1234)).toEqual(firstHands(1234));
  });

  it('differs between seeds', () => {
    expect(firstHands(1)).not.toEqual(firstHands(2));
  });

  it('shuffles the deck', () => {
    const shuffled = shuffle(createDeck(), mulberry32(7));
    expect(shuffled.map((c) => c.id)).not.toEqual(createDeck().map((c) => c.id));
  });
});
