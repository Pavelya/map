/**
 * Animation Variants
 *
 * Framer Motion animation variants for vote statistics components.
 * Provides smooth, consistent animations across the UI.
 */

import type { Variants } from 'framer-motion';

/**
 * Counter animation variants
 *
 * Animates number counters with a scale pulse effect on updates.
 * Creates visual feedback when vote counts change.
 */
export const counterVariants: Variants = {
  initial: {
    scale: 1,
  },
  update: {
    scale: [1, 1.2, 1],
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
};

/**
 * Bar animation variants
 *
 * Animates percentage bars with smooth width transitions.
 * Used for visualizing vote distribution.
 */
export const barVariants: Variants = {
  initial: {
    width: 0,
  },
  animate: {
    width: '100%',
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
};

/**
 * Fade in animation variants
 *
 * Smooth fade-in effect for stats display components.
 */
export const fadeInVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 10,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut',
    },
  },
};

/**
 * Pulse animation variants
 *
 * Subtle pulse effect to draw attention to live updates.
 */
export const pulseVariants: Variants = {
  initial: {
    scale: 1,
    opacity: 1,
  },
  pulse: {
    scale: [1, 1.05, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 0.6,
      ease: 'easeInOut',
    },
  },
};

/**
 * Slide in from left animation
 *
 * Used for team A stats entering from the left side.
 */
export const slideInLeftVariants: Variants = {
  hidden: {
    x: -20,
    opacity: 0,
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: 'easeOut',
    },
  },
};

/**
 * Slide in from right animation
 *
 * Used for team B stats entering from the right side.
 */
export const slideInRightVariants: Variants = {
  hidden: {
    x: 20,
    opacity: 0,
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: 'easeOut',
    },
  },
};

/**
 * Stagger container variants
 *
 * Parent container that staggers children animations.
 */
export const staggerContainerVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

/**
 * Percentage bar segment variants
 *
 * Animates individual segments of a percentage bar with smooth width transitions.
 */
export const barSegmentVariants: Variants = {
  initial: {
    width: '0%',
  },
  animate: (width: string) => ({
    width,
    transition: {
      duration: 0.6,
      ease: 'easeOut',
    },
  }),
};

/**
 * Number counter spring animation
 *
 * Smooth spring animation for number transitions.
 * Provides natural, bouncy feeling for count changes.
 */
export const springCounterVariants: Variants = {
  initial: {
    scale: 1,
  },
  update: {
    scale: [1, 1.15, 1],
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 20,
    },
  },
};

/**
 * Live indicator pulse
 *
 * Continuous pulse animation for "LIVE" indicators.
 */
export const liveIndicatorVariants: Variants = {
  pulse: {
    scale: [1, 1.2, 1],
    opacity: [1, 0.6, 1],
    transition: {
      duration: 2,
      ease: 'easeInOut',
      repeat: Infinity,
    },
  },
};
