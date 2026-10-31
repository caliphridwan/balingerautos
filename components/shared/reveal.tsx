"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "li";
}

/** Fade-and-rise once when scrolled into view. Static for reduced motion. */
export function Reveal({ children, className, delay = 0, as = "div" }: RevealProps) {
  const reduce = useReducedMotion();

  const animation: HTMLMotionProps<"div"> = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 24 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "-80px" },
        transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] },
      };

  if (as === "li") {
    return (
      <motion.li
        className={className}
        initial={animation.initial}
        whileInView={animation.whileInView}
        viewport={animation.viewport}
        transition={animation.transition}
      >
        {children}
      </motion.li>
    );
  }
  return (
    <motion.div
      className={className}
      initial={animation.initial}
      whileInView={animation.whileInView}
      viewport={animation.viewport}
      transition={animation.transition}
    >
      {children}
    </motion.div>
  );
}
