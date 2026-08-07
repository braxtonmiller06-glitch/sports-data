import { Link } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { NavItemDef } from "./nav-config";

interface NavItemProps {
  item: NavItemDef;
  /** Resolved by the sidebar via activeNavItem(), so exactly one item is active. */
  active?: boolean;
  collapsed?: boolean;
  onNavigate?: () => void;
}

/**
 * A single rail destination.
 *
 * Deliberately a plain `Link` with string props rather than a `NavLink` with
 * render-function `className`/`children`: in the collapsed state this element
 * is wrapped in a Radix `TooltipTrigger asChild`, and Slot merges className by
 * string-joining it. A function would be stringified into the class attribute
 * and silently drop every style. Active state is passed in instead.
 */
export function NavItem({ item, active = false, collapsed = false, onNavigate }: NavItemProps) {
  const Icon = item.icon;

  const link = (
    <Link
      to={item.to}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? item.label : undefined}
      className={cn(
        "group relative flex items-center rounded-lg text-[13px] font-medium outline-none",
        "transition-colors duration-[120ms]",
        collapsed ? "size-9 justify-center" : "h-9 gap-3 px-2.5",
        active ? "bg-surface-hi text-fg" : "text-fg-muted hover:bg-surface-hi/60 hover:text-fg",
      )}
    >
      {/* Active rail marker. Absolute so it never shifts the label. */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-atlas",
          "transition-opacity duration-[120ms]",
          active ? "opacity-100" : "opacity-0",
        )}
      />
      <Icon
        className={cn(
          "size-4 shrink-0 transition-colors duration-[120ms]",
          active ? "text-atlas" : "text-fg-faint group-hover:text-fg-muted",
        )}
      />
      {!collapsed && (
        <>
          <span className="truncate">{item.label}</span>
          {item.badge && (
            <span className="tabular ml-auto font-mono text-[10px] text-fg-faint">
              {item.badge}
            </span>
          )}
        </>
      )}
    </Link>
  );

  if (!collapsed) return link;

  // Collapsed to icons: the label has to live somewhere reachable.
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}
