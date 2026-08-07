import { useNavigate } from "react-router-dom";
import { ChevronDown, LayoutGrid } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LockChip } from "@/components/subscription/LockChip";
import { FEATURES, useAccess } from "@/lib/access";
import { TOOLS } from "@/lib/tools";
import { cn } from "@/lib/utils";

/**
 * The eight Atlas tools, one click from anywhere.
 *
 * Every tool navigates — none of them is gated at the door. A tier chip marks
 * tools whose advanced surface needs an upgrade, but the workspace itself is
 * always enterable, so the menu describes the product rather than the plan.
 */
export function ToolsMenu({ className }: { className?: string }) {
  const navigate = useNavigate();
  const { can } = useAccess();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium",
            "text-fg-muted outline-none transition-colors duration-[120ms]",
            "hover:bg-surface-hi hover:text-fg data-[state=open]:bg-surface-hi data-[state=open]:text-fg",
            className,
          )}
        >
          <LayoutGrid className="size-3.5" />
          Tools
          <ChevronDown className="size-3 text-fg-faint" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-[min(92vw,384px)] p-2">
        <p className="px-2.5 py-2 text-[10px] font-medium tracking-[0.14em] text-fg-faint">
          THE EIGHT ATLAS TOOLS
        </p>

        <div className="flex flex-col gap-0.5">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            const gated = tool.premiumFeature ? !can(tool.premiumFeature) : false;

            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => navigate(tool.to)}
                className={cn(
                  "group flex items-start gap-3 rounded-lg px-2.5 py-2.5 text-left",
                  "outline-none transition-colors duration-[120ms]",
                  "hover:bg-surface-hover focus-visible:bg-surface-hover",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg",
                    "border border-line bg-inset transition-colors duration-[120ms]",
                    "group-hover:border-atlas/40",
                  )}
                >
                  <Icon className="size-3.5 text-fg-muted transition-colors duration-[120ms] group-hover:text-atlas" />
                </span>

                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-medium text-fg">{tool.name}</span>
                    {gated && tool.premiumFeature && (
                      <LockChip tier={FEATURES[tool.premiumFeature].minTier} />
                    )}
                  </span>
                  <span className="text-[11.5px] leading-relaxed text-fg-muted">
                    {tool.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
