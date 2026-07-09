"use client";

import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { CatmullRomCurve3, Group, Vector3 } from "three";
import type { RiskLevel } from "@/types/indicator";

const colors = {
  green: "#22c55e",
  yellow: "#facc15",
  orange: "#fb923c",
  red: "#f43f5e",
};

export function ContagionLine({
  from,
  to,
  level,
  delay = 0,
  reducedMotion = false,
}: {
  from: [number, number, number];
  to: [number, number, number];
  level: RiskLevel;
  delay?: number;
  reducedMotion?: boolean;
}) {
  const pulseRef = useRef<Group>(null);
  const curve = useMemo(() => {
    const start = new Vector3(...from);
    const end = new Vector3(...to);
    const middle = start
      .clone()
      .lerp(end, 0.5)
      .multiplyScalar(0.86)
      .add(new Vector3(0, 0, 0.22));
    return new CatmullRomCurve3([start, middle, end]);
  }, [from, to]);
  const points = useMemo(
    () =>
      curve
        .getPoints(22)
        .map((point) => [point.x, point.y, point.z] as [number, number, number]),
    [curve],
  );

  useFrame(({ clock }) => {
    if (!pulseRef.current || reducedMotion) return;
    const progress = ((clock.elapsedTime * 0.15 + delay) % 1 + 1) % 1;
    pulseRef.current.position.copy(curve.getPoint(progress));
  });

  return (
    <>
      <Line
        points={points}
        color={colors[level]}
        lineWidth={level === "red" ? 2.2 : level === "orange" ? 1.7 : 1}
        transparent
        opacity={level === "red" ? 0.72 : level === "orange" ? 0.5 : 0.28}
      />
      {!reducedMotion && (
        <group ref={pulseRef}>
          <mesh>
            <sphereGeometry args={[level === "red" ? 0.055 : 0.038, 10, 10]} />
            <meshBasicMaterial color={colors[level]} />
          </mesh>
          <pointLight color={colors[level]} intensity={1.8} distance={0.8} />
        </group>
      )}
    </>
  );
}
