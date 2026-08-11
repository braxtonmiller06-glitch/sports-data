import { useRef, useState } from "react";
import { ArrowUp, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WidgetCard } from "./WidgetCard";
import { LockChip } from "@/components/subscription/LockChip";
import { FEATURES, TIER_LABEL, useAccess } from "@/lib/access";
import { cn } from "@/lib/utils";
import { askSuggestions } from "@/data/dashboardFixtures";

/**
 * Natural-language entry point into the research layer.
 *
 * Gated above Free, but gated by *doing* rather than by hiding: a free user
 * still sees the field and every example question, so they can tell exactly
 * what the assistant answers. Only submitting asks them to upgrade.
 */
export function AskAtlas({ className }: { className?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const { can, requestUpgrade } = useAccess();

  const unlocked = can("ask_atlas");
  const requiredTier = FEATURES.ask_atlas.minTier;

  function applySuggestion(text: string) {
    if (!unlocked) {
      requestUpgrade("ask_atlas");
      return;
    }
    setQuery(text);
    inputRef.current?.focus();
  }

  function submit() {
    if (!unlocked) {
      requestUpgrade("ask_atlas");
      return;
    }
    // No assistant backend yet; the field is real so the layout is honest.
  }

  return (
    <WidgetCard
      title="Ask Atlas"
      className={className}
      interactive={false}
      action={
        unlocked ? (
          <Badge variant="atlas">
            <Sparkles />
            AI
          </Badge>
        ) : (
          <LockChip tier={requiredTier} />
        )
      }
    >
      <div className="flex h-full flex-col gap-4">
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl border bg-inset px-4",
            "transition-colors duration-[180ms]",
            focused ? "border-atlas/50" : "border-line hover:border-line-hi",
          )}
        >
          <Sparkles className={cn("size-4 shrink-0", unlocked ? "text-atlas" : "text-fg-faint")} />
          <label htmlFor="ask-atlas" className="sr-only">
            Ask Atlas a question
          </label>
          <input
            id="ask-atlas"
            ref={inputRef}
            type="text"
            autoComplete="off"
            value={query}
            readOnly={!unlocked}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onClick={() => !unlocked && requestUpgrade("ask_atlas")}
            onKeyDown={(event) => event.key === "Enter" && submit()}
            placeholder="Ask Atlas..."
            className={cn(
              "min-w-0 flex-1 bg-transparent py-4 text-[15px] text-fg outline-none",
              "placeholder:text-fg-faint",
              !unlocked && "cursor-pointer",
            )}
          />
          <Button
            size="icon"
            variant="primary"
            aria-label={unlocked ? "Send question" : `Unlock with ${TIER_LABEL[requiredTier]}`}
            disabled={unlocked && query.trim().length === 0}
            onClick={submit}
            className="shrink-0"
          >
            <ArrowUp />
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {askSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => applySuggestion(suggestion)}
              className={cn(
                "rounded-lg border border-line px-3 py-2 text-[12px] text-fg-muted",
                "outline-none transition-colors duration-[120ms]",
                "hover:border-line-hi hover:bg-surface-hi hover:text-fg",
              )}
            >
              {suggestion}
            </button>
          ))}
        </div>

        <p className="mt-auto text-[11px] text-fg-faint">
          {unlocked
            ? "Answers cite the filters and market snapshots they were derived from."
            : `Included with ${TIER_LABEL[requiredTier]}. Answers cite the filters and market snapshots behind them.`}
        </p>
      </div>
    </WidgetCard>
  );
}
