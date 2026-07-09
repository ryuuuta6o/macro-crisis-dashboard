"use client";

import { Html, Ring } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";
import type { SafetyValve3DItem } from "@/types/indicator";

const colors = {
  green: "#22c55e",
  yellow: "#facc15",
  orange: "#fb923c",
  red: "#f43f5e",
};

const sizes = {
  SSS: 0.3,
  SS: 0.255,
  S: 0.215,
  A: 0.18,
  B: 0.15,
};

export function SafetyValveNode({
  item,
  position,
  onSelect,
  reducedMotion = false,
  showLabel = true,
}: {
  item: SafetyValve3DItem;
  position: [number, number, number];
  onSelect: (id: SafetyValve3DItem["id"]) => void;
  reducedMotion?: boolean;
  showLabel?: boolean;
}) {
  const pulseRef = useRef<Group>(null);
  const color = colors[item.level];
  const size = sizes[item.importance];
  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onSelect(item.id);
  };

  useFrame(({ clock }) => {
    if (!pulseRef.current || reducedMotion) return;
    const phase = clock.elapsedTime * 1.3 + position[0];
    const scale = 1 + ((Math.sin(phase) + 1) / 2) * 0.32;
    pulseRef.current.scale.setScalar(scale);
  });

  return (
    <group position={position}>
      <group ref={pulseRef}>
        <Ring args={[size * 1.55, size * 1.62, 32]}>
          <meshBasicMaterial color={color} transparent opacity={0.28} />
        </Ring>
      </group>
      <mesh onClick={handleClick} scale={1.9}>
        <sphereGeometry args={[size, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.1} />
      </mesh>
      <mesh onClick={handleClick}>
        <icosahedronGeometry args={[size, 2]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={item.level === "red" ? 2.1 : 1.05}
          roughness={0.2}
          metalness={0.42}
        />
      </mesh>
      {showLabel && (
        <Html
          center
          distanceFactor={8}
          position={[0, size + 0.23, 0]}
          style={{ pointerEvents: "none" }}
        >
          <div className="node-label">
            <span className="node-label-dot" style={{ backgroundColor: color }} />
            {item.name}
            <span className="font-mono text-[8px] text-slate-500">{item.value}</span>
          </div>
        </Html>
      )}
    </group>
  );
}
