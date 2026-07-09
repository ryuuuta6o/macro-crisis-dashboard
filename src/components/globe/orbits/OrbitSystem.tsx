"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Html, Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import {
  AdditiveBlending,
  Euler,
  Group,
  Object3D,
  Vector3,
} from "three";
import type { Line2 } from "three/examples/jsm/lines/Line2.js";
import type { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import {
  GLOBE_ORBITS,
  GLOBE_ORBIT_NODES,
} from "@/config/globe-orbits";
import type { GlobeHeroData } from "@/types/globe";
import type { RiskLevel } from "@/types/indicator";

const levelColor: Record<RiskLevel, string> = {
  green: "#3FB950",
  yellow: "#D29922",
  orange: "#D97706",
  red: "#F85149",
};
const neutralColor = "#8B8D93";

export type OrbitNodeInteraction = (
  id: string,
  target: Object3D,
  active: boolean,
) => void;

export type OrbitNodeActivation = (id: string, target: Object3D) => void;

export function OrbitSystem({
  data,
  reducedMotion,
  lowPower,
  onNodeHover,
  onNodeActivate,
}: {
  data: GlobeHeroData;
  reducedMotion: boolean;
  lowPower: boolean;
  onNodeHover: OrbitNodeInteraction;
  onNodeActivate: OrbitNodeActivation;
}) {
  const system = useRef<Group>(null);
  const orbitConfigs = lowPower ? GLOBE_ORBITS.slice(0, 2) : GLOBE_ORBITS;
  const nodes = useMemo(() => buildNodeData(data), [data]);

  useFrame((_, delta) => {
    if (!system.current || reducedMotion) return;
    system.current.rotation.y += delta * 0.018;
  });

  return (
    <group ref={system}>
      {orbitConfigs.map((orbit, index) => (
        <OrbitRing
          key={orbit.id}
          config={orbit}
          index={index}
          reducedMotion={reducedMotion}
          lowPower={lowPower}
        />
      ))}
      {nodes.map((node) => (
        <RiskNode
          key={node.id}
          {...node}
          reducedMotion={reducedMotion}
          lowPower={lowPower}
          onHover={onNodeHover}
          onActivate={onNodeActivate}
        />
      ))}
    </group>
  );
}

function OrbitRing({
  config,
  index,
  reducedMotion,
  lowPower,
}: {
  config: (typeof GLOBE_ORBITS)[number];
  index: number;
  reducedMotion: boolean;
  lowPower: boolean;
}) {
  const signalLine = useRef<Line2>(null);
  const points = useMemo(() => {
    const rotation = new Euler(...config.rotation);
    return Array.from({ length: lowPower ? 73 : 129 }, (_, pointIndex) => {
      const progress = pointIndex / (lowPower ? 72 : 128);
      const angle = progress * Math.PI * 2;
      return new Vector3(
        Math.cos(angle) * config.radiusX,
        0,
        Math.sin(angle) * config.radiusZ,
      ).applyEuler(rotation);
    });
  }, [config, lowPower]);

  useFrame((_, delta) => {
    if (!signalLine.current || reducedMotion) return;
    const material = signalLine.current.material as LineMaterial;
    material.dashOffset -= delta * (0.06 + index * 0.018);
  });

  return (
    <group>
      <Line
        points={points}
        color="#6d8797"
        lineWidth={lowPower ? 0.42 : 0.62}
        transparent
        opacity={0.2}
        depthWrite={false}
      />
      {!lowPower && (
        <Line
          ref={signalLine}
          points={points}
          color="#9ac4d8"
          lineWidth={0.78}
          transparent
          opacity={0.34}
          dashed
          dashScale={12}
          dashSize={0.18}
          gapSize={1.1}
          depthWrite={false}
        />
      )}
    </group>
  );
}

function RiskNode({
  id,
  label,
  subtitle,
  position,
  level,
  value,
  reducedMotion,
  lowPower,
  onHover,
  onActivate,
}: ReturnType<typeof buildNodeData>[number] & {
  reducedMotion: boolean;
  lowPower: boolean;
  onHover: OrbitNodeInteraction;
  onActivate: OrbitNodeActivation;
}) {
  const group = useRef<Group>(null);
  const pulse = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);
  const color = level === "neutral" ? neutralColor : levelColor[level];

  useFrame(({ clock }) => {
    if (!pulse.current) return;
    const oscillation = reducedMotion
      ? 1
      : 1 + Math.sin(clock.elapsedTime * 1.7 + id.length) * 0.12;
    pulse.current.scale.setScalar(hovered ? oscillation * 1.35 : oscillation);
  });

  useEffect(() => {
    return () => {
      document.body.style.cursor = "";
    };
  }, []);

  function handlePointer(event: ThreeEvent<PointerEvent>, active: boolean) {
    event.stopPropagation();
    if (!group.current) return;
    setHovered(active);
    document.body.style.cursor = active ? "pointer" : "";
    onHover(id, group.current, active);
  }

  function handleClick(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation();
    if (group.current) onActivate(id, group.current);
  }

  return (
    <group ref={group} position={position}>
      <group ref={pulse}>
        <mesh>
          <sphereGeometry args={[0.045, 16, 16]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
        <mesh scale={2.6}>
          <sphereGeometry args={[0.045, 12, 12]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={hovered ? 0.24 : 0.13}
            blending={AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </group>
      <mesh
        onPointerOver={(event) => handlePointer(event, true)}
        onPointerOut={(event) => handlePointer(event, false)}
        onClick={handleClick}
      >
        <sphereGeometry args={[0.16, 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {!lowPower && (
        <NodeLabel
          label={label}
          subtitle={subtitle}
          value={value}
          color={color}
          hovered={hovered}
        />
      )}
    </group>
  );
}

function NodeLabel({
  label,
  subtitle,
  value,
  color,
  hovered,
}: {
  label: string;
  subtitle: string;
  value: string;
  color: string;
  hovered: boolean;
}) {
  return (
    <Html center distanceFactor={6.2} style={{ pointerEvents: "none" }}>
      <div className={`globe-orbit-label ${hovered ? "is-hovered" : ""}`}>
        <span className="globe-orbit-label__status" style={{ backgroundColor: color }} />
        <span>
          <b>{label}</b>
          <small>{subtitle}</small>
        </span>
        <strong>{value}</strong>
      </div>
    </Html>
  );
}

function buildNodeData(data: GlobeHeroData) {
  return GLOBE_ORBIT_NODES.map((node) => {
    const liveNode = data.orbitNodes.find((item) => item.id === node.id);
    return {
      ...node,
      subtitle: liveNode?.subtitle ?? node.subtitle,
      value: liveNode?.value ?? "NO DATA",
      level: liveNode?.level ?? "neutral",
    };
  });
}
