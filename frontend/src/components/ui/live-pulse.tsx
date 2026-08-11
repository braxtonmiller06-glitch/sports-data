import { cn } from "@/lib/utils";

type PulseTone = "live" | "warn" | "idle";

const TONE: Record<PulseTone, { dot: string; ring: string; text: string }> = {
  live: { dot: "bg-atlas", ring: "bg-atlas/30", text: "text-atlas" },
  warn: { dot: "bg-signal-warn", ring: "bg-signal-warn/30", text: "text-signal-warn" },
  idle: { dot: "bg-fg-faint", ring: "bg-fg-faint/30", text: "text-fg-muted" },
};

/**
 * Status dot with a slow outward pulse.
 *
 * The label is always rendered, so state never depends on colour alone. Idle
 * does not animate — a pulse means "receiving", and a still dot should read as
 * the absence of that.
 */
export function LivePulse({
  tone = "live",
  label,
  className,
}: {
  tone?: PulseTone;
  label?: string;
  className?: string;
}) {
  const t = TONE[tone];

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="relative flex size-2 shrink-0">
        {tone !== "idle" && (
          <span
            aria-hidden="true"
            className={cn("absolute inline-flex size-full animate-ping rounded-full", t.ring)}
          />
        )}
        <span className={cn("relative inline-flex size-2 rounded-full", t.dot)} />
      </span>
      {label && <span className={cn("text-[11px] font-medium", t.text)}>{label}</span>}
    </span>
  );
}

/** Directional glyph + signed value. Never lets colour carry the direction alone. */
export function DeltaTag({
  delta,
  trend,
  className,
}: {
  delta: string;
  trend: "up" | "down" | "flat";
  className?: string;
}) {
  const tone =
    trend === "up" ? "text-atlas" : trend === "down" ? "text-signal-crit" : "text-fg-faint";
  const glyph = trend === "up" ? "▲" : trend === "down" ? "▼" : "—";

  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium", tone, className)}>
      <span aria-hidden="true" className="text-[8px] leading-none">
        {glyph}
      </span>
      {delta}
    </span>
  );
}
