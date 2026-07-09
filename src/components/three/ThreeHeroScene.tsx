"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import type { Group, Points } from "three";
import { AdditiveBlending, MathUtils } from "three";

function MarketCore() {
  const group = useRef<Group>(null);
  const orbit = useRef<Group>(null);

  useFrame(({ clock, pointer }, delta) => {
    if (!group.current || !orbit.current) return;
    group.current.rotation.x = MathUtils.damp(
      group.current.rotation.x,
      pointer.y * 0.18,
      4,
      delta,
    );
    group.current.rotation.y = MathUtils.damp(
      group.current.rotation.y,
      pointer.x * 0.3 + clock.elapsedTime * 0.035,
      3,
      delta,
    );
    orbit.current.rotation.z -= delta * 0.035;
  });

  return (
    <group ref={group} position={[1.7, 0, 0]}>
      <mesh>
        <icosahedronGeometry args={[1.25, 2]} />
        <meshStandardMaterial
          color="#071f42"
          emissive="#075985"
          emissiveIntensity={0.72}
          metalness={0.68}
          roughness={0.32}
          wireframe
        />
      </mesh>
      <mesh scale={0.93}>
        <icosahedronGeometry args={[1.25, 3]} />
        <meshStandardMaterial
          color="#06152e"
          emissive="#172554"
          emissiveIntensity={0.5}
          metalness={0.75}
          roughness={0.25}
        />
      </mesh>
      <group ref={orbit}>
        <SignalOrbit radius={1.8} rotation={[1.1, 0.2, -0.2]} color="#38bdf8" />
        <SignalOrbit radius={2.25} rotation={[1.4, -0.3, 0.45]} color="#818cf8" />
        <SignalOrbit radius={2.7} rotation={[0.9, 0.45, -0.55]} color="#fb923c" />
      </group>
      <SignalNode position={[2.2, 0.55, 0.2]} color="#38bdf8" />
      <SignalNode position={[-1.85, 0.9, 0.5]} color="#4ade80" />
      <SignalNode position={[0.4, -1.55, 1.1]} color="#fb923c" />
    </group>
  );
}

function SignalOrbit({
  radius,
  rotation,
  color,
}: {
  radius: number;
  rotation: [number, number, number];
  color: string;
}) {
  return (
    <mesh rotation={rotation}>
      <torusGeometry args={[radius, 0.012, 5, 120]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.52}
        blending={AdditiveBlending}
      />
    </mesh>
  );
}

function SignalNode({
  position,
  color,
}: {
  position: [number, number, number];
  color: string;
}) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.075, 12, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh scale={2.4}>
        <sphereGeometry args={[0.075, 10, 10]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.16}
          blending={AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

function SignalDust({ count = 90 }: { count?: number }) {
  const points = useRef<Points>(null);
  const positions = useMemo(() => {
    const values = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      values[index * 3] = (pseudoRandom(index * 3) - 0.5) * 10;
      values[index * 3 + 1] = (pseudoRandom(index * 3 + 1) - 0.5) * 5;
      values[index * 3 + 2] = (pseudoRandom(index * 3 + 2) - 0.5) * 4;
    }
    return values;
  }, [count]);

  useFrame((_, delta) => {
    if (points.current) points.current.rotation.y += delta * 0.012;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#7dd3fc"
        size={0.025}
        transparent
        opacity={0.55}
        depthWrite={false}
      />
    </points>
  );
}

function pseudoRandom(seed: number) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

export function ThreeHeroScene() {
  return (
    <Canvas
      dpr={[1, 1.35]}
      camera={{ position: [0, 0, 7.4], fov: 42 }}
      gl={{
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      }}
      performance={{ min: 0.6 }}
    >
      <PerformanceMonitor flipflops={3}>
        <ambientLight intensity={0.55} />
        <directionalLight position={[4, 4, 6]} intensity={2.2} color="#dbeafe" />
        <pointLight position={[2, -1, 3]} intensity={12} color="#0ea5e9" />
        <pointLight position={[-3, 2, 1]} intensity={8} color="#4f46e5" />
        <MarketCore />
        <SignalDust />
      </PerformanceMonitor>
    </Canvas>
  );
}
