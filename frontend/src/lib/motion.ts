import type { Transition, Variants } from "framer-motion";

/**
 * Shared motion language.
 *
 * Every duration here is at or under 250ms by design -- that is the ceiling
 * the app holds itself to, so the interface always feels answered rather than
 * animated. Import these instead of hand-writing transitions in components,
 * so timing stays consistent as the app grows.
 */

export const EASE_ATLAS: Transition["ease"] = [0.22, 1, 0.36, 1];

export const DURATION = {
  fast: 0.12,
  base: 0.18,
  slow: 0.25,
} as const;

export const transition: Transition = {
  duration: DURATION.base,
  ease: EASE_ATLAS,
};

export const transitionSlow: Transition = {
  duration: DURATION.slow,
  ease: EASE_ATLAS,
};

/** Whole-page enter. Applied once per route by AppShell. */
export const pageVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { ...transitionSlow, staggerChildren: 0.035, delayChildren: 0.02 },
  },
};

/**
 * Container that carries stagger timing without animating anything itself.
 *
 * Variant propagation flows through React context, so plain wrappers between a
 * motion parent and its motion children are fine. What a grid needs is its own
 * stagger clock — otherwise its cards inherit the page's single delay and all
 * arrive together.
 */
export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};

/** Card enter. Children of a `pageVariants` parent inherit its stagger. */
export const cardVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition },
};

/** Simple opacity fade, for content that should not travel. */
export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition },
};

/** Right-hand notification panel slide. */
export const panelVariants: Variants = {
  hidden: { opacity: 0, x: 16 },
  visible: { opacity: 1, x: 0, transition: transitionSlow },
  exit: { opacity: 0, x: 16, transition: { duration: DURATION.fast, ease: EASE_ATLAS } },
};

/** Hover lift shared by every interactive card surface. */
export const hoverLift = {
  whileHover: { y: -2 },
  whileTap: { y: 0 },
  transition,
} as const;
