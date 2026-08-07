import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { LivePulse } from "@/components/ui/live-pulse";
import { LockChip } from "@/components/subscription/LockChip";
import { FEATURES, useAccess } from "@/lib/access";
import { cardVariants, staggerContainer } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { ToolDef } from "@/lib/tools";

interface ToolShellProps {
  tool: ToolDef;
  /** Sport / date / market selectors, rendered on the header's right. */
  controls?: ReactNode;
  lastUpdated?: string;
  children: ReactNode;
}

/**
 * The frame every tool page wears.
 *
 * Keeps the header, control row and workspace rhythm identical across all
 * eight, so a tool is recognisably part of the same terminal rather than its
 * own island. Tools supply controls and a workspace; nothing else.
 */
export function ToolShell({
  tool,
  controls,
  lastUpdated = "Updated 18 seconds ago",
  children,
}: ToolShellProps) {
  const { can } = useAccess();
  const Icon = tool.icon;
  const gatedFeature = tool.premiumFeature;
  const showLockHint = gatedFeature ? !can(gatedFeature) : false;

  return (
    <AppShell>
      <motion.div variants={staggerContainer} className="flex flex-col gap-5">
        {/* Header */}
        <motion.header
          variants={cardVariants}
          className="flex flex-col gap-5 border-b border-line pb-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-line bg-surface">
                <Icon className="size-5 text-atlas" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold tracking-tight text-fg">{tool.name}</h2>
                  {showLockHint && gatedFeature && (
                    <LockChip tier={FEATURES[gatedFeature].minTier} />
                  )}
                </div>
                <p className="mt-1.5 max-w-[64ch] text-[13px] text-fg-muted">
                  {tool.description}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-2">
              <LivePulse tone="live" label="Live" />
              <span className="text-[11px] text-fg-faint">{lastUpdated}</span>
            </div>
          </div>

          {controls && (
            <div className={cn("grid gap-3", "grid-cols-2 sm:grid-cols-3 xl:grid-cols-5")}>
              {controls}
            </div>
          )}
        </motion.header>

        {children}
      </motion.div>
    </AppShell>
  );
}
