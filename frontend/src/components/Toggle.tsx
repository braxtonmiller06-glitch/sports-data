export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Read by screen readers -- the switch has no visible text of its own. */
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-150
        focus:outline-none focus:ring-2 focus:ring-edge-500 focus:ring-offset-2 focus:ring-offset-ink-950
        ${checked ? "border-edge-500 bg-edge-500/20" : "border-ink-600 bg-ink-800"}`}
    >
      <span
        className={`absolute top-0.5 block h-4.5 w-4.5 rounded-full transition-all duration-150
          ${checked ? "left-[calc(100%-1.25rem)] bg-edge-500" : "left-0.5 bg-ink-400"}`}
      />
    </button>
  );
}
