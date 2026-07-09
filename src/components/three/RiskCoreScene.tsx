"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, OrbitControls, Sparkles } from "@react-three/drei";
import type { Group, Mesh } from "three";
import { AdditiveBlending, BackSide, DoubleSide } from "three";
import { ContagionLine } from "@/components/three/ContagionLine";
import { SafetyValveNode } from "@/components/three/SafetyValveNode";
import type {
  ContagionLink,
  RiskLevel,
  SafetyValve3DItem,
} from "@/types/indicator";

const colors = {
  green: "#22c55e",
  yellow: "#facc15",
  orange: "#fb923c",
  red: "#f43f5e",
};

function GlobeCore({
  level,
  reducedMotion,
}: {
  level: RiskLevel;
  reducedMotion: boolean;
}) {
  const globeRef = useRef<Group>(null);
  const haloRef = useRef<Mesh>(null);
  const orbitRef = useRef<Group>(null);

  useFrame(({ clock }, delta) => {
    if (reducedMotion) return;
    if (globeRef.current) globeRef.current.rotation.y += delta * 0.055;
    if (orbitRef.current) orbitRef.current.rotation.y -= delta * 0.035;
    if (haloRef.current) {
      const pulse = 1 + Math.sin(clock.elapsedTime * 1.15) * 0.025;
      haloRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group>
      <group ref={globeRef} rotation={[0.12, 0, -0.08]}>
        <mesh>
          <sphereGeometry args={[1.18, 42, 42]} />
          <meshStandardMaterial
            color="#061a38"
            emissive="#0b4d82"
            emissiveIntensity={0.62}
            roughness={0.42}
            metalness={0.55}
            transparent
            opacity={0.9}
          />
        </mesh>
        <mesh scale={1.012}>
          <sphereGeometry args={[1.18, 24, 16]} />
          <meshBasicMaterial
            color="#60a5fa"
            wireframe
            transparent
            opacity={0.2}
            blending={AdditiveBlending}
          />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[1.19, 0.008, 6, 128]} />
          <meshBasicMaterial color="#7dd3fc" transparent opacity={0.42} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.19, 0.008, 6, 128]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.32} />
        </mesh>
      </group>

      <mesh ref={haloRef} scale={1.42}>
        <sphereGeometry args={[1.18, 32, 32]} />
        <meshBasicMaterial
          color={colors[level]}
          side={BackSide}
          transparent
          opacity={0.045}
        />
      </mesh>

      <group ref={orbitRef}>
        <OrbitRing rotation={[1.17, 0.08, 0.18]} radius={1.78} color="#60a5fa" />
        <OrbitRing rotation={[1.4, 0.35, -0.48]} radius={2.18} color={colors[level]} />
        <OrbitRing rotation={[0.92, -0.24, 0.72]} radius={2.58} color="#2563eb" />
      </group>
    </group>
  );
}

function OrbitRing({
  rotation,
  radius,
  color,
}: {
  rotation: [number, number, number];
  radius: number;
  color: string;
}) {
  return (
    <mesh rotation={rotation}>
      <torusGeometry args={[radius, 0.012, 6, 160]} />
      <meshBasicMaterial
        color={color}
        side={DoubleSide}
        transparent
        opacity={0.34}
        blending={AdditiveBlending}
      />
    </mesh>
  );
}

function Scene({
  items,
  links,
  level,
  reducedMotion,
  onSelect,
  hideLabels,
  hideNodes,
}: {
  items: SafetyValve3DItem[];
  links: ContagionLink[];
  level: RiskLevel;
  reducedMotion: boolean;
  onSelect: (id: SafetyValve3DItem["id"]) => void;
  hideLabels: boolean;
  hideNodes: boolean;
}) {
  const positions = useMemo(() => {
    const map = new Map<SafetyValve3DItem["id"], [number, number, number]>();
    items.forEach((item, index) => {
      const angle = (index / items.length) * Math.PI * 2 - Math.PI / 2;
      const radius = index % 3 === 0 ? 2.5 : index % 2 === 0 ? 2.85 : 3.12;
      map.set(item.id, [
        Math.cos(angle) * radius,
        Math.sin(angle) * radius * 0.48,
        Math.sin(angle * 2) * 0.46,
      ]);
    });
    return map;
  }, [items]);

  return (
    <>
      <ambientLight intensity={0.45} />
      <directionalLight position={[3, 4, 5]} intensity={2.8} color="#dbeafe" />
      <pointLight position={[-3, -1, 3]} intensity={18} color="#2563eb" />
      <pointLight position={[3, 1, 2]} intensity={10} color={colors[level]} />
      <GlobeCore level={level} reducedMotion={reducedMotion} />
      {!hideNodes && links.map((link, index) => {
        const from = positions.get(link.from);
        const to = positions.get(link.to);
        return from && to ? (
          <ContagionLine
            key={`${link.from}-${link.to}`}
            from={from}
            to={to}
            level={link.level}
            delay={index * 0.37}
            reducedMotion={reducedMotion}
          />
        ) : null;
      })}
      {!hideNodes && items.map((item) => (
        <Float
          key={item.id}
          speed={reducedMotion ? 0 : 0.65}
          rotationIntensity={reducedMotion ? 0 : 0.08}
          floatIntensity={reducedMotion ? 0 : 0.15}
        >
          <SafetyValveNode
            item={item}
            position={positions.get(item.id) ?? [0, 0, 0]}
            onSelect={onSelect}
            reducedMotion={reducedMotion}
            showLabel={!hideLabels}
          />
        </Float>
      ))}
      {!reducedMotion && (
        <Sparkles
          count={48}
          scale={[7, 4, 3.6]}
          size={1}
          speed={0.12}
          color="#60a5fa"
          opacity={0.32}
        />
      )}
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate={!reducedMotion}
        autoRotateSpeed={0.12}
        minPolarAngle={Math.PI / 2.75}
        maxPolarAngle={Math.PI / 1.6}
      />
    </>
  );
}

export function RiskCoreScene({
  items,
  links,
  level,
  reducedMotion,
  onSelect,
  hideLabels = false,
  hideNodes = false,
}: {
  items: SafetyValve3DItem[];
  links: ContagionLink[];
  level: RiskLevel;
  reducedMotion: boolean;
  onSelect: (id: SafetyValve3DItem["id"]) => void;
  hideLabels?: boolean;
  hideNodes?: boolean;
}) {
  return (
    <Canvas
      dpr={[1, 1.4]}
      camera={{ position: [0, 0.12, 7.65], fov: 42 }}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      }}
    >
      <Suspense fallback={null}>
        <Scene
          items={items}
          links={links}
          level={level}
          reducedMotion={reducedMotion}
          onSelect={onSelect}
          hideLabels={hideLabels}
          hideNodes={hideNodes}
        />
      </Suspense>
    </Canvas>
  );
}
