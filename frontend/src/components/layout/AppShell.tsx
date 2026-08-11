import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { TopNav } from "@/components/navigation/TopNav";
import { Sidebar, SidebarContent, SIDEBAR_WIDTH, SIDEBAR_WIDTH_COLLAPSED } from "./Sidebar";
import { NotificationPanel } from "./NotificationPanel";
import { ShellProvider, useShell } from "./shell-context";
import { UpgradePrompt } from "@/components/subscription/UpgradePrompt";
import { pageVariants } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: ReactNode;
  /** Constrains page content. Set false for full-bleed pages such as tables. */
  contained?: boolean;
  className?: string;
}

function ShellFrame({ children, contained = true, className }: AppShellProps) {
  const { sidebarCollapsed, mobileNavOpen, setMobileNavOpen, notificationsOpen } = useShell();
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar />

      {/* Sidebar as an off-canvas sheet below lg */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" showClose={false} className="p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">
            Primary navigation for Atlas Analytics
          </SheetDescription>
          <SidebarContent
            showCollapseToggle={false}
            onNavigate={() => setMobileNavOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Content column. Offsets for the fixed rail on lg+, and for the
          notification panel on xl+ where the panel is not an overlay. */}
      <div
        style={{
          // Inline because the rail width animates between two exact pixel
          // values; a Tailwind class pair would jump instead of tracking it.
          ["--sidebar-w" as string]: `${sidebarCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH}px`,
        }}
        className={cn(
          "flex min-h-screen flex-col",
          "transition-[padding] duration-[250ms] ease-out",
          "lg:pl-[var(--sidebar-w)]",
          notificationsOpen && "xl:pr-80",
        )}
      >
        <TopNav />

        <main className={cn("flex-1", className)}>
          <motion.div
            // Re-keying on pathname replays the enter transition per route.
            key={pathname}
            variants={pageVariants}
            initial="hidden"
            animate="visible"
            className={cn(
              "px-4 py-6 lg:px-6 lg:py-8",
              contained && "mx-auto w-full max-w-[1600px]",
            )}
          >
            {children}
          </motion.div>
        </main>
      </div>

      <NotificationPanel />

      {/* Mounted once for the whole app: no component owns its own upgrade
          modal, so the copy cannot drift between surfaces. */}
      <UpgradePrompt />
    </div>
  );
}

/**
 * The application frame every signed-in page renders inside: left rail, sticky
 * top bar, main content column, and the right notification panel.
 *
 * Usage:
 *   <AppShell><YourPage /></AppShell>
 *
 * Pages supply only their content -- never their own chrome.
 */
/**
 * Note on providers: AccessProvider and TrackedPropsProvider deliberately live
 * at the App root, not here. A page renders AppShell as its *child*, so a
 * provider mounted here is below the page in the tree — any page calling
 * useAccess() at its top level would throw. Only shell-internal state belongs
 * at this level.
 */
export function AppShell(props: AppShellProps) {
  return (
    <ShellProvider>
      <TooltipProvider>
        <ShellFrame {...props} />
      </TooltipProvider>
    </ShellProvider>
  );
}
