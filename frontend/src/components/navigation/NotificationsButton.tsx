import { Bell } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useShell } from "@/components/layout/shell-context";
import { cn } from "@/lib/utils";

/**
 * Toggles the right-hand notification panel. The unread marker is presentational
 * for now -- the shell has no notification source wired to it yet.
 */
export function NotificationsButton({ hasUnread = true }: { hasUnread?: boolean }) {
  const { notificationsOpen, toggleNotifications } = useShell();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={toggleNotifications}
          aria-label="Notifications"
          aria-expanded={notificationsOpen}
          className={cn(
            "relative rounded-lg p-2 outline-none transition-colors duration-[120ms]",
            notificationsOpen
              ? "bg-surface-hi text-fg"
              : "text-fg-muted hover:bg-surface-hi hover:text-fg",
          )}
        >
          <Bell className="size-4" />
          {hasUnread && (
            <span
              aria-hidden="true"
              className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-atlas ring-2 ring-canvas"
            />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">Notifications</TooltipContent>
    </Tooltip>
  );
}
