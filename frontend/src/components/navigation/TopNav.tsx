import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { GlobalSearch } from "./GlobalSearch";
import { NotificationsButton } from "./NotificationsButton";
import { ProfileMenu } from "./ProfileMenu";
import { MembershipBadge } from "./MembershipBadge";
import { TierSwitcher } from "@/components/subscription/TierSwitcher";
import { ToolsMenu } from "./ToolsMenu";
import { SportSelector } from "./SportSelector";
import { titleForPath } from "./nav-config";
import { Separator } from "@/components/ui/separator";
import { useShell } from "@/components/layout/shell-context";
import { cn } from "@/lib/utils";

/**
 * Sticky top bar.
 *
 * The backdrop blur is deliberately absent at the top of the page and fades in
 * once content has scrolled beneath the bar -- so the chrome only asserts
 * itself when it is actually overlapping something.
 */
export function TopNav() {
  const { pathname } = useLocation();
  const { setMobileNavOpen } = useShell();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex h-14 items-center gap-3 px-4 lg:px-6",
        "border-b transition-colors duration-[180ms]",
        scrolled
          ? "border-line bg-canvas/80 backdrop-blur-xl supports-[backdrop-filter]:bg-canvas/70"
          : "border-transparent bg-canvas",
      )}
    >
      {/* Left: mobile nav trigger + current page */}
      <button
        type="button"
        onClick={() => setMobileNavOpen(true)}
        aria-label="Open navigation"
        className={cn(
          "-ml-1 shrink-0 rounded-lg p-2 text-fg-muted outline-none lg:hidden",
          "transition-colors duration-[120ms] hover:bg-surface-hi hover:text-fg",
        )}
      >
        <Menu className="size-4" />
      </button>

      <h1 className="shrink-0 truncate text-sm font-medium tracking-tight text-fg">
        {titleForPath(pathname)}
      </h1>

      {/* Global sport scope, read by every page. */}
      <SportSelector className="shrink-0" />

      {/* The eight tools, reachable from every page. */}
      <ToolsMenu className="hidden shrink-0 md:flex" />

      {/* Center: global search. Grows to fill, capped so it stays centred-ish. */}
      <div className="flex min-w-0 flex-1 justify-center px-2">
        <GlobalSearch className="w-full max-w-md" />
      </div>

      {/* Right: status, notifications, identity */}
      <div className="flex shrink-0 items-center gap-1.5">
        {/* Dev-only; renders nothing in a production build. */}
        <TierSwitcher className="hidden xl:flex" />
        <MembershipBadge className="hidden md:inline-flex" />
        <Separator orientation="vertical" className="mx-1 hidden h-5 md:block" />
        <NotificationsButton />
        <ProfileMenu />
      </div>
    </header>
  );
}
