import { useNavigate } from "react-router-dom";
import { ChevronDown, CreditCard, LogOut, Settings, UserRound } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, initialsFrom } from "@/components/ui/avatar";
import { MembershipBadge } from "./MembershipBadge";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/routes";

export function ProfileMenu() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const email = user?.email ?? null;

  async function handleSignOut() {
    await signOut();
    navigate(ROUTES.login);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className={cn(
            "flex items-center gap-1.5 rounded-lg p-1 outline-none",
            "transition-colors duration-[120ms] hover:bg-surface-hi",
            "data-[state=open]:bg-surface-hi",
          )}
        >
          <Avatar className="size-7">
            <AvatarFallback className="text-[10px]">{initialsFrom(email)}</AvatarFallback>
          </Avatar>
          <ChevronDown className="size-3.5 text-fg-faint" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent>
        <div className="flex items-center gap-2.5 px-2.5 py-2">
          <Avatar className="size-8 shrink-0">
            <AvatarFallback>{initialsFrom(email)}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col gap-1">
            <span className="truncate text-[13px] font-medium text-fg">
              {email ?? "Not signed in"}
            </span>
            <MembershipBadge className="w-fit" />
          </div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={() => navigate(ROUTES.settings)}>
            <UserRound />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => navigate(ROUTES.settings)}>
            <Settings />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => navigate(ROUTES.settings)}>
            <CreditCard />
            Billing
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="sr-only">Session</DropdownMenuLabel>
        <DropdownMenuItem variant="destructive" onSelect={handleSignOut}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
