import { motion, useReducedMotion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { WidgetCard } from "./WidgetCard";
import { LockChip } from "@/components/subscription/LockChip";
import { FEATURES, useAccess } from "@/lib/access";
import { transition } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { quickAccessFixture } from "@/data/dashboardFixtures";

/**
 * Jump-off points into the rest of the workspace.
 *
 * Gated modules stay in the grid wearing a tier chip and open the upgrade
 * prompt instead of navigating — a free user should be able to see the whole
 * desk and know what each tool does, not be shown a shorter list.
 */
export function QuickAccess({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const { can, requestUpgrade } = useAccess();

  return (
    <WidgetCard title="Quick Access" className={className} interactive={false}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {quickAccessFixture.map((module) => {
          const Icon = module.icon;
          const locked = module.feature ? !can(module.feature) : false;

          return (
            <motion.div
              key={module.title}
              whileHover={reduceMotion ? undefined : { y: -2 }}
              transition={transition}
            >
              <button
                type="button"
                onClick={() =>
                  locked && module.feature
                    ? requestUpgrade(module.feature)
                    : navigate(module.to)
                }
                className={cn(
                  "group flex h-full w-full flex-col gap-2.5 rounded-lg border border-line bg-inset p-4 text-left",
                  "outline-none transition-colors duration-[180ms]",
                  "hover:border-line-hi hover:bg-surface-hi",
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface",
                      "transition-colors duration-[180ms] group-hover:border-atlas/40",
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-4 transition-colors duration-[180ms]",
                        locked ? "text-fg-faint" : "text-fg-muted group-hover:text-atlas",
                      )}
                    />
                  </span>
                  <span className="min-w-0 flex-1 text-[13px] font-medium leading-tight text-fg">
                    {module.title}
                  </span>
                  <ArrowUpRight className="size-3.5 shrink-0 text-fg-faint opacity-0 transition-opacity duration-[180ms] group-hover:opacity-100" />
                </div>

                <p className="text-[11px] leading-relaxed text-fg-muted">{module.description}</p>

                {locked && module.feature && (
                  <LockChip tier={FEATURES[module.feature].minTier} className="mt-auto" />
                )}
              </button>
            </motion.div>
          );
        })}
      </div>
    </WidgetCard>
  );
}
