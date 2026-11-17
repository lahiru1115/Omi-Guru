// The coach bubble (SPEC §6.1, §8.2). Feedback and bot explanations close by themselves after
// 3 seconds; tapping the bubble keeps it open. A hint stays until the human plays or closes it.
import { useEffect, useState } from 'react';
import type { CoachMessage } from '../../coach/reasons';
import { useSettingsStore } from '../../store/settingsStore';
import { coachText } from '../coachText';
import { useT } from '../useT';

export const COACH_AUTO_HIDE_MS = 3000;

type Props = {
  header?: CoachMessage;
  lines: readonly CoachMessage[];
  /** Shown when there are no lines (e.g. a bot that gave no reason). */
  emptyText?: string;
  autoHide: boolean;
  nonce: number;
  onClose: () => void;
};

export function CoachBubble({ header, lines, emptyText, autoHide, nonce, onClose }: Props) {
  const t = useT();
  const language = useSettingsStore((s) => s.language);
  const [pinnedNonce, setPinnedNonce] = useState<number | null>(null);
  const pinned = pinnedNonce === nonce;

  useEffect(() => {
    if (!autoHide || pinned) return;
    const timer = setTimeout(onClose, COACH_AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [autoHide, pinned, nonce, onClose]);

  const body = lines.map((line) => coachText(language, line));
  if (body.length === 0 && emptyText) body.push(emptyText);

  return (
    <div
      className={`coach ${pinned ? 'coach--pinned' : ''}`}
      role="status"
      aria-live="polite"
      onClick={() => setPinnedNonce(nonce)}
    >
      <span className="coach__icon" aria-hidden="true">
        💬
      </span>
      <div className="coach__text">
        {header && <p className="coach__header">{coachText(language, header)}</p>}
        {body.map((text, i) => (
          <p key={i} className="coach__line">
            {text}
          </p>
        ))}
        {autoHide && !pinned && <p className="coach__keep">{t('coach.tapToKeep')}</p>}
      </div>
      <button
        type="button"
        className="coach__close"
        aria-label={t('coach.close')}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        ✕
      </button>
    </div>
  );
}
