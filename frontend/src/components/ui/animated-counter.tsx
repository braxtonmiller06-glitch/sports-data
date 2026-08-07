import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedCounterProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  /** Capped at the app's 250ms motion ceiling for short counts; longer reads better. */
  durationMs?: number;
  className?: string;
}

/**
 * Counts up to `value` once, when it first scrolls into view.
 *
 * Figures are deliberately proportional, not tabular: equal-width digits make a
 * large standalone number look loose. Tabular belongs in columns, not headlines.
 */
export function AnimatedCounter({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  durationMs = 900,
  className,
}: AnimatedCounterProps) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(reduceMotion ? value : 0);

  useEffect(() => {
    if (reduceMotion) {
      setDisplay(value);
      return;
    }

    const node = ref.current;
    if (!node) return;

    let frame = 0;
    let start: number | null = null;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        observer.disconnect();

        const step = (ts: number) => {
          if (start === null) start = ts;
          const progress = Math.min((ts - start) / durationMs, 1);
          // easeOutExpo: moves immediately, settles precisely.
          const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
          setDisplay(value * eased);
          if (progress < 1) frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
      },
      { threshold: 0.2 },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, durationMs, reduceMotion]);

  const formatted = display.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span ref={ref} className={cn(className)}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
