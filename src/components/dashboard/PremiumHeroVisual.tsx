"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { Bloom, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import type { Group, Points } from "three";
import { AdditiveBlending, Color, MathUtils } from "three";
import type { IndicatorValue, RiskLevel } from "@/types/indicator";

type HeroSignal = {
  id: string;
  label: string;
  value: string;
  level: RiskLevel;
  height: number;
  angle: number;
};

const levelColor: Record<RiskLevel, string> = {
  green: "#4ade80",
  yellow: "#facc15",
  orange: "#fb923c",
  red: "#fb7185",
};

const levelRank: Record<RiskLevel, number> = {
  green: 0,
  yellow: 1,
  orange: 2,
  red: 3,
};

function toRiskLevel(signal: IndicatorValue["signal"]): RiskLevel {
  if (signal === "red") return "red";
  if (signal === "orange") return "orange";
  if (signal === "yellow") return "yellow";
  return "green";
}

function formatValue(item: IndicatorValue | undefined) {
  if (!item) return "--";
  if (item.numericValue === null) return item.value === null ? "--" : String(item.value);
  return `${item.numericValue.toFixed(item.decimals)}${item.unit}`;
}

function buildSignals(indicators: IndicatorValue[]): HeroSignal[] {
  const ids = [
    { id: "hy-oas", label: "HY OAS", redRef: 600 },
    { id: "vix", label: "VIX", redRef: 40 },
    { id: "dgs30", label: "US 30Y", redRef: 6 },
    { id: "sofr", label: "SOFR", redRef: 6 },
    { id: "baa-aaa", label: "BAA-AAA", redRef: 3 },
  ];
  return ids.map((definition, index) => {
    const item = indicators.find((candidate) => candidate.id === definition.id);
    const numeric = item?.numericValue ?? definition.redRef * 0.18;
    return {
      id: definition.id,
      label: definition.label,
      value: formatValue(item),
      level: toRiskLevel(item?.signal ?? "unavailable"),
      height: MathUtils.clamp(numeric / definition.redRef, 0.18, 1),
      angle: index / ids.length * Math.PI * 2 + Math.PI * 0.2,
    };
  });
}

export function PremiumHeroVisual({
  indicators,
  level,
}: {
  indicators: IndicatorValue[];
  level: RiskLevel;
}) {
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const signals = useMemo(() => buildSignals(indicators), [indicators]);

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

  if (webgl !== true) return <PremiumHeroFallback level={level} />;

  return (
    <div className="absolute inset-0">
      <Canvas
        dpr={[1, 1.55]}
        camera={{ position: [0, 0.12, 6.4], fov: 42, near: 0.1, far: 60 }}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      >
        <ambientLight intensity={0.22} />
        <pointLight position={[3.5, 2.4, 4.2]} intensity={14} color="#67e8f9" />
        <pointLight position={[-3.2, -1.8, 2.4]} intensity={7} color="#818cf8" />
        <PremiumScene signals={signals} level={level} />
        <EffectComposer multisampling={0}>
          <Bloom intensity={0.5} luminanceThreshold={0.48} luminanceSmoothing={0.86} mipmapBlur />
          <Noise opacity={0.035} />
          <Vignette eskil={false} offset={0.35} darkness={0.65} />
        </EffectComposer>
      </Canvas>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_64%_48%,transparent_0%,rgba(2,7,17,0.06)_44%,rgba(2,7,17,0.74)_100%)]" />
    </div>
  );
}

