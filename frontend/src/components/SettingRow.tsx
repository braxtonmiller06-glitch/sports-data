import type { ReactNode } from "react";

export function SettingGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-ink-700 bg-ink-900">
      <header className="border-b border-ink-700 bg-ink-800/60 px-4 py-3">
        <h3 className="text-[11px] font-medium uppercase tracking-[0.17em] text-ink-400">
          {title}
        </h3>
      </header>
      <div className="divide-y divide-ink-800">{children}</div>
    </section>
  );
}

export function SettingRow({
  title,
  description,
  htmlFor,
  error,
  children,
}: {
  title: string;
  description: string;
  /** When the control is a single input, wire the title to it as a real label. */
  htmlFor?: string;
  /** Validation message for this row's control, shown in place of the description. */
  error?: string;
  children: ReactNode;
}) {
  const Heading = htmlFor ? "label" : "span";
  return (
    <div className="flex flex-wrap items-center gap-4 px-4 py-4">
      <div className="min-w-[12rem] flex-1">
        <Heading
          {...(htmlFor ? { htmlFor } : {})}
          className="block text-sm font-semibold text-ink-50"
        >
          {title}
        </Heading>
        {error ? (
          <span
            {...(htmlFor ? { id: `${htmlFor}-error` } : {})}
            role="alert"
            className="mt-1 block text-[13px] leading-relaxed text-danger-500"
          >
            {error}
          </span>
        ) : (
          <span className="mt-1 block text-[13px] leading-relaxed text-ink-300">{description}</span>
        )}
      </div>
      <div className="ml-auto shrink-0">{children}</div>
    </div>
  );
}

export function NumberInput({
  id,
  value,
  onChange,
  min,
  max,
  step = 1,
  prefix,
  suffix,
  width = "w-32",
  invalid = false,
}: {
  id: string;
  value: number | "";
  onChange: (next: number | "") => void;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
  suffix?: string;
  width?: string;
  invalid?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {prefix ? <span className="text-sm text-ink-400">{prefix}</span> : null}
      <input
        id={id}
        type="number"
        inputMode="decimal"
        value={value}
        min={min}
        max={max}
        step={step}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-error` : undefined}
        // Empty string rather than 0 while the field is being cleared, so
        // backspacing the last digit doesn't fight the user by snapping to 0.
        // Number("") is 0 and Number("abc") is NaN, so both are filtered here
        // rather than reaching the validator as a bogus figure.
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") return onChange("");
          const parsed = Number(raw);
          onChange(Number.isNaN(parsed) ? "" : parsed);
        }}
        className={`${width} rounded-lg border bg-ink-800 px-3 py-2.5 text-sm tabular-nums
          text-ink-50 focus:outline-none focus:ring-1
          ${
            invalid
              ? "border-danger-500 focus:border-danger-500 focus:ring-danger-500"
              : "border-ink-700 focus:border-edge-500 focus:ring-edge-500"
          }`}
      />
      {suffix ? <span className="text-sm text-ink-400">{suffix}</span> : null}
    </div>
  );
}

export function Select<T extends string>({
  id,
  value,
  onChange,
  options,
}: {
  id: string;
  value: T;
  onChange: (next: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="cursor-pointer rounded-lg border border-ink-700 bg-ink-800 px-3 py-2.5 text-sm
        text-ink-50 focus:border-edge-500 focus:outline-none focus:ring-1 focus:ring-edge-500"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
