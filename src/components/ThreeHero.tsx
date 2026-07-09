"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";

const ThreeHeroScene = dynamic(
  () =>
    import("@/components/three/ThreeHeroScene").then(
      (module) => module.ThreeHeroScene,
    ),
  {
    ssr: false,
    loading: () => <ThreeHeroFallback />,
  },
);

type ThreeHeroProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
  className?: string;
  enableOnMobile?: boolean;
};

type RenderMode = "checking" | "fallback" | "3d";

export function ThreeHero({
  eyebrow = "REAL-TIME MARKET INTELLIGENCE",
  title = "Signals in motion.",
  description = "軽量な3D表現で、市場シグナルの連動と変化を直感的に伝えます。",
  className = "",
  enableOnMobile = false,
}: ThreeHeroProps) {
  const rootRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();
  const [mode, setMode] = useState<RenderMode>("checking");
  const { scrollYProgress } = useScroll({
    target: rootRef,
    offset: ["start end", "end start"],
  });
  const sceneY = useTransform(scrollYProgress, [0, 1], [24, -24]);
  const contentY = useTransform(scrollYProgress, [0, 0.5, 1], [16, 0, -10]);

  useEffect(() => {
    const element = rootRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const mobile = window.matchMedia("(max-width: 767px)").matches;
          const lowPower = (navigator.hardwareConcurrency ?? 4) < 4;
          setMode(
            reducedMotion ||
              lowPower ||
              !supportsWebGl() ||
              (mobile && !enableOnMobile)
              ? "fallback"
              : "3d",
          );
          observer.disconnect();
        }
      },
      { rootMargin: "320px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [enableOnMobile, reducedMotion]);

  return (
    <section
      ref={rootRef}
      className={`relative isolate min-h-[420px] overflow-hidden rounded-3xl border border-cyan-300/15 bg-[#030b19] ${className}`}
    >
      <motion.div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ y: reducedMotion ? 0 : sceneY }}
      >
        {mode === "3d" ? <ThreeHeroScene /> : <ThreeHeroFallback />}
      </motion.div>

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(3,11,25,0.96)_0%,rgba(3,11,25,0.68)_42%,rgba(3,11,25,0.08)_78%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(3,11,25,0.84),transparent_45%)]" />

      <motion.div
        className="relative z-10 flex min-h-[420px] max-w-2xl flex-col justify-center px-6 py-14 sm:px-10 lg:px-14"
        style={{ y: reducedMotion ? 0 : contentY }}
      >
        <p className="text-[10px] font-bold tracking-[0.24em] text-cyan-300">
          {eyebrow}
        </p>
        <h2 className="mt-4 text-4xl font-bold tracking-[-0.05em] text-white sm:text-5xl">
          {title}
        </h2>
        <p className="mt-5 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
          {description}
        </p>
        <div className="mt-7 flex items-center gap-3 text-[10px] font-bold tracking-[0.14em] text-slate-400">
          <span className="size-2 rounded-full bg-cyan-300 shadow-[0_0_14px_#22d3ee]" />
          GPU ADAPTIVE / LAZY LOADED
        </div>
      </motion.div>
    </section>
  );
}

function supportsWebGl() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function ThreeHeroFallback() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_72%_48%,rgba(14,165,233,0.22),transparent_24%),radial-gradient(circle_at_78%_54%,rgba(79,70,229,0.18),transparent_38%),#030b19]">
      <div className="absolute right-[7%] top-1/2 size-64 -translate-y-1/2 rounded-full border border-cyan-300/20 bg-cyan-400/[0.04] shadow-[0_0_80px_rgba(14,165,233,0.14)] sm:size-80" />
      <div className="absolute right-[12%] top-1/2 h-36 w-80 -translate-y-1/2 rotate-[-12deg] rounded-[50%] border border-blue-400/25" />
      <div className="absolute right-[5%] top-1/2 h-52 w-96 -translate-y-1/2 rotate-[14deg] rounded-[50%] border border-indigo-400/15" />
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(56,189,248,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.05)_1px,transparent_1px)] [background-size:40px_40px]" />
    </div>
  );
}
