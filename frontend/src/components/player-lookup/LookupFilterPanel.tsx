import { Lock, RotateCcw, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, type SelectOption } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAccess } from "@/lib/access";
import { cn } from "@/lib/utils";
import { LOOKUP_FILTERS, STAT_LABEL, type StatKey } from "@/data/playerLookupFixtures";
import type { FilterState } from "@/hooks/usePlayerLookup";

interface Props {
  stat: StatKey;
  onStatChange: (stat: StatKey) => void;
  filters: FilterState;
  onFilterChange: (id: string, value: string) => void;
  onClearFilter: (id: string) => void;
  onReset: () => void;
  activeFilters: { id: string; label: string; optionLabel: string }[];
  opponentOptions: SelectOption[];
  sampleSize: number;
}

/**
 * The research filter rack.
 *
 * Premium options stay in the list wearing a lock rather than disappearing, so
 * a free user can see which cuts exist. Selecting one opens the upgrade prompt
 * instead of silently doing nothing.
 */
export function LookupFilterPanel({
  stat,
  onStatChange,
  filters,
  onFilterChange,
  onClearFilter,
  onReset,
  activeFilters,
  opponentOptions,
  sampleSize,
}: Props) {
  const { tier, requestUpgrade } = useAccess();

  const lockedCount = LOOKUP_FILTERS.reduce(
    (total, def) =>
      total +
      def.options.filter((o) =>
        o.premium === "elite" ? tier !== "elite" : o.premium === "medium" ? tier === "free" : false,
      ).length,
    0,
  );

  function optionsFor(defId: string, options: { value: string; label: string; premium?: "medium" | "elite" }[]) {
    const source = defId === "opponent" ? opponentOptions : options;
    return source.map((option) => {
      const premium = "premium" in option ? option.premium : undefined;
      const locked =
        premium === "elite" ? tier !== "elite" : premium === "medium" ? tier === "free" : false;
      return {
        value: locked ? `__locked__${premium}__${option.value}` : option.value,
        label: locked ? `${option.label} — ${premium === "elite" ? "Elite" : "Medium"}` : option.label,
      };
    });
  }

  function handleChange(defId: string, raw: string) {
    if (raw.startsWith("__locked__")) {
      const tierPart = raw.split("__")[2];
      requestUpgrade(tierPart === "elite" ? "advanced_filters" : "expanded_filters");
      return;
    }
    onFilterChange(defId, raw);
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Research filters</CardTitle>
        <Badge variant="outline">{sampleSize} in sample</Badge>
        <button
          type="button"
          onClick={onReset}
          className="ml-auto inline-flex items-center gap-1 rounded-md text-[11px] font-medium text-fg-faint outline-none transition-colors duration-[120ms] hover:text-atlas"
        >
          <RotateCcw className="size-3" />
          Reset
        </button>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* Active chips */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {activeFilters.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onClearFilter(f.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md border border-atlas/30 bg-atlas/8",
                  "px-2 py-1 text-[11px] font-medium text-atlas outline-none",
                  "transition-colors duration-[120ms] hover:bg-atlas/14",
                )}
              >
                {f.label}: {f.optionLabel}
                <X className="size-2.5" />
              </button>
            ))}
          </div>
        )}

        {/* Stat selector */}
        <Select
          label="Stat"
          options={(Object.keys(STAT_LABEL) as StatKey[]).map((s) => ({
            value: s,
            label: STAT_LABEL[s],
          }))}
          value={stat}
          onChange={(e) => onStatChange(e.target.value as StatKey)}
        />

        {LOOKUP_FILTERS.map((def) => (
          <Select
            key={def.id}
            label={def.label}
            options={optionsFor(def.id, def.options)}
            value={filters[def.id] ?? "all"}
            onChange={(e) => handleChange(def.id, e.target.value)}
          />
        ))}

        {/* One note, not one per control: repeating it beside six selects was
            noise and made the rack tall enough to leave a hole beside it. */}
        {lockedCount > 0 && (
          <p className="inline-flex items-start gap-1.5 border-t border-line-faint pt-3 text-[11px] leading-relaxed text-fg-faint">
            <Lock className="mt-0.5 size-2.5 shrink-0" />
            {lockedCount} deeper {lockedCount === 1 ? "cut is" : "cuts are"} available on a higher
            plan. Selecting one shows what it unlocks.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
