import { cn } from "@/lib/utils";

/**
 * The Atlas mark: a peak with a horizon line through it. Drawn rather than
 * imported so it inherits currentColor and stays crisp at any size.
 */
export function AtlasMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn("size-5 text-atlas", className)}
    >
      <path
        d="M3 20 L12 4 L21 20"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path d="M7.6 14.2 H16.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

export function AtlasWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex min-w-0 flex-col leading-none", className)}>
      <span className="truncate text-[13px] font-semibold tracking-tight text-fg">Atlas</span>
      <span className="mt-1 truncate text-[10px] font-medium tracking-[0.18em] text-fg-faint">
        ANALYTICS
      </span>
    </span>
  );
}
