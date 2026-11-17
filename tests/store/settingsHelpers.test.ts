import { describe, expect, it } from 'vitest';
import { clampSetting, SETTING_BOUNDS } from '../../src/store/mergeSettings';
import { parseSeed } from '../../src/store/resetAll';

describe('clampSetting', () => {
  it('keeps values inside the bounds and rounds them', () => {
    expect(clampSetting('targetScore', 0)).toBe(SETTING_BOUNDS.targetScore.min);
    expect(clampSetting('targetScore', 99)).toBe(SETTING_BOUNDS.targetScore.max);
    expect(clampSetting('tieBonus', -1)).toBe(0);
    expect(clampSetting('kapothiPoints', 3.6)).toBe(4);
    expect(clampSetting('defenderWinPoints', Number.NaN)).toBe(0);
  });

  it('accepts every default value unchanged', () => {
    expect(clampSetting('targetScore', 10)).toBe(10);
    expect(clampSetting('trumpTeamWinPoints', 1)).toBe(1);
    expect(clampSetting('defenderWinPoints', 2)).toBe(2);
    expect(clampSetting('kapothiPoints', 3)).toBe(3);
    expect(clampSetting('tieBonus', 1)).toBe(1);
  });
});

describe('parseSeed', () => {
  it('accepts whole numbers from 0 to 2^32 - 1', () => {
    expect(parseSeed(' 42 ')).toBe(42);
    expect(parseSeed('0')).toBe(0);
    expect(parseSeed('4294967295')).toBe(4294967295);
  });

  it('rejects anything else', () => {
    expect(parseSeed('')).toBeNull();
    expect(parseSeed('-1')).toBeNull();
    expect(parseSeed('1.5')).toBeNull();
    expect(parseSeed('abc')).toBeNull();
    expect(parseSeed('4294967296')).toBeNull();
  });
});
