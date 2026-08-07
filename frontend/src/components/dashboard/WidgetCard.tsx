import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cardVariants, transition } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface WidgetCardProps {
  title?: string;
  /** Right-aligned header slot: status, counts, controls. */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  /** Hover lift. Off for cards holding their own interactive controls. */
  interactive?: boolean;
  /** Drop the header entirely for cards that own their full layout. */
  bare?: boolean;
}

/**
 * The chrome every dashboard module wears: fade-in, optional hover lift, and a
 * consistent header. Widgets supply content only, so spacing and motion stay
 * identical across the grid.
 */
export function WidgetCard({
  title,
  action,
  children,
  className,
  contentClassName,
  interactive = true,
  bare = false,
}: WidgetCardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      variants={cardVariants}
      whileHover={interactive && !reduceMotion ? { y: -2 } : undefined}
      transition={transition}
      className={cn("min-w-0", className)}
    >
      <Card className={cn("h-full", interactive && "hover:border-line-hi")}>
        {!bare && title && (
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            {action && <CardAction>{action}</CardAction>}
          </CardHeader>
        )}
        <CardContent className={cn(bare && "p-0", contentClassName)}>{children}</CardContent>
      </Card>
    </motion.div>
  );
}
