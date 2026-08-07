import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, type = "text", ...props }: ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "h-9 w-full rounded-lg border border-line bg-inset px-3 text-sm text-fg",
        "placeholder:text-fg-faint",
        "transition-colors duration-[180ms]",
        "hover:border-line-hi",
        "focus:border-atlas/50 focus:outline-none focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
