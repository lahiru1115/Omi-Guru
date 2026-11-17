// Rules reference (SPEC §8.1 item 7): the full rules in Sinhala or English plus the glossary
// (SPEC §9.2), from src/content/rules/*.md. Scoring numbers come from the house-rule settings.
import { Fragment } from 'react';
import en from '../../content/rules/en.md?raw';
import si from '../../content/rules/si.md?raw';
import { interpolate, type Language } from '../../content/i18n/t';
import { scoringParams } from '../../lessons/lessonRunner';
import { useNavStore } from '../../store/navStore';
import { getSettings, useSettingsStore } from '../../store/settingsStore';
import { BackIcon } from '../components/BackIcon';
import { LanguageToggle } from '../components/LanguageToggle';
import { LessonText } from '../components/LessonText';
import { parseInline, parseMarkdown, type Block } from '../markdown';
import '../styles/lesson.css';
import { useT } from '../useT';

const SOURCES: Record<Language, string> = { si, en };

function InlineText({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((part, i) =>
        part.bold ? (
          <strong key={i}>
            <LessonText as="span" text={part.text} />
          </strong>
        ) : (
          <LessonText key={i} as="span" text={part.text} />
        ),
      )}
    </>
  );
}

function RulesBlock({ block }: { block: Block }) {
  switch (block.kind) {
    case 'heading': {
      const Tag = block.level === 1 ? 'h1' : block.level === 2 ? 'h2' : 'h3';
      return (
        <Tag className={`rules__h${block.level}`}>
          <InlineText text={block.text} />
        </Tag>
      );
    }
    case 'paragraph':
      return (
        <p className="rules__p">
          <InlineText text={block.text} />
        </p>
      );
    case 'list': {
      const Tag = block.ordered ? 'ol' : 'ul';
      return (
        <Tag className="rules__list">
          {block.items.map((item, i) => (
            <li key={i}>
              <InlineText text={item} />
            </li>
          ))}
        </Tag>
      );
    }
    case 'table':
      return (
        <div className="rules__table-wrap">
          <table className="rules__table">
            <thead>
              <tr>
                {block.header.map((cell, i) => (
                  <th key={i} scope="col">
                    <InlineText text={cell} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <td key={c}>
                      <InlineText text={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

export function Rules() {
  const t = useT();
  const go = useNavStore((s) => s.go);
  const language = useSettingsStore((s) => s.language);
  const blocks = parseMarkdown(interpolate(SOURCES[language], scoringParams(getSettings())));
  // The page title comes from i18n; the Markdown's own # heading is skipped.
  const body = blocks[0]?.kind === 'heading' && blocks[0].level === 1 ? blocks.slice(1) : blocks;

  return (
    <main className="rules">
      <header className="page-bar">
        <button
          type="button"
          className="icon-btn"
          aria-label={t('rules.back')}
          title={t('rules.back')}
          onClick={() => go({ name: 'home' })}
        >
          <BackIcon />
        </button>
        <h1 className="page-bar__title">{t('rules.title')}</h1>
        <LanguageToggle />
      </header>
      <article className="rules__body" lang={language}>
        {body.map((block, i) => (
          <Fragment key={i}>
            <RulesBlock block={block} />
          </Fragment>
        ))}
      </article>
    </main>
  );
}
