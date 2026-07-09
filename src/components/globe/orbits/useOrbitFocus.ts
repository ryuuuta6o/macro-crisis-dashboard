"use client";

import { useCallback, useEffect, useRef } from "react";
import { gsap } from "gsap";
import type { Object3D } from "three";

export type OrbitFocusState = {
  amount: number;
  target: Object3D | null;
};

export function useOrbitFocus(reducedMotion: boolean) {
  const focusState = useRef<OrbitFocusState>({ amount: 0, target: null });
  const lockedNode = useRef<string | null>(null);

  const hoverNode = useCallback(
    (id: string, target: Object3D, active: boolean) => {
      if (reducedMotion || lockedNode.current) return;
      if (active) {
        focusState.current.target = target;
        gsap.to(focusState.current, {
          amount: 0.34,
          duration: 0.5,
          ease: "power3.out",
          overwrite: true,
        });
        return;
      }
      gsap.to(focusState.current, {
        amount: 0,
        duration: 0.6,
        ease: "power3.out",
        overwrite: true,
        onComplete: () => {
          if (!lockedNode.current) focusState.current.target = null;
        },
      });
      void id;
    },
    [reducedMotion],
  );

  const activateNode = useCallback(
    (id: string, target: Object3D) => {
      if (reducedMotion) return;
      const releasing = lockedNode.current === id;
      lockedNode.current = releasing ? null : id;
      focusState.current.target = releasing ? null : target;
      gsap.to(focusState.current, {
        amount: releasing ? 0 : 0.82,
        duration: releasing ? 0.65 : 0.85,
        ease: "power3.inOut",
        overwrite: true,
      });
    },
    [reducedMotion],
  );

  useEffect(() => {
    const state = focusState.current;
    return () => gsap.killTweensOf(state);
  }, []);

  return { focusState, hoverNode, activateNode };
}
