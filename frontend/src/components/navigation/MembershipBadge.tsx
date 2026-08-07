import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfile } from "@/hooks/useProfile";
import { cn } from "@/lib/utils";

type Tier = { label: string; variant: "atlas" | "neutral" | "warn"; icon: boolean };

const TIERS: Record<string, Tier> = {
  active: { label: "Sharp", variant: "atlas", icon: true },
  past_due: { label: "Past due", variant: "warn", icon: false },
  canceled: { label: "Canceled", variant: "neutral", icon: false },
  free: { label: "Free", variant: "neutral", icon: false },
};

/**
 * Membership tier chip. Reads the existing `profiles.subscription_status`
 * rather than introducing a parallel notion of entitlement.
 */
export function MembershipBadge({ className }: { className?: string }) {
  const { profile, loading } = useProfile();

  if (loading) return <Skeleton className={cn("h-5 w-14 rounded-md", className)} />;

  const tier = TIERS[profile?.subscription_status ?? "free"] ?? TIERS.free;

  return (
    <Badge variant={tier.variant} className={className}>
      {tier.icon && <Sparkles />}
      {tier.label}
    </Badge>
  );
}
