import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * The surface every panel in the app is built on: #17181C, a hairline #2A2C32
 * border, rounded corners, and no shadow at rest. Elevation is expressed by
 * border brightness rather than drop shadow -- shadows read as heavy against
 * a near-black canvas.
 */
export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-line bg-surface",
        "transition-colors duration-[180ms]",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 border-b border-line-faint px-5 py-4",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: ComponentProps<"h3">) {
  return (
    <h3
      className={cn("text-sm font-medium tracking-tight text-fg", className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("text-[13px] leading-relaxed text-fg-muted", className)} {...props} />;
}

/** Right-aligned slot in a CardHeader, for counts, timestamps or actions. */
export function CardAction({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("ml-auto flex items-center gap-2", className)} {...props} />;
}

export function CardContent({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex-1 p-5", className)} {...props} />;
}

export function CardFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("flex items-center gap-3 border-t border-line-faint px-5 py-4", className)}
      {...props}
    />
  );
}
