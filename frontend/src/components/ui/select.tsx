import type { ComponentProps } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

/**
 * Compact labelled select.
 *
 * Built on a native `<select>` deliberately: the tool headers carry several of
 * these side by side, and the platform control gives correct keyboard handling,
 * a usable touch picker, and no popover layering to fight with inside a dense
 * toolbar.
 */
export function Select({
  label,
  options,
  className,
  ...props
}: ComponentProps<"select"> & { label?: string; options: SelectOption[] }) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      {label && (
        <span className="text-[10px] font-medium tracking-[0.12em] text-fg-faint">
          {label.toUpperCase()}
        </span>
      )}
      <span className="relative flex items-center">
        <select
          className={cn(
            "h-9 w-full appearance-none rounded-lg border border-line bg-inset",
            "pl-3 pr-8 text-[13px] text-fg outline-none",
            "transition-colors duration-[120ms] hover:border-line-hi focus:border-atlas/50",
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-2.5 size-3.5 text-fg-faint"
        />
      </span>
    </label>
  );
}
