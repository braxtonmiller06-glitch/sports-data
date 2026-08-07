import type { ComponentProps } from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Off-canvas panel. Used for the sidebar on mobile, where a persistent rail
 * would eat the whole viewport.
 */
export const Sheet = SheetPrimitive.Root;
export const SheetTrigger = SheetPrimitive.Trigger;
export const SheetClose = SheetPrimitive.Close;
export const SheetTitle = SheetPrimitive.Title;
export const SheetDescription = SheetPrimitive.Description;

export function SheetContent({
  className,
  children,
  side = "left",
  showClose = true,
  ...props
}: ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "left" | "right";
  showClose?: boolean;
}) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay
        className={cn(
          "fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
          "duration-[250ms]",
        )}
      />
      <SheetPrimitive.Content
        className={cn(
          "fixed inset-y-0 z-50 flex w-[264px] flex-col border-line bg-canvas",
          "duration-[250ms] ease-out",
          side === "left" &&
            "left-0 border-r data-[state=open]:animate-in data-[state=open]:slide-in-from-left " +
              "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left",
          side === "right" &&
            "right-0 border-l data-[state=open]:animate-in data-[state=open]:slide-in-from-right " +
              "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right",
          className,
        )}
        {...props}
      >
        {children}
        {showClose && (
          <SheetPrimitive.Close
            className={cn(
              "absolute right-3 top-3.5 rounded-md p-1.5 text-fg-faint",
              "transition-colors duration-[120ms] hover:bg-surface-hi hover:text-fg",
            )}
          >
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}
