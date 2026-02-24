"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

interface ScrollRevealSectionProps {
  children: React.ReactNode;
  className?: string;
  /** Dark sections use a stronger "goes black" reveal for the GTE-style transition */
  dark?: boolean;
}

export function ScrollRevealSection({
  children,
  className = "",
  dark = false,
}: ScrollRevealSectionProps) {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });

  return (
    <motion.section
      ref={ref}
      initial={{
        opacity: 0,
        y: dark ? 48 : 24,
      }}
      animate={
        isInView
          ? {
              opacity: 1,
              y: 0,
            }
          : {}
      }
      transition={{
        duration: dark ? 0.7 : 0.5,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className={className}
    >
      {children}
    </motion.section>
  );
}
