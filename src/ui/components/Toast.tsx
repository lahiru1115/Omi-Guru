// A short message near the hand that disappears by itself (illegal taps, bot trump choices).
import { useEffect } from 'react';

type Props = {
  message: string;
  nonce: number; // a new nonce restarts the timer and the entry animation
  tone?: 'info' | 'warn';
  onDone: () => void;
  durationMs?: number;
};

export function Toast({ message, nonce, tone = 'info', onDone, durationMs = 2800 }: Props) {
  useEffect(() => {
    const handle = setTimeout(onDone, durationMs);
    return () => clearTimeout(handle);
  }, [nonce, onDone, durationMs]);

  return (
    <div key={nonce} className={`toast toast--${tone}`} role="status">
      {message}
    </div>
  );
}
