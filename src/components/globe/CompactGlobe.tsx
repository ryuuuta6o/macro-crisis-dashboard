"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { GlobeHeroData } from "@/types/globe";

const CompactGlobeScene = dynamic(
  () => import("@/components/globe/CompactGlobeScene").then((module) => module.CompactGlobeScene),
  { ssr: false, loading: () => <div className="compact-globe-loading">GLOBAL RISK VIEW</div> },
);

export function CompactGlobe({ data }: { data: GlobeHeroData }) {
  const [webgl, setWebgl] = useState<boolean | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const canvas = document.createElement("canvas");
        setWebgl(Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl")));
      } catch {
        setWebgl(false);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="compact-globe-shell" aria-label="自転するホログラム地球">
      {webgl === true ? <CompactGlobeScene data={data} /> : <div className="compact-globe-fallback" />}
      <div className="compact-globe-vignette" />
    </div>
  );
}
