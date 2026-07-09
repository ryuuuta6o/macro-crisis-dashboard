"use client";

import { useMemo } from "react";
import {
  AdditiveBlending,
  BackSide,
  Color,
  FrontSide,
} from "three";
import {
  atmosphereFragmentShader,
  atmosphereVertexShader,
} from "@/components/globe/shaders/holographic-globe-shaders";

export function HolographicAtmosphere({ lowPower }: { lowPower: boolean }) {
  const outerUniforms = useMemo(
    () => ({
      uAtmosphereColor: { value: new Color("#5ca9d6") },
      uIntensity: { value: lowPower ? 0.24 : 0.32 },
    }),
    [lowPower],
  );
  const innerUniforms = useMemo(
    () => ({
      uAtmosphereColor: { value: new Color("#315f83") },
      uIntensity: { value: lowPower ? 0.12 : 0.18 },
    }),
    [lowPower],
  );

  return (
    <group>
      <mesh scale={1.075}>
        <sphereGeometry args={[1.5, lowPower ? 48 : 96, lowPower ? 32 : 64]} />
        <shaderMaterial
          uniforms={outerUniforms}
          side={BackSide}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          vertexShader={atmosphereVertexShader}
          fragmentShader={atmosphereFragmentShader}
          toneMapped={false}
        />
      </mesh>
      <mesh scale={1.018}>
        <sphereGeometry args={[1.5, lowPower ? 48 : 96, lowPower ? 32 : 64]} />
        <shaderMaterial
          uniforms={innerUniforms}
          side={FrontSide}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          vertexShader={atmosphereVertexShader}
          fragmentShader={atmosphereFragmentShader}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
