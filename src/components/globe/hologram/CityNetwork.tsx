"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  InstancedMesh,
  MathUtils,
  Object3D,
  ShaderMaterial,
  Vector3,
} from "three";
import {
  cityFragmentShader,
  cityVertexShader,
  networkFragmentShader,
  networkVertexShader,
} from "@/components/globe/shaders/holographic-globe-shaders";
import {
  GLOBE_CITIES,
  GLOBE_CITY_CONNECTIONS,
} from "@/config/globe-cities";

export function CityNetwork({
  reducedMotion,
  lowPower,
}: {
  reducedMotion: boolean;
  lowPower: boolean;
}) {
  const cityMesh = useRef<InstancedMesh>(null);
  const cityMaterial = useRef<ShaderMaterial>(null);
  const networkMaterial = useRef<ShaderMaterial>(null);
  const cities = useMemo(
    () => (lowPower ? GLOBE_CITIES.filter((city) => city.tier === 1) : GLOBE_CITIES),
    [lowPower],
  );
  const cityIds = useMemo(() => new Set(cities.map((city) => city.id)), [cities]);
  const connections = useMemo(
    () =>
      GLOBE_CITY_CONNECTIONS.filter(
        ([from, to]) => cityIds.has(from) && cityIds.has(to),
      ),
    [cityIds],
  );
  const cityUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new Color("#8cc6df") },
    }),
    [],
  );
  const networkUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new Color("#4c91b2") },
      uOpacity: { value: lowPower ? 0.18 : 0.28 },
    }),
    [lowPower],
  );
  const networkGeometry = useMemo(
    () => buildNetworkGeometry(cities, connections, lowPower ? 20 : 36),
    [cities, connections, lowPower],
  );

  useEffect(() => {
    if (!cityMesh.current) return;
    const object = new Object3D();
    cities.forEach((city, index) => {
      const normal = latLonToVector3(city.latitude, city.longitude, 1).normalize();
      object.position.copy(normal.clone().multiplyScalar(1.522));
      object.scale.setScalar(city.tier === 1 ? 1 : 0.72);
      object.updateMatrix();
      cityMesh.current?.setMatrixAt(index, object.matrix);
    });
    cityMesh.current.instanceMatrix.needsUpdate = true;
  }, [cities]);

  useEffect(() => () => networkGeometry.dispose(), [networkGeometry]);

  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const time = clock.elapsedTime;
    if (cityMaterial.current) cityMaterial.current.uniforms.uTime.value = time;
    if (networkMaterial.current) networkMaterial.current.uniforms.uTime.value = time;
  });

  return (
    <group>
      <instancedMesh ref={cityMesh} args={[undefined, undefined, cities.length]}>
        <sphereGeometry args={[lowPower ? 0.018 : 0.02, 8, 8]} />
        <shaderMaterial
          ref={cityMaterial}
          uniforms={cityUniforms}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          vertexShader={cityVertexShader}
          fragmentShader={cityFragmentShader}
          toneMapped={false}
        />
      </instancedMesh>
      <lineSegments geometry={networkGeometry}>
        <shaderMaterial
          ref={networkMaterial}
          uniforms={networkUniforms}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          vertexShader={networkVertexShader}
          fragmentShader={networkFragmentShader}
          toneMapped={false}
        />
      </lineSegments>
    </group>
  );
}

function buildNetworkGeometry(
  cities: typeof GLOBE_CITIES,
  connections: Array<[string, string]>,
  segments: number,
) {
  const cityMap = new Map(cities.map((city) => [city.id, city]));
  const positions: number[] = [];
  const progress: number[] = [];

  connections.forEach(([fromId, toId]) => {
    const from = cityMap.get(fromId);
    const to = cityMap.get(toId);
    if (!from || !to) return;
    const start = latLonToVector3(from.latitude, from.longitude, 1.528);
    const end = latLonToVector3(to.latitude, to.longitude, 1.528);
    const distance = start.distanceTo(end);
    const middle = start
      .clone()
      .add(end)
      .normalize()
      .multiplyScalar(1.56 + Math.min(distance * 0.22, 0.34));
    const points = new CatmullRomCurve3([start, middle, end]).getPoints(segments);

    for (let index = 0; index < points.length - 1; index += 1) {
      const startPoint = points[index];
      const endPoint = points[index + 1];
      positions.push(...startPoint.toArray(), ...endPoint.toArray());
      progress.push(index / segments, (index + 1) / segments);
    }
  });

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute("aProgress", new BufferAttribute(new Float32Array(progress), 1));
  geometry.computeBoundingSphere();
  return geometry;
}

function latLonToVector3(latitude: number, longitude: number, radius: number) {
  const phi = MathUtils.degToRad(90 - latitude);
  const theta = MathUtils.degToRad(longitude + 180);
  return new Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}
