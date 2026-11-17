import { describe, expect, it } from 'vitest';
import { parseTokens, tokensOf } from '../../src/ui/lessonTokens';
import { parseInline, parseMarkdown } from '../../src/ui/markdown';

describe('parseMarkdown', () => {
  it('parses headings, paragraphs, lists and tables', () => {
    const blocks = parseMarkdown(
      [
        '# Title',
        '',
        'First line',
        'same paragraph.',
        '',
        '## Section',
        '- one',
        '- two',
        '1. first',
        '2. second',
        '',
        '| A | B |',
        '|---|---|',
        '| 1 | 2 |',
        '| 3 | |',
      ].join('\n'),
    );
    expect(blocks).toEqual([
      { kind: 'heading', level: 1, text: 'Title' },
      { kind: 'paragraph', text: 'First line same paragraph.' },
      { kind: 'heading', level: 2, text: 'Section' },
      { kind: 'list', ordered: false, items: ['one', 'two'] },
      { kind: 'list', ordered: true, items: ['first', 'second'] },
      {
        kind: 'table',
        header: ['A', 'B'],
        rows: [
          ['1', '2'],
          ['3', ''],
        ],
      },
    ]);
  });

  it('handles Windows line endings', () => {
    expect(parseMarkdown('# A\r\n\r\ntext\r\n')).toEqual([
      { kind: 'heading', level: 1, text: 'A' },
      { kind: 'paragraph', text: 'text' },
    ]);
  });
});

describe('parseInline', () => {
  it('splits on **bold**', () => {
    expect(parseInline('a **b** c')).toEqual([
      { text: 'a ', bold: false },
      { text: 'b', bold: true },
      { text: ' c', bold: false },
    ]);
  });
});

describe('lesson tokens', () => {
  it('finds card and suit tokens', () => {
    expect(parseTokens('Play [10H] or [AS], trumps [D].')).toEqual([
      { kind: 'text', text: 'Play ' },
      { kind: 'card', id: '10H' },
      { kind: 'text', text: ' or ' },
      { kind: 'card', id: 'AS' },
      { kind: 'text', text: ', trumps ' },
      { kind: 'suit', suit: 'D' },
      { kind: 'text', text: '.' },
    ]);
    expect(tokensOf('[KC] [S] [5H] [X]')).toEqual(['KC', 'S']);
  });
});
