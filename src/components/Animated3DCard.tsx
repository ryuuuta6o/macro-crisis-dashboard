"use client";

import type { ReactNode } from "react";
import {
  motion,
  useReducedMotion,
} from "motion/react";

type Animated3DCardProps = {
  children: ReactNode;
  className?: string;
  intensity?: number;
  lift?: number;
  glowColor?: string;
};

export function Animated3DCard({
  children,
  className = "",
  lift = 1,
}: Animated3DCardProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: reducedMotion ? 0 : 6 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-48px" }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      whileHover={reducedMotion ? undefined : { y: -Math.min(lift, 1) }}
      className={`transition-[background-color,border-color] duration-200 hover:border-white/[0.10] ${className}`}
    >
      {children}
    </motion.div>
  );
}
