// A tiny Markdown parser for the Rules screen (src/content/rules/*.md). It supports only what the
// rules use: # / ## / ### headings, paragraphs, "-" and "1." lists, | tables | and **bold**.
// No dependency and no HTML output: the screen renders the blocks with React.

export type Inline = { text: string; bold: boolean };

export type Block =
  | { kind: 'heading'; level: 1 | 2 | 3; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'table'; header: string[]; rows: string[][] };

const HEADING = /^(#{1,3})\s+(.*)$/;
const BULLET = /^[-*]\s+(.*)$/;
const NUMBERED = /^\d+\.\s+(.*)$/;
const TABLE_RULE = /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?$/;

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) blocks.push({ kind: 'paragraph', text: paragraph.join(' ') });
    paragraph = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = (lines[i] ?? '').trim();
    if (line === '') {
      flushParagraph();
      continue;
    }
    const heading = HEADING.exec(line);
    if (heading) {
      flushParagraph();
      blocks.push({
        kind: 'heading',
        level: (heading[1] ?? '#').length as 1 | 2 | 3,
        text: (heading[2] ?? '').trim(),
      });
      continue;
    }
    const bullet = BULLET.exec(line);
    const numbered = NUMBERED.exec(line);
    if (bullet || numbered) {
      flushParagraph();
      const ordered = numbered !== null;
      const pattern = ordered ? NUMBERED : BULLET;
      const items: string[] = [];
      while (i < lines.length) {
        const match = pattern.exec((lines[i] ?? '').trim());
        if (!match) break;
        items.push((match[1] ?? '').trim());
        i++;
      }
      i--;
      blocks.push({ kind: 'list', ordered, items });
      continue;
    }
    if (line.startsWith('|') && TABLE_RULE.test((lines[i + 1] ?? '').trim())) {
      flushParagraph();
      const header = splitRow(line);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && (lines[i] ?? '').trim().startsWith('|')) {
        rows.push(splitRow(lines[i] ?? ''));
        i++;
      }
      i--;
      blocks.push({ kind: 'table', header, rows });
      continue;
    }
    paragraph.push(line);
  }
  flushParagraph();
  return blocks;
}

/** Splits text on **bold** markers. */
export function parseInline(text: string): Inline[] {
  const parts: Inline[] = [];
  const pieces = text.split('**');
  pieces.forEach((piece, i) => {
    if (piece !== '') parts.push({ text: piece, bold: i % 2 === 1 });
  });
  return parts;
}
