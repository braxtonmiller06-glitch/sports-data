import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge conditional class names, letting later Tailwind utilities win over
 * earlier ones that target the same property. Every component in the design
 * system takes a `className` prop and funnels it through here, so callers can
 * always override a default without fighting specificity.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
