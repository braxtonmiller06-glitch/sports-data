import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cardVariants, transition } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface PlaceholderCardProps {
  title: string;
  /** Right-aligned header slot: counts, timestamps, controls. */
  action?: ReactNode;
  /** Skeleton content shaped like the widget that will eventually live here. */
  children: ReactNode;
  className?: string;
  /** Disable the hover lift for cards that are not themselves clickable. */
  interactive?: boolean;
}

/**
 * Structural stand-in for a dashboard widget.
 *
 * Renders the real chrome — border, header, spacing — with skeleton content
 * inside, so layout and rhythm can be judged before any data exists. Swapping
 * in a finished widget means replacing `children`, not the card.
 */
export function PlaceholderCard({
  title,
  action,
  children,
  className,
  interactive = true,
}: PlaceholderCardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      variants={cardVariants}
      whileHover={interactive && !reduceMotion ? { y: -2 } : undefined}
      transition={transition}
      className={cn("min-w-0", className)}
    >
      <Card className={cn("h-full", interactive && "hover:border-line-hi")}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {action && <CardAction>{action}</CardAction>}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </motion.div>
  );
}
