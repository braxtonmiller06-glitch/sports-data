import { ArrowUp, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PlaceholderCard } from "./PlaceholderCard";

/**
 * Entry point for the assistant. The field is real chrome so the layout is
 * honest about its height; it is disabled until a backend is wired up.
 */
export function AskAtlasCard({ className }: { className?: string }) {
  return (
    <PlaceholderCard
      className={className}
      title="Ask Atlas"
      interactive={false}
      action={
        <Badge variant="atlas">
          <Sparkles />
          AI
        </Badge>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2.5">
          <Input
            disabled
            placeholder="Ask about today's slate, a filter, or your performance..."
            aria-label="Ask Atlas a question"
          />
          <Button size="icon" variant="primary" disabled aria-label="Send question">
            <ArrowUp />
          </Button>
        </div>

        {/* Suggested-prompt chips, shapes only. */}
        <div className="flex flex-wrap gap-2">
          {[128, 96, 152, 112].map((width, i) => (
            <Skeleton key={i} className="h-7 rounded-lg" style={{ width }} />
          ))}
        </div>

        <p className="text-[11px] text-fg-faint">
          Connect the assistant service to enable questions.
        </p>
      </div>
    </PlaceholderCard>
  );
}
