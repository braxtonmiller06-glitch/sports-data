import { motion, useReducedMotion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { NavItem } from "@/components/navigation/NavItem";
import { activeNavItem, NAV_SECTIONS, SETTINGS_ITEM } from "@/components/navigation/nav-config";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TierSwitcher } from "@/components/subscription/TierSwitcher";
import { AtlasMark, AtlasWordmark } from "./AtlasMark";
import { SidebarFooter } from "./SidebarFooter";
import { useShell } from "./shell-context";
import { DURATION, EASE_ATLAS } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/routes";

export const SIDEBAR_WIDTH = 248;
export const SIDEBAR_WIDTH_COLLAPSED = 64;

interface SidebarContentProps {
  collapsed?: boolean;
  /** Closes the mobile sheet after a navigation. */
  onNavigate?: () => void;
  /** The collapse control is desktop-only; the sheet has its own close button. */
  showCollapseToggle?: boolean;
}

/** The rail's contents, shared by the desktop aside and the mobile sheet. */
export function SidebarContent({
  collapsed = false,
  onNavigate,
  showCollapseToggle = true,
}: SidebarContentProps) {
  const { toggleSidebar } = useShell();
  const { pathname } = useLocation();
  // Resolved once so exactly one destination can be active, even for
  // sub-routes like /research/props that also prefix-match /research.
  const activeTo = activeNavItem(pathname)?.to ?? null;

  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div
        className={cn(
          "flex h-14 shrink-0 items-center border-b border-line",
          collapsed ? "justify-center px-2" : "gap-2.5 px-4",
        )}
      >
        <Link
          to={ROUTES.dashboard}
          onClick={onNavigate}
          className="flex min-w-0 items-center gap-2.5 rounded-lg outline-none"
          aria-label="Atlas Analytics home"
        >
          <AtlasMark className="size-5 shrink-0" />
          {!collapsed && <AtlasWordmark />}
        </Link>

        {showCollapseToggle && !collapsed && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label="Collapse sidebar"
                className={cn(
                  "ml-auto shrink-0 rounded-md p-1.5 text-fg-faint outline-none",
                  "transition-colors duration-[120ms] hover:bg-surface-hi hover:text-fg",
                )}
              >
                <PanelLeftClose className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Collapse sidebar</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Expand control, only visible while collapsed */}
      {showCollapseToggle && collapsed && (
        <div className="flex justify-center border-b border-line py-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label="Expand sidebar"
                className={cn(
                  "rounded-md p-1.5 text-fg-faint outline-none",
                  "transition-colors duration-[120ms] hover:bg-surface-hi hover:text-fg",
                )}
              >
                <PanelLeftOpen className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Expand sidebar</TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Destinations */}
      <nav
        aria-label="Primary"
        className="scrollbar-atlas flex-1 overflow-y-auto px-3 py-3"
      >
        {NAV_SECTIONS.map((section, index) => (
          <div key={section.label ?? `section-${index}`} className={index > 0 ? "mt-5" : undefined}>
            {section.label && !collapsed && (
              <p className="px-2.5 pb-2 text-[10px] font-medium tracking-[0.14em] text-fg-faint">
                {section.label.toUpperCase()}
              </p>
            )}
            {section.label && collapsed && index > 0 && (
              <div className="mx-2 mb-2 h-px bg-line" aria-hidden="true" />
            )}
            <div className={cn("flex flex-col gap-0.5", collapsed && "items-center")}>
              {section.items.map((item) => (
                <NavItem
                  key={item.to}
                  item={item}
                  active={item.to === activeTo}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}

        <div className="mt-5">
          <div className={cn("flex flex-col gap-0.5", collapsed && "items-center")}>
            <NavItem
              item={SETTINGS_ITEM}
              active={SETTINGS_ITEM.to === activeTo}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          </div>
        </div>
      </nav>

      {/* Dev-only. Lives here as well as the top bar so tiers stay switchable
          on mobile, where the top bar has no room for it. */}
      {!collapsed && (
        <div className="px-3 pb-2">
          <TierSwitcher className="w-full justify-center" />
        </div>
      )}

      <SidebarFooter collapsed={collapsed} onNavigate={onNavigate} />
    </div>
  );
}

/** Desktop rail. Animates its width so the collapse reads as one movement. */
export function Sidebar() {
  const { sidebarCollapsed } = useShell();
  const reduceMotion = useReducedMotion();

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH }}
      transition={reduceMotion ? { duration: 0 } : { duration: DURATION.slow, ease: EASE_ATLAS }}
      className="fixed inset-y-0 left-0 z-30 hidden shrink-0 overflow-hidden border-r border-line bg-canvas lg:block"
    >
      <SidebarContent collapsed={sidebarCollapsed} />
    </motion.aside>
  );
}
