"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import { useReducedMotion } from "motion/react";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { AdditiveBlending, Euler, Group, Vector3 } from "three";
import { HolographicGlobe } from "@/components/globe/hologram/HolographicGlobe";
import { CityNetwork } from "@/components/globe/hologram/CityNetwork";
import type { GlobeHeroData, GlobeOrbitNodeData } from "@/types/globe";
import type { RiskLevel } from "@/types/indicator";

const levelColor: Record<RiskLevel | "neutral", string> = {
  green: "#42d66f",
  yellow: "#f0c419",
  orange: "#ff8a2b",
  red: "#ff5548",
  neutral: "#64c7ff",
};

const orbitLayouts = [
  { rotation: [0.18, 0, 0.12] as const, x: 2.22, z: 1.05 },
  { rotation: [-0.28, 0.18, -0.1] as const, x: 2.45, z: 0.9 },
  { rotation: [0.48, -0.18, 0.2] as const, x: 2.04, z: 1.18 },
];

const nodePositions: Array<[number, number, number]> = [
  [-2.08, 0.34, 0.38],
  [2.05, 0.22, 0.2],
  [1.65, 0.82, -0.5],
];

export function CompactGlobeScene({ data }: { data: GlobeHeroData }) {
  const reducedMotion = Boolean(useReducedMotion());
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0.08, 5.4], fov: 37, near: 0.1, far: 40 }}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
    >
      <Suspense fallback={null}>
        <CompactWorld data={data} reducedMotion={reducedMotion} />
        <EffectComposer multisampling={0}>
          <Bloom intensity={0.32} luminanceThreshold={0.68} luminanceSmoothing={0.88} mipmapBlur />
        </EffectComposer>
      </Suspense>
    </Canvas>
  );
}

function CompactWorld({ data, reducedMotion }: { data: GlobeHeroData; reducedMotion: boolean }) {
  const globe = useRef<Group>(null);
  useFrame((_, delta) => {
    if (!globe.current || reducedMotion) return;
    globe.current.rotation.y += delta * (Math.PI * 2 / 90);
  });
  const nodes = data.orbitNodes.filter((node) => node.id !== "credit").slice(0, 3);

  return (
    <>
      <ambientLight intensity={0.28} />
      <group scale={0.86}>
        <group ref={globe} rotation={[0.05, -1.8, -0.03]}>
          <HolographicGlobe reducedMotion={reducedMotion} lowPower={false} />
          <CityNetwork reducedMotion={reducedMotion} lowPower={false} />
        </group>
        {orbitLayouts.map((layout, index) => <CompactOrbit key={index} {...layout} />)}
        {nodes.map((node, index) => <CompactNode key={node.id} node={node} position={nodePositions[index]} />)}
      </group>
    </>
  );
}

function CompactOrbit({ rotation, x, z }: { rotation: readonly [number, number, number]; x: number; z: number }) {
  const points = useMemo(() => {
    const euler = new Euler(...rotation);
    return Array.from({ length: 97 }, (_, index) => {
      const angle = index / 96 * Math.PI * 2;
      return new Vector3(Math.cos(angle) * x, 0, Math.sin(angle) * z).applyEuler(euler);
    });
  }, [rotation, x, z]);
  return <Line points={points} color="#4b8ec7" lineWidth={0.65} transparent opacity={0.28} depthWrite={false} />;
}

function CompactNode({ node, position }: { node: GlobeOrbitNodeData; position: [number, number, number] }) {
  const pulse = useRef<Group>(null);
  const color = levelColor[node.level];
  useFrame(({ clock }) => {
    if (pulse.current) pulse.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 1.5 + node.id.length) * 0.08);
  });
  return (
    <group position={position}>
      <group ref={pulse}>
        <mesh><sphereGeometry args={[0.055, 14, 14]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>
        <mesh scale={2.5}><sphereGeometry args={[0.055, 10, 10]} /><meshBasicMaterial color={color} transparent opacity={0.14} blending={AdditiveBlending} depthWrite={false} toneMapped={false} /></mesh>
      </group>
      <Html center distanceFactor={6.4} style={{ pointerEvents: "none" }}>
        <div className="compact-globe-node"><i style={{ backgroundColor: color }} /><span>{node.id === "liquidity" ? "Liquidity" : node.id === "rates" ? "Rates" : "Growth"}</span></div>
      </Html>
    </group>
  );
}
