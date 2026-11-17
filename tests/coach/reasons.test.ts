import { describe, expect, it } from 'vitest';
import en from '../../src/content/i18n/en.json';
import si from '../../src/content/i18n/si.json';
import {
  MISTAKE_KEY,
  mistakeMessage,
  REASON_KEY,
  reasonMessage,
  trumpHintMessage,
  VERDICT_KEY,
  verdictMessage,
} from '../../src/coach/reasons';
import { coachText } from '../../src/ui/coachText';
import { done, trick, viewFrom } from '../ai/helpers';

describe('coach texts (SPEC §5.2–§5.5)', () => {
  it('every reason, mistake and verdict has text in both languages', () => {
    const keys = [
      ...Object.values(REASON_KEY),
      ...Object.values(MISTAKE_KEY),
      ...Object.values(VERDICT_KEY),
      'trumpHint.text',
      'trumpHint.textNoHigh',
    ];
    expect(keys).toHaveLength(13 + 7 + 3 + 2);
    for (const key of keys) {
      expect(si, key).toHaveProperty([key]);
      expect(en, key).toHaveProperty([key]);
    }
  });

  it('fills card and suit names into reason texts', () => {
    const view = viewFrom({ hand: '9S 7S AD 8C', current: trick(3, 'KH') });
    const ruff = reasonMessage('RUFF', view, '7S');
    expect(ruff).toEqual({ key: 'reason.RUFF', params: { suit: 'H' } });
    expect(coachText('en', ruff)).toBe('You have no Hearts. Play a trump to win the trick.');
    expect(coachText('si', ruff)).toBe('ඔයා ළඟ හාත නෑ. හුරුවෙන් ගහලා අත දිනන්න.');

    const cash = reasonMessage('CASH_MASTER', viewFrom({ hand: 'AH 7H' }), 'AH');
    expect(coachText('en', cash)).toBe(
      'A♥︎ is now the highest Hearts card left. Use it to take the trick.',
    );
  });

  it('names the suit an opponent is void in for AVOID_OPPONENT_RUFF', () => {
    const completed = [done(trick(0, 'KH', '8C', '7H', '9H'), 0)];
    const view = viewFrom({ hand: 'QH JH 10H 8D 7D 9S 8S', completed });
    expect(reasonMessage('AVOID_OPPONENT_RUFF', view, '7D').params).toEqual({ suit: 'H' });
  });

  it('OVERPAID_WIN names the cheaper winning card', () => {
    const view = viewFrom({ hand: 'AH QH 8H 7C', current: trick(1, '9H', '7H', 'JH') });
    const message = mistakeMessage('OVERPAID_WIN', view, 'AH');
    expect(coachText('en', message)).toBe('You won with A♥︎, but Q♥︎ would also have won.');
  });

  it('verdict headers', () => {
    expect(coachText('en', verdictMessage('GOOD', 'AH'))).toBe('✅ Good choice!');
    expect(coachText('en', verdictMessage('BETTER_EXISTS', '7H'))).toBe(
      '⚠️ There was a better card: 7♥︎',
    );
  });

  it('trump hint text, with and without high cards', () => {
    const withHigh = trumpHintMessage({
      suit: 'H',
      count: 3,
      highCards: ['AH', 'KH'],
      ranking: [],
    });
    expect(coachText('en', withHigh)).toBe(
      'Choose Hearts: 3 of your 4 cards are Hearts, including high cards like A♥︎, K♥︎.',
    );
    const noHigh = trumpHintMessage({ suit: 'C', count: 2, highCards: [], ranking: [] });
    expect(coachText('en', noHigh)).toBe('Choose Clubs: 2 of your 4 cards are Clubs.');
  });
});
