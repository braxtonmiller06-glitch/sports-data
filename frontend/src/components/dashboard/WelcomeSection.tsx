import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { cardVariants } from "@/lib/motion";
import { useAuth } from "@/context/AuthContext";

function greetingFor(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * Page-opening greeting. The name resolves from the session; everything to the
 * right of it is a skeleton until the slate service is connected.
 */
export function WelcomeSection() {
  const { user, loading } = useAuth();
  const now = new Date();

  const name = user?.email ? user.email.split("@")[0] : null;

  return (
    <motion.section
      variants={cardVariants}
      className="flex flex-wrap items-end justify-between gap-6 pb-2"
    >
      <div className="min-w-0">
        {loading ? (
          <Skeleton className="h-7 w-56" />
        ) : (
          <h2 className="text-xl font-semibold tracking-tight text-fg">
            {greetingFor(now)}
            {name ? <span className="text-atlas">, {name}</span> : null}
          </h2>
        )}
        <p className="mt-2 text-[13px] text-fg-muted">
          {now.toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </div>

      {/* Slate summary chips — shapes only, no invented figures. */}
      <div className="flex flex-wrap gap-2.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex min-w-[104px] flex-col gap-2.5 rounded-lg border border-line bg-surface px-4 py-3"
          >
            <Skeleton className="h-2.5 w-14" />
            <Skeleton className="h-5 w-10" />
          </div>
        ))}
      </div>
    </motion.section>
  );
}
