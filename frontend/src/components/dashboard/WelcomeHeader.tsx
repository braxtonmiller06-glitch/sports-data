import { motion } from "framer-motion";
import { CalendarDays, Gamepad2 } from "lucide-react";
import { LivePulse } from "@/components/ui/live-pulse";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { cardVariants } from "@/lib/motion";
import { welcomeFixture } from "@/data/dashboardFixtures";

function greetingFor(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** Who, when, how much is on, and whether the market is trading. */
export function WelcomeHeader({ className }: { className?: string }) {
  const { user, loading } = useAuth();
  const now = new Date();
  const name = user?.email ? user.email.split("@")[0] : null;

  return (
    <motion.section variants={cardVariants} className={className}>
      <div className="flex h-full flex-col justify-center gap-3">
        {loading ? (
          <Skeleton className="h-8 w-64" />
        ) : (
          <h2 className="text-2xl font-semibold tracking-tight text-fg">
            {greetingFor(now)}
            {name ? <span className="text-atlas">, {name}</span> : null}
          </h2>
        )}

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-fg-muted">
          <span className="inline-flex items-center gap-2">
            <CalendarDays className="size-3.5 text-fg-faint" />
            {now.toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </span>

          <span className="inline-flex items-center gap-2">
            <Gamepad2 className="size-3.5 text-fg-faint" />
            <span className="font-medium text-fg">{welcomeFixture.gamesToday}</span>
            games today
          </span>

          <span className="flex flex-wrap items-center gap-1.5">
            {welcomeFixture.leagues.map((league) => (
              <span
                key={league}
                className="rounded border border-line bg-surface px-1.5 py-0.5 text-[11px] font-medium text-fg-muted"
              >
                {league}
              </span>
            ))}
          </span>

          <span className="inline-flex items-center gap-2">
            <span className="text-fg-faint">Market</span>
            <LivePulse tone="live" label={welcomeFixture.marketStatusLabel} />
          </span>
        </div>
      </div>
    </motion.section>
  );
}
