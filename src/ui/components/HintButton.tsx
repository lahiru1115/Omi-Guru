// A round practice tool button (💡 hint, ↶ undo, 👁 show all, 📋 tracker), at least 44 px (SPEC §8.2).
type Props = {
  icon: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
};

export function HintButton({ icon, label, onClick, disabled = false, pressed }: Props) {
  return (
    <button
      type="button"
      className={`tool-btn ${pressed ? 'tool-btn--on' : ''}`}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
    >
      <span aria-hidden="true">{icon}</span>
      <span className="tool-btn__label">{label}</span>
    </button>
  );
}
