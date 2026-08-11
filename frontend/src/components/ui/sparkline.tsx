import { useId } from "react";
import { cn } from "@/lib/utils";
import type { Trend } from "@/data/dashboardFixtures";

interface SparklineProps {
  /** Single series, oldest first. */
  data: number[];
  trend?: Trend;
  className?: string;
  /** Accessible summary. The visible value and delta carry the number itself. */
  label?: string;
}

const STROKE: Record<Trend, string> = {
  up: "var(--color-atlas)",
  down: "var(--color-signal-crit)",
  flat: "var(--color-fg-faint)",
};

const VIEW_W = 100;
const VIEW_H = 28;

/**
 * Micro trend line for a single series.
 *
 * Intentionally spare: no grid, no axes, no per-point labels — only the shape,
 * a soft area wash, and an emphasised endpoint marking "now". The stroke is
 * non-scaling so it stays a hairline no matter how the box is stretched, and
 * direction is never carried by colour alone; the metric beside it always
 * shows a signed delta and an arrow.
 */
export function Sparkline({ data, trend = "flat", className, label }: SparklineProps) {
  const gradientId = useId();

  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  // A flat series would divide by zero; render it down the middle instead.
  const span = max - min || 1;

  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * VIEW_W;
    const y = max === min ? VIEW_H / 2 : VIEW_H - ((value - min) / span) * VIEW_H;
    return [x, y] as const;
  });

  const line = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const area = `${line} L${VIEW_W},${VIEW_H} L0,${VIEW_H} Z`;
  const [lastX, lastY] = points[points.length - 1];
  const stroke = STROKE[trend];

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={label ?? "Trend over the last 12 intervals"}
      className={cn("h-7 w-full overflow-visible", className)}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.18" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>

      <path d={area} fill={`url(#${gradientId})`} />
      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {/* Endpoint = "now". The 2px surface ring keeps it legible over the wash. */}
      <circle
        cx={lastX}
        cy={lastY}
        r="2.5"
        fill={stroke}
        stroke="var(--color-surface)"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
