import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, Lock, RotateCcw, SlidersHorizontal, X } from "lucide-react";
import { Select, type SelectOption } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useAccess } from "@/lib/access";
import { DURATION, EASE_ATLAS } from "@/lib/motion";
import { cn } from "@/lib/utils";
import {
  ADVANCED_FILTER_IDS,
  LOOKUP_FILTERS,
  STAT_LABEL,
  type StatKey,
} from "@/data/playerLookupFixtures";
import type { FilterState } from "@/hooks/usePlayerLookup";

interface Shared {
  filters: FilterState;
  onFilterChange: (id: string, value: string) => void;
  opponentOptions: SelectOption[];
}

/** Decorates option values so a locked pick can be intercepted on change. */
function useOptionBuilder({ opponentOptions }: Pick<Shared, "opponentOptions">) {
  const { tier, requestUpgrade } = useAccess();

  const build = (defId: string) => {
    const def = LOOKUP_FILTERS.find((f) => f.id === defId);
    const source = defId === "opponent" ? opponentOptions : (def?.options ?? []);
    return source.map((option) => {
      const premium = "premium" in option ? option.premium : undefined;
      const locked =
        premium === "elite" ? tier !== "elite" : premium === "medium" ? tier === "free" : false;
      return {
        value: locked ? `__locked__${premium}__${option.value}` : option.value,
        label: locked ? `${option.label} — ${premium === "elite" ? "Elite" : "Medium"}` : option.label,
      };
    });
  };

  const intercept = (raw: string, apply: (value: string) => void) => {
    if (raw.startsWith("__locked__")) {
      requestUpgrade(raw.split("__")[2] === "elite" ? "advanced_filters" : "expanded_filters");
      return;
    }
    apply(raw);
  };

  const lockedCount = LOOKUP_FILTERS.reduce(
    (total, def) =>
      total +
      def.options.filter((o) =>
        o.premium === "elite" ? tier !== "elite" : o.premium === "medium" ? tier === "free" : false,
      ).length,
    0,
  );

  return { build, intercept, lockedCount, tier };
}

/* ------------------------------------------------------------- primary --- */

/**
 * The four controls that stay on screen: stat, timeframe, venue and opponent.
 *
 * Everything else moved behind Advanced — the page was showing twelve selects
 * at once, which read as a settings screen rather than a research tool.
 */
export function PrimaryFilters({
  stat,
  onStatChange,
  filters,
  onFilterChange,
  opponentOptions,
  className,
}: Shared & {
  stat: StatKey;
  onStatChange: (stat: StatKey) => void;
  className?: string;
}) {
  const { build, intercept } = useOptionBuilder({ opponentOptions });

  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-4", className)}>
      <Select
        label="Stat"
        options={(Object.keys(STAT_LABEL) as StatKey[]).map((s) => ({ value: s, label: STAT_LABEL[s] }))}
        value={stat}
        onChange={(e) => onStatChange(e.target.value as StatKey)}
      />
      {(["timeframe", "venue", "opponent"] as const).map((id) => {
        const def = LOOKUP_FILTERS.find((f) => f.id === id)!;
        return (
          <Select
            key={id}
            label={def.label}
            options={build(id)}
            value={filters[id] ?? "all"}
            onChange={(e) => intercept(e.target.value, (v) => onFilterChange(id, v))}
          />
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------- chips --- */

export function ActiveFilterChips({
  activeFilters,
  onClear,
  onReset,
  className,
}: {
  activeFilters: { id: string; label: string; optionLabel: string }[];
  onClear: (id: string) => void;
  onReset: () => void;
  className?: string;
}) {
  if (activeFilters.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {activeFilters.map((f) => (
        <button
          key={f.id}
          type="button"
          onClick={() => onClear(f.id)}
          aria-label={`Clear ${f.label} filter`}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border border-atlas/30 bg-atlas/8",
            "px-2 py-1 text-[11px] font-medium text-atlas outline-none",
            "transition-colors duration-[120ms] hover:bg-atlas/14",
          )}
        >
          {f.optionLabel}
          <X className="size-2.5" />
        </button>
      ))}
      {activeFilters.length > 1 && (
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium text-fg-faint outline-none transition-colors duration-[120ms] hover:text-atlas"
        >
          <RotateCcw className="size-2.5" />
          Clear all
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- advanced --- */

function AdvancedGrid({ filters, onFilterChange, opponentOptions }: Shared) {
  const { build, intercept, lockedCount, tier } = useOptionBuilder({ opponentOptions });

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {ADVANCED_FILTER_IDS.map((id) => {
          const def = LOOKUP_FILTERS.find((f) => f.id === id)!;
          return (
            <Select
              key={id}
              label={def.label}
              options={build(id)}
              value={filters[id] ?? "all"}
              onChange={(e) => intercept(e.target.value, (v) => onFilterChange(id, v))}
            />
          );
        })}
      </div>

      {lockedCount > 0 && tier !== "elite" && (
        <p className="inline-flex items-start gap-1.5 text-[11px] leading-relaxed text-fg-faint">
          <Lock className="mt-0.5 size-2.5 shrink-0" />
          {lockedCount} deeper {lockedCount === 1 ? "cut is" : "cuts are"} available on a higher
          plan. Selecting one shows what it unlocks.
        </p>
      )}
    </div>
  );
}

/**
 * Advanced filters.
 *
 * Inline and collapsible from md up; a sheet below that, where an inline panel
 * would push the whole workspace off the first screen.
 */
export function AdvancedFilters({
  filters,
  onFilterChange,
  opponentOptions,
  activeCount,
}: Shared & { activeCount: number }) {
  const [open, setOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  const trigger = (onClick: () => void, expanded: boolean, extraClass?: string) => (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border border-line bg-inset px-3 py-2",
        "text-[12px] font-medium text-fg-muted outline-none",
        "transition-colors duration-[120ms] hover:border-line-hi hover:text-fg",
        extraClass,
      )}
    >
      <SlidersHorizontal className="size-3.5" />
      Advanced filters
      {activeCount > 0 && (
        <Badge variant="atlas" size="sm">
          {activeCount}
        </Badge>
      )}
      <ChevronDown
        className={cn(
          "size-3 transition-transform duration-[180ms]",
          expanded && "rotate-180",
        )}
      />
    </button>
  );

  return (
    <>
      {/* md and up: inline collapse */}
      <div className="hidden md:block">
        {trigger(() => setOpen((v) => !v), open)}
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="advanced"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={
                reduceMotion ? { duration: 0 } : { duration: DURATION.slow, ease: EASE_ATLAS }
              }
              className="overflow-hidden"
            >
              <div className="mt-3 rounded-lg border border-line bg-inset p-4">
                <AdvancedGrid
                  filters={filters}
                  onFilterChange={onFilterChange}
                  opponentOptions={opponentOptions}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* below md: sheet */}
      <div className="md:hidden">
        {trigger(() => setSheetOpen(true), sheetOpen, "w-full justify-center")}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="right" className="w-[min(92vw,360px)] p-0">
            <SheetTitle className="border-b border-line px-4 py-4 text-sm font-medium text-fg">
              Advanced filters
            </SheetTitle>
            <SheetDescription className="sr-only">
              Deeper research cuts for the current player
            </SheetDescription>
            <div className="scrollbar-atlas flex-1 overflow-y-auto p-4">
              <AdvancedGrid
                filters={filters}
                onFilterChange={onFilterChange}
                opponentOptions={opponentOptions}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
