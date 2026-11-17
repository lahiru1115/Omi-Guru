// The card back: an original lattice pattern drawn in SVG (SPEC §8.3).
import { useId } from 'react';

type Props = { className?: string };

export function CardBack({ className }: Props) {
  const id = useId().replace(/:/g, '');
  const pattern = `cb-${id}`;
  return (
    <svg className={`card card--back ${className ?? ''}`} viewBox="0 0 60 84" aria-hidden="true">
      <defs>
        <pattern id={pattern} width="10" height="10" patternUnits="userSpaceOnUse">
          <rect width="10" height="10" className="card-back__bg" />
          <path d="M5 0 L10 5 L5 10 L0 5 Z" className="card-back__diamond" />
          <circle cx="5" cy="5" r="1.2" className="card-back__dot" />
        </pattern>
      </defs>
      <rect className="card-back__edge" x="0.75" y="0.75" width="58.5" height="82.5" rx="5" />
      <rect x="4.5" y="4.5" width="51" height="75" rx="3" fill={`url(#${pattern})`} />
      <rect className="card-back__frame" x="4.5" y="4.5" width="51" height="75" rx="3" />
    </svg>
  );
}
