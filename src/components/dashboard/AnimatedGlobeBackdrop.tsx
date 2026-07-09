"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";

export function AnimatedGlobeBackdrop() {
  const rootRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const root = rootRef.current;
    if (!root || reducedMotion) return;

    const updatePointer = (event: PointerEvent) => {
      const rect = root.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      root.style.setProperty("--globe-x", x.toFixed(3));
      root.style.setProperty("--globe-y", y.toFixed(3));
    };
    const resetPointer = () => {
      root.style.setProperty("--globe-x", "0");
      root.style.setProperty("--globe-y", "0");
    };

    root.addEventListener("pointermove", updatePointer);
    root.addEventListener("pointerleave", resetPointer);
    return () => {
      root.removeEventListener("pointermove", updatePointer);
      root.removeEventListener("pointerleave", resetPointer);
    };
  }, [reducedMotion]);

  return (
    <div ref={rootRef} className="animated-globe-backdrop" aria-hidden="true">
      <div className="globe-depth-layer globe-depth-layer--far" />
      <div className="globe-depth-layer globe-depth-layer--scene" />
      <div className="globe-depth-layer globe-depth-layer--earth" />
      <div className="globe-orbit-glow globe-orbit-glow--one" />
      <div className="globe-orbit-glow globe-orbit-glow--two" />
      <div className="globe-scan-light" />
      <div className="globe-vignette" />
    </div>
  );
}
