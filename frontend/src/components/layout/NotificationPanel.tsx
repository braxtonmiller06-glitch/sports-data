import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Inbox, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useShell } from "./shell-context";
import { DURATION, EASE_ATLAS } from "@/lib/motion";
import { cn } from "@/lib/utils";

export const NOTIFICATION_PANEL_WIDTH = 320;

/**
 * Right-hand notification rail. Ships collapsed and is opened from the bell in
 * the top bar. On xl screens it takes real layout space (AppShell pads the
 * content for it); below that it overlays.
 *
 * Contents are skeletons -- no notification source is wired to the shell yet.
 */
export function NotificationPanel() {
  const { notificationsOpen, setNotificationsOpen } = useShell();
  const reduceMotion = useReducedMotion();

  const transition = reduceMotion
    ? { duration: 0 }
    : { duration: DURATION.slow, ease: EASE_ATLAS };

  return (
    <AnimatePresence>
      {notificationsOpen && (
        <>
          {/* Scrim, below xl only -- there the panel overlays content. */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition}
            onClick={() => setNotificationsOpen(false)}
            className="fixed inset-0 z-30 bg-black/50 xl:hidden"
            aria-hidden="true"
          />

          <motion.aside
            key="notification-panel"
            initial={{ x: NOTIFICATION_PANEL_WIDTH }}
            animate={{ x: 0 }}
            exit={{ x: NOTIFICATION_PANEL_WIDTH }}
            transition={transition}
            aria-label="Notifications"
            className={cn(
              "fixed inset-y-0 right-0 z-40 flex w-80 flex-col",
              "border-l border-line bg-canvas",
            )}
          >
            <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-line px-4">
              <h2 className="text-sm font-medium tracking-tight text-fg">Notifications</h2>
              <Badge variant="atlas" size="sm">
                3 new
              </Badge>
              <button
                type="button"
                onClick={() => setNotificationsOpen(false)}
                aria-label="Close notifications"
                className={cn(
                  "ml-auto rounded-md p-1.5 text-fg-faint outline-none",
                  "transition-colors duration-[120ms] hover:bg-surface-hi hover:text-fg",
                )}
              >
                <X className="size-4" />
              </button>
            </div>

            <ScrollArea className="flex-1">
              <div className="flex flex-col gap-3 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex gap-3 rounded-lg border border-line bg-surface p-3"
                  >
                    <Skeleton className="size-7 shrink-0 rounded-lg" />
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <Skeleton className="h-3 w-2/3" />
                      <Skeleton className="h-2.5 w-full" />
                      <Skeleton className="h-2.5 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="shrink-0 border-t border-line px-4 py-3">
              <p className="flex items-center gap-2 text-[11px] text-fg-faint">
                <Inbox className="size-3.5" />
                Alerts appear here once the notification service is connected.
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
