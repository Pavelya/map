/**
 * AnimatedCounter Component
 *
 * Displays an animated number counter with smooth transitions.
 * Animates count changes using Framer Motion for visual feedback.
 */

import { useEffect, useRef, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { counterVariants } from '@/lib/animation-variants';
import { formatWithCommas } from '@/lib/stats-utils';

export interface AnimatedCounterProps {
  /**
   * The target value to animate to
   */
  value: number;

  /**
   * Animation duration in seconds
   * @default 0.5
   */
  duration?: number;

  /**
   * Optional suffix to append (e.g., "votes", "%")
   */
  suffix?: string;

  /**
   * Optional prefix to prepend (e.g., "$", "#")
   */
  prefix?: string;

  /**
   * Format number with commas (e.g., 1,234,567)
   * @default true
   */
  formatWithCommas?: boolean;

  /**
   * CSS class name for styling
   */
  className?: string;

  /**
   * Display as percentage (0-100 range)
   * @default false
   */
  isPercentage?: boolean;
}

/**
 * AnimatedCounter
 *
 * Smoothly animates number changes with scale pulse effect.
 * Formats numbers with commas and supports prefixes/suffixes.
 *
 * @example
 * ```tsx
 * <AnimatedCounter value={1234} suffix=" votes" />
 * // Displays: "1,234 votes"
 *
 * <AnimatedCounter value={75} isPercentage suffix="%" />
 * // Displays: "75%"
 * ```
 */
export function AnimatedCounter({
  value,
  suffix = '',
  prefix = '',
  formatWithCommas: shouldFormat = true,
  className = '',
  isPercentage = false,
}: AnimatedCounterProps) {
  const prevValueRef = useRef(value);
  const [animateKey, setAnimateKey] = useState(0);

  // Spring animation for smooth number transitions
  const spring = useSpring(value, {
    damping: 30,
    stiffness: 200,
  });

  // Transform spring value to rounded number
  const display = useTransform(spring, (latest) => {
    const rounded = Math.round(latest);

    if (isPercentage) {
      // Percentage values don't need comma formatting
      return `${prefix}${rounded}${suffix}`;
    }

    const formatted = shouldFormat ? formatWithCommas(rounded) : rounded.toString();
    return `${prefix}${formatted}${suffix}`;
  });

  // Update spring when value changes
  useEffect(() => {
    if (value !== prevValueRef.current) {
      spring.set(value);
      prevValueRef.current = value;

      // Trigger scale animation
      setAnimateKey((prev) => prev + 1);
    }
  }, [value, spring]);

  return (
    <motion.span
      key={animateKey}
      variants={counterVariants}
      initial="initial"
      animate={animateKey > 0 ? "update" : "initial"}
      className={className}
      aria-live="polite"
      aria-atomic="true"
    >
      <motion.span>{display}</motion.span>
    </motion.span>
  );
}

/**
 * SimpleAnimatedCounter
 *
 * Simpler version without spring physics, just using direct value updates.
 * Useful for cases where spring behavior is not desired.
 *
 * @example
 * ```tsx
 * <SimpleAnimatedCounter value={42} />
 * ```
 */
export function SimpleAnimatedCounter({
  value,
  suffix = '',
  prefix = '',
  formatWithCommas: shouldFormat = true,
  className = '',
}: Omit<AnimatedCounterProps, 'duration' | 'isPercentage'>) {
  const prevValueRef = useRef(value);
  const [animateKey, setAnimateKey] = useState(0);

  // Detect value changes
  useEffect(() => {
    if (value !== prevValueRef.current) {
      prevValueRef.current = value;
      setAnimateKey((prev) => prev + 1);
    }
  }, [value]);

  const formatted = shouldFormat ? formatWithCommas(value) : value.toString();
  const display = `${prefix}${formatted}${suffix}`;

  return (
    <motion.span
      key={animateKey}
      variants={counterVariants}
      initial="initial"
      animate={animateKey > 0 ? "update" : "initial"}
      className={className}
      aria-live="polite"
      aria-atomic="true"
    >
      {display}
    </motion.span>
  );
}
