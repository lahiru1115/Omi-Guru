// The Rules reference (SPEC §8.1 item 7): both languages have the same structure and placeholders,
// and the glossary uses every SPEC §9.2 term.
import { describe, expect, it } from 'vitest';
import en from '../../src/content/rules/en.md?raw';
import si from '../../src/content/rules/si.md?raw';
import { tokensOf } from '../../src/ui/lessonTokens';
import { parseMarkdown, type Block } from '../../src/ui/markdown';

function shape(blocks: Block[]): string[] {
  return blocks.map((b) => {
    switch (b.kind) {
      case 'heading':
        return `h${b.level}`;
      case 'paragraph':
        return 'p';
      case 'list':
        return `${b.ordered ? 'ol' : 'ul'}${b.items.length}`;
      case 'table':
        return `table${b.header.length}x${b.rows.length}`;
    }
  });
}

function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1] ?? '').sort();
}

const GLOSSARY_SI = [
  'ඉස්කෝප්පු',
  'හාත',
  'දියමන්ති',
  'කලාවර',
  'ආසය',
  'රජා',
  'රැජින',
  'ජැක්',
  'හුරුව',
  'හුරුවෙන් ගහනවා',
  'අත',
  'කැපෝති',
  'පාට',
  'පාට අනුගමනය කරනවා',
  'බෙදන්නා',
  'partner',
  'කණ්ඩායම',
  'ලකුණු',
  'වටය',
  'ගේම',
  'මුලින් දානවා',
];

describe('rules reference', () => {
  it('Sinhala and English have the same structure', () => {
    expect(shape(parseMarkdown(si))).toEqual(shape(parseMarkdown(en)));
  });

  it('uses the same scoring placeholders and card tokens in both languages', () => {
    expect(placeholders(si)).toEqual(placeholders(en));
    expect(placeholders(si)).toEqual(
      expect.arrayContaining(['trumpWin', 'defWin', 'kapothi', 'tieBonus', 'target']),
    );
    expect(tokensOf(si).sort()).toEqual(tokensOf(en).sort());
  });

  it('the glossary has every SPEC §9.2 term in both languages', () => {
    for (const source of [si, en]) {
      const glossary = parseMarkdown(source)
        .filter((b) => b.kind === 'table')
        .at(-1);
      expect(glossary?.kind).toBe('table');
      if (glossary?.kind !== 'table') return;
      expect(glossary.rows).toHaveLength(20);
      const text = glossary.rows.flat().join(' ');
      for (const term of GLOSSARY_SI) expect(text, term).toContain(term);
    }
  });
});
