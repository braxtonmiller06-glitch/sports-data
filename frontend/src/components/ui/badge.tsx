import type { ComponentProps } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium " +
    "whitespace-nowrap transition-colors duration-[180ms] [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        neutral: "border-line bg-surface-hi text-fg-muted",
        atlas: "border-atlas/30 bg-atlas/10 text-atlas",
        warn: "border-signal-warn/30 bg-signal-warn/10 text-signal-warn",
        critical: "border-signal-crit/30 bg-signal-crit/10 text-signal-crit",
        outline: "border-line text-fg-muted",
      },
      size: {
        sm: "px-1.5 py-0 text-[10px]",
        md: "px-2 py-0.5 text-[11px]",
      },
    },
    defaultVariants: {
      variant: "neutral",
      size: "md",
    },
  },
);

export interface BadgeProps
  extends ComponentProps<"span">,
    VariantProps<typeof badgeVariants> {
  asChild?: boolean;
}

export function Badge({ className, variant, size, asChild = false, ...props }: BadgeProps) {
  const Comp = asChild ? Slot : "span";
  return <Comp className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

export { badgeVariants };
