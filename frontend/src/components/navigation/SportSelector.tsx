import { Check, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useSport } from "@/lib/sport-context";
import { SPORTS } from "@/lib/sports";
import { cn } from "@/lib/utils";

/**
 * The app-wide sport scope, in the top bar.
 *
 * Sports without a fixture set are still selectable — picking one shows a
 * considered empty state rather than being disabled with no explanation of
 * what is coming.
 */
export function SportSelector({ className }: { className?: string }) {
  const { sport, config, setSport } = useSport();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Sport: ${config.label}`}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border border-line bg-inset px-2.5 py-1.5",
            "text-[13px] font-medium text-fg outline-none transition-colors duration-[120ms]",
            "hover:border-line-hi hover:bg-surface-hi",
            "data-[state=open]:border-atlas/40 data-[state=open]:bg-surface-hi",
            className,
          )}
        >
          {config.label}
          <ChevronDown className="size-3 text-fg-faint" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-56">
        {SPORTS.map((option) => (
          <DropdownMenuItem key={option.id} onSelect={() => setSport(option.id)}>
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <span className="text-[13px] text-fg">{option.label}</span>
              {!option.implemented && (
                <Badge variant="neutral" size="sm">
                  Soon
                </Badge>
              )}
            </span>
            {option.id === sport && <Check className="size-3.5 shrink-0 text-atlas" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