function PremiumScene({ signals, level }: { signals: HeroSignal[]; level: RiskLevel }) {
  const root = useRef<Group>(null);
  const orbit = useRef<Group>(null);
  const levelColorObject = useMemo(() => new Color(levelColor[level]), [level]);

  useFrame(({ clock, pointer }, delta) => {
    if (!root.current || !orbit.current) return;
    root.current.rotation.y = MathUtils.damp(root.current.rotation.y, pointer.x * 0.16 + clock.elapsedTime * 0.035, 2.8, delta);
    root.current.rotation.x = MathUtils.damp(root.current.rotation.x, -0.08 + pointer.y * 0.08, 3, delta);
    orbit.current.rotation.z += delta * 0.035;
    orbit.current.rotation.y -= delta * 0.02;
  });

  return (
    <group ref={root} position={[0.42, -0.08, 0]} rotation={[-0.08, 0, 0.05]}>
      <StarField />
      <group>
        <mesh>
          <icosahedronGeometry args={[1.05, 5]} />
          <meshPhysicalMaterial
            color="#061222"
            emissive={levelColorObject}
            emissiveIntensity={0.22 + levelRank[level] * 0.12}
            metalness={0.74}
            roughness={0.22}
            transparent
            opacity={0.88}
            wireframe
          />
        </mesh>
        <mesh scale={0.94}>
          <sphereGeometry args={[1.02, 48, 48]} />
          <meshPhysicalMaterial
            color="#020617"
            emissive="#0f3f5f"
            emissiveIntensity={0.32}
            metalness={0.55}
            roughness={0.34}
            transparent
            opacity={0.56}
          />
        </mesh>
        <mesh scale={1.15}>
          <sphereGeometry args={[1.02, 48, 48]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.055} blending={AdditiveBlending} depthWrite={false} />
        </mesh>
      </group>

      <group ref={orbit}>
        <OrbitRing radius={1.62} tube={0.006} color="#38bdf8" rotation={[1.08, 0.08, -0.28]} opacity={0.46} />
        <OrbitRing radius={2.02} tube={0.005} color="#818cf8" rotation={[1.24, -0.32, 0.42]} opacity={0.34} />
        <OrbitRing radius={2.42} tube={0.004} color="#f59e0b" rotation={[0.82, 0.4, -0.54]} opacity={0.25} />
      </group>

      {signals.map((signal) => <SignalColumn key={signal.id} signal={signal} />)}
    </group>
  );
}

function OrbitRing({
  radius,
  tube,
  color,
  rotation,
  opacity,
}: {
  radius: number;
  tube: number;
  color: string;
  rotation: [number, number, number];
  opacity: number;
}) {
  return (
    <mesh rotation={rotation}>
      <torusGeometry args={[radius, tube, 6, 180]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} blending={AdditiveBlending} depthWrite={false} />
    </mesh>
  );
}

function SignalColumn({ signal }: { signal: HeroSignal }) {
  const pulse = useRef<Group>(null);
  const color = levelColor[signal.level];
  const radius = 1.48;
  const x = Math.cos(signal.angle) * radius;
  const z = Math.sin(signal.angle) * radius * 0.34;
  const y = Math.sin(signal.angle * 1.7) * 0.38;
  const height = 0.45 + signal.height * 1.35;

  useFrame(({ clock }) => {
    if (!pulse.current) return;
    pulse.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 2 + signal.angle) * 0.065);
  });

  return (
    <group position={[x, y, z]}>
      <group ref={pulse}>
        <mesh position={[0, height / 2, 0]}>
          <cylinderGeometry args={[0.016, 0.028, height, 18, 1, true]} />
          <meshBasicMaterial color={color} transparent opacity={0.52} blending={AdditiveBlending} depthWrite={false} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.055, 18, 18]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
        <mesh scale={3.2}>
          <sphereGeometry args={[0.055, 14, 14]} />
          <meshBasicMaterial color={color} transparent opacity={0.12} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      </group>
      <Html center distanceFactor={6.8} position={[0, height + 0.12, 0]} style={{ pointerEvents: "none" }}>
        <div className="premium-hero-node">
          <i style={{ backgroundColor: color, boxShadow: `0 0 12px ${color}` }} />
          <span>{signal.label}</span>
          <b>{signal.value}</b>
        </div>
      </Html>
    </group>
  );
}

function StarField() {
  const points = useRef<Points>(null);
  const positions = useMemo(() => {
    const count = 220;
    const values = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      values[index * 3] = (random(index * 3) - 0.5) * 11;
      values[index * 3 + 1] = (random(index * 3 + 1) - 0.5) * 5.4;
      values[index * 3 + 2] = (random(index * 3 + 2) - 0.5) * 5.8;
    }
    return values;
  }, []);

  useFrame((_, delta) => {
    if (points.current) points.current.rotation.y += delta * 0.006;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#bae6fd" size={0.018} transparent opacity={0.5} depthWrite={false} />
    </points>
  );
}

function random(seed: number) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function PremiumHeroFallback({ level }: { level: RiskLevel }) {
  const color = levelColor[level];
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#020711]">
      <div className="absolute right-[6%] top-1/2 size-72 -translate-y-1/2 rounded-full border border-cyan-300/20 bg-cyan-300/[0.04] sm:size-96" style={{ boxShadow: `0 0 90px ${color}33` }} />
      <div className="absolute right-[9%] top-1/2 h-52 w-[30rem] -translate-y-1/2 rotate-[-13deg] rounded-[50%] border border-cyan-300/25" />
      <div className="absolute right-[4%] top-1/2 h-64 w-[34rem] -translate-y-1/2 rotate-[18deg] rounded-[50%] border border-indigo-300/16" />
    </div>
  );
}
