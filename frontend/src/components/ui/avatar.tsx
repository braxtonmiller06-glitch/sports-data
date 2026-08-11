import type { ComponentProps } from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "@/lib/utils";

export function Avatar({ className, ...props }: ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      className={cn(
        "relative flex size-8 shrink-0 overflow-hidden rounded-lg border border-line",
        className,
      )}
      {...props}
    />
  );
}

export function AvatarImage({ className, ...props }: ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image className={cn("aspect-square size-full object-cover", className)} {...props} />
  );
}

export function AvatarFallback({
  className,
  ...props
}: ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      className={cn(
        "flex size-full items-center justify-center bg-surface-hi text-[11px] font-medium text-fg-muted",
        className,
      )}
      {...props}
    />
  );
}

/** Initials from an email or display name, for the avatar fallback. */
export function initialsFrom(value: string | null | undefined): string {
  if (!value) return "—";
  const name = value.includes("@") ? value.split("@")[0] : value;
  const parts = name.split(/[.\s_-]+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
