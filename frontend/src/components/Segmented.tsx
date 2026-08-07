import type { ReactNode } from "react";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
  /** Small text under the label -- e.g. how many legs qualify. */
  hint?: string;
  disabled?: boolean;
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (next: T) => void;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex overflow-hidden rounded-lg border border-ink-700"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={opt.disabled}
            onClick={() => onChange(opt.value)}
            className={`flex items-center gap-2 border-l border-ink-700 px-4 py-2.5 text-sm
              transition-colors duration-150 first:border-l-0 disabled:cursor-not-allowed
              disabled:opacity-40
              ${
                active
                  ? "bg-edge-500/12 text-edge-400"
                  : "bg-ink-800 text-ink-300 hover:text-ink-50"
              }`}
          >
            {opt.icon}
            <span>
              {opt.label}
              {opt.hint ? (
                <span className="block text-[11px] text-ink-400">{opt.hint}</span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
