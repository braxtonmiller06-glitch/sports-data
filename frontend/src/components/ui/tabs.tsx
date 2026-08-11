import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TabDef {
  id: string;
  label: string;
  /** Optional trailing count or marker. */
  badge?: ReactNode;
}

interface TabsProps {
  tabs: TabDef[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}

/**
 * Underlined tab bar.
 *
 * Hand-rolled rather than pulled in as a dependency: the behaviour needed here
 * is one row of buttons with arrow-key movement, and the list scrolls
 * horizontally on narrow screens instead of wrapping, which keeps the page from
 * reflowing as tabs are added.
 */
export function Tabs({ tabs, active, onChange, className }: TabsProps) {
  const groupId = useId();

  function onKeyDown(event: React.KeyboardEvent, index: number) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const next = event.key === "ArrowRight" ? index + 1 : index - 1;
    const target = tabs[(next + tabs.length) % tabs.length];
    onChange(target.id);
    document.getElementById(`${groupId}-tab-${target.id}`)?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label="Research sections"
      className={cn(
        "scrollbar-atlas flex gap-1 overflow-x-auto border-b border-line",
        className,
      )}
    >
      {tabs.map((tab, index) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            id={`${groupId}-tab-${tab.id}`}
            role="tab"
            type="button"
            aria-selected={selected}
            aria-controls={`${groupId}-panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cn(
              "relative shrink-0 whitespace-nowrap px-3.5 py-2.5 text-[13px] font-medium outline-none",
              "transition-colors duration-[120ms]",
              selected ? "text-fg" : "text-fg-muted hover:text-fg",
            )}
          >
            <span className="flex items-center gap-2">
              {tab.label}
              {tab.badge}
            </span>
            <span
              aria-hidden="true"
              className={cn(
                "absolute inset-x-2 -bottom-px h-0.5 rounded-full transition-opacity duration-[120ms]",
                selected ? "bg-atlas opacity-100" : "opacity-0",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({
  id,
  active,
  children,
}: {
  id: string;
  active: string;
  children: ReactNode;
}) {
  if (id !== active) return null;
  return (
    <div role="tabpanel" className="flex flex-col gap-5">
      {children}
    </div>
  );
}
