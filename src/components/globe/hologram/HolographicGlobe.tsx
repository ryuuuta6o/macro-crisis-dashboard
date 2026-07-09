"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import {
  AdditiveBlending,
  Color,
  FrontSide,
  ShaderMaterial,
} from "three";
import { HolographicAtmosphere } from "@/components/globe/hologram/HolographicAtmosphere";
import {
  holographicGlobeFragmentShader,
  holographicGlobeVertexShader,
} from "@/components/globe/shaders/holographic-globe-shaders";

export function HolographicGlobe({
  reducedMotion,
  lowPower,
}: {
  reducedMotion: boolean;
  lowPower: boolean;
}) {
  const material = useRef<ShaderMaterial>(null);
  const [earthMap, cityMap] = useTexture([
    lowPower ? "/textures/earth-day-cloudless-1k.webp" : "/textures/earth-day-cloudless-2k.webp",
    lowPower ? "/textures/earth-city-lights-1k.webp" : "/textures/earth-city-lights-2k.webp",
  ]);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uBaseColor: { value: new Color("#06121f") },
      uGridColor: { value: new Color("#56a4c9") },
      uEarthMap: { value: earthMap },
      uCityMap: { value: cityMap },
    }),
    [cityMap, earthMap],
  );

  useFrame(({ clock }) => {
    if (!material.current || reducedMotion) return;
    material.current.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <group>
      <mesh>
        <sphereGeometry args={[1.485, lowPower ? 48 : 96, lowPower ? 32 : 72]} />
        <meshBasicMaterial color="#02070d" />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.5, lowPower ? 64 : 128, lowPower ? 40 : 96]} />
        <shaderMaterial
          ref={material}
          uniforms={uniforms}
          side={FrontSide}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          vertexShader={holographicGlobeVertexShader}
          fragmentShader={holographicGlobeFragmentShader}
          toneMapped={false}
        />
      </mesh>
      <HolographicAtmosphere lowPower={lowPower} />
    </group>
  );
}
