import { useRef, useState } from "react";
import { ArrowUp, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WidgetCard } from "./WidgetCard";
import { cn } from "@/lib/utils";
import { askSuggestions } from "@/data/dashboardFixtures";

/**
 * Natural-language entry point into the research layer.
 *
 * The field is live and the suggestions populate it, so the interaction is real
 * even though submitting has nowhere to go yet.
 */
export function AskAtlas({ className }: { className?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  function applySuggestion(text: string) {
    setQuery(text);
    inputRef.current?.focus();
  }

  return (
    <WidgetCard
      title="Ask Atlas"
      className={className}
      interactive={false}
      action={
        <Badge variant="atlas">
          <Sparkles />
          AI
        </Badge>
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
          <Sparkles className="size-4 shrink-0 text-atlas" />
          <label htmlFor="ask-atlas" className="sr-only">
            Ask Atlas a question
          </label>
          <input
            id="ask-atlas"
            ref={inputRef}
            type="text"
            autoComplete="off"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Ask Atlas..."
            className="min-w-0 flex-1 bg-transparent py-4 text-[15px] text-fg outline-none placeholder:text-fg-faint"
          />
          <Button
            size="icon"
            variant="primary"
            aria-label="Send question"
            disabled={query.trim().length === 0}
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
          Answers cite the filters and market snapshots they were derived from.
        </p>
      </div>
    </WidgetCard>
  );
}
