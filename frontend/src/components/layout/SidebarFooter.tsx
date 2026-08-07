import { Link } from "react-router-dom";
import { Settings } from "lucide-react";
import { Avatar, AvatarFallback, initialsFrom } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MembershipBadge } from "@/components/navigation/MembershipBadge";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/routes";

interface SidebarFooterProps {
  collapsed?: boolean;
  onNavigate?: () => void;
}

/**
 * Identity block pinned to the bottom of the rail: who is signed in, what they
 * are paying for, and a direct route to settings.
 */
export function SidebarFooter({ collapsed = false, onNavigate }: SidebarFooterProps) {
  const { user, loading } = useAuth();
  const email = user?.email ?? null;

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2 border-t border-line px-3 py-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to={ROUTES.settings}
              onClick={onNavigate}
              aria-label="Account and settings"
              className="rounded-lg outline-none"
            >
              <Avatar className="size-8">
                <AvatarFallback>{initialsFrom(email)}</AvatarFallback>
              </Avatar>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">{email ?? "Account"}</TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="border-t border-line p-3">
      <div
        className={cn(
          "flex items-center gap-2.5 rounded-lg p-2",
          "transition-colors duration-[120ms] hover:bg-surface-hi",
        )}
      >
        <Avatar className="size-8 shrink-0">
          <AvatarFallback>{initialsFrom(email)}</AvatarFallback>
        </Avatar>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {loading ? (
            <Skeleton className="h-3 w-28" />
          ) : (
            <span className="truncate text-[13px] font-medium text-fg">
              {email ?? "Not signed in"}
            </span>
          )}
          <MembershipBadge className="w-fit" />
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to={ROUTES.settings}
              onClick={onNavigate}
              aria-label="Settings"
              className={cn(
                "shrink-0 rounded-md p-1.5 text-fg-faint outline-none",
                "transition-colors duration-[120ms] hover:bg-surface-hover hover:text-fg",
              )}
            >
              <Settings className="size-4" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="top">Settings</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
