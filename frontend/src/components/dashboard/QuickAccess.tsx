import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { WidgetCard } from "./WidgetCard";
import { transition } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { quickAccessFixture } from "@/data/dashboardFixtures";

/** Jump-off points into the rest of the workspace. */
export function QuickAccess({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <WidgetCard title="Quick Access" className={className} interactive={false}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {quickAccessFixture.map((module) => {
          const Icon = module.icon;
          return (
            <motion.div
              key={module.title}
              whileHover={reduceMotion ? undefined : { y: -2 }}
              transition={transition}
            >
              <Link
                to={module.to}
                className={cn(
                  "group flex h-full flex-col gap-2.5 rounded-lg border border-line bg-inset p-4",
                  "outline-none transition-colors duration-[180ms]",
                  "hover:border-line-hi hover:bg-surface-hi",
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface transition-colors duration-[180ms] group-hover:border-atlas/40">
                    <Icon className="size-4 text-fg-muted transition-colors duration-[180ms] group-hover:text-atlas" />
                  </span>
                  {/* No truncation: these titles are the label, and a clipped
                      "Research Rep…" is worse than a second line. */}
                  <span className="min-w-0 flex-1 text-[13px] font-medium leading-tight text-fg">
                    {module.title}
                  </span>
                  <ArrowUpRight className="size-3.5 shrink-0 text-fg-faint opacity-0 transition-opacity duration-[180ms] group-hover:opacity-100" />
                </div>
                <p className="text-[11px] leading-relaxed text-fg-muted">{module.description}</p>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </WidgetCard>
  );
}
