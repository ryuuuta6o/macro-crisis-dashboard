"use client";

import { useEffect, useMemo, useRef } from "react";
import { useReducedMotion } from "motion/react";
import naturalEarth from "@/data/natural-earth-countries-110m.json";
import type { GlobalRiskRegion } from "@/types/global-risk";
import type { RiskLevel } from "@/types/indicator";

type Position = [number, number];
type PolygonCoordinates = Position[][];
type MultiPolygonCoordinates = Position[][][];

type CountryFeature = {
  properties: {
    NAME?: string;
    NAME_JA?: string;
    ISO_A2?: string;
    ISO_A2_EH?: string;
  };
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: PolygonCoordinates | MultiPolygonCoordinates;
  };
};

const countries = naturalEarth.features as unknown as CountryFeature[];

const markerOffsets: Record<string, { x: number; y: number }> = {
  "united-kingdom": { x: -24, y: -18 },
  france: { x: -28, y: 15 },
  germany: { x: 18, y: -20 },
  italy: { x: 25, y: 18 },
  israel: { x: -27, y: -21 },
  egypt: { x: -29, y: 19 },
  "saudi-arabia": { x: 15, y: 25 },
  "united-arab-emirates": { x: 36, y: 9 },
  iran: { x: 35, y: -18 },
  "south-korea": { x: -19, y: -18 },
  taiwan: { x: -19, y: 19 },
  japan: { x: 26, y: -14 },
};

const levelColor: Record<RiskLevel, string> = {
  green: "#34d399",
  yellow: "#fbbf24",
  orange: "#fb923c",
  red: "#fb7185",
};

function project([longitude, latitude]: Position): Position {
  const x = ((longitude + 180) / 360) * 1200;
  const y = ((85 - Math.max(-85, Math.min(85, latitude))) / 170) * 560;
  return [x, y];
}

function ringToPath(ring: Position[]) {
  return ring
    .map((position, index) => {
      const [x, y] = project(position);
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ")
    .concat(" Z");
}

function geometryToPath(feature: CountryFeature) {
  const polygons =
    feature.geometry.type === "Polygon"
      ? [feature.geometry.coordinates as PolygonCoordinates]
      : (feature.geometry.coordinates as MultiPolygonCoordinates);

  return polygons
    .flatMap((polygon) => polygon.map((ring) => ringToPath(ring)))
    .join(" ");
}

function countryCode(feature: CountryFeature) {
  const properties = feature.properties;
  return properties.ISO_A2_EH !== "-99"
    ? properties.ISO_A2_EH
    : properties.ISO_A2 !== "-99"
      ? properties.ISO_A2
      : undefined;
}

const countryShapes = countries.map((feature, index) => ({
  id: `${countryCode(feature) ?? "country"}-${index}`,
  code: countryCode(feature),
  name:
    feature.properties.NAME_JA ??
    feature.properties.NAME ??
    "Country",
  path: geometryToPath(feature),
}));

export function WorldRiskMap3D({
  regions,
  selectedId,
  onSelect,
}: {
  regions: GlobalRiskRegion[];
  selectedId: string;
  onSelect: (region: GlobalRiskRegion) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const regionByCode = useMemo(
    () => new Map(regions.map((region) => [region.code, region])),
    [regions],
  );

  useEffect(() => {
    const root = rootRef.current;
    if (!root || reducedMotion) return;

    const updateTilt = (event: PointerEvent) => {
      const rect = root.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      root.style.setProperty("--map-rotate-y", `${(x * 3.5).toFixed(2)}deg`);
      root.style.setProperty("--map-rotate-x", `${(-y * 2.5).toFixed(2)}deg`);
      root.style.setProperty("--map-light-x", `${((x + 0.5) * 100).toFixed(1)}%`);
      root.style.setProperty("--map-light-y", `${((y + 0.5) * 100).toFixed(1)}%`);
    };
    const resetTilt = () => {
      root.style.setProperty("--map-rotate-y", "0deg");
      root.style.setProperty("--map-rotate-x", "0deg");
      root.style.setProperty("--map-light-x", "50%");
      root.style.setProperty("--map-light-y", "45%");
    };

    root.addEventListener("pointermove", updateTilt);
    root.addEventListener("pointerleave", resetTilt);
    return () => {
      root.removeEventListener("pointermove", updateTilt);
      root.removeEventListener("pointerleave", resetTilt);
    };
  }, [reducedMotion]);

  return (
    <div className="world-map-scroll">
      <div ref={rootRef} className="world-map-3d">
        <div className="world-map-ambient" />
        <div className="world-map-plane">
          <svg
            className="world-map-svg"
            viewBox="0 0 1200 560"
            role="img"
            aria-label="Natural Earthの実国境に基づく国別金融・経済リスク世界地図"
          >
            <defs>
              <linearGradient id="ocean-fill" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#061a32" />
                <stop offset="55%" stopColor="#020b1d" />
                <stop offset="100%" stopColor="#020611" />
              </linearGradient>
              <pattern id="map-grid" width="75" height="70" patternUnits="userSpaceOnUse">
                <path
                  d="M 75 0 L 0 0 0 70"
                  fill="none"
                  stroke="#38bdf8"
                  strokeOpacity="0.055"
                  strokeWidth="1"
                />
              </pattern>
              <filter id="selected-country-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#a5f3fc" floodOpacity="0.95" />
                <feDropShadow dx="0" dy="8" stdDeviation="5" floodColor="#020617" floodOpacity="0.9" />
              </filter>
            </defs>

            <rect width="1200" height="560" fill="url(#ocean-fill)" />
            <rect width="1200" height="560" fill="url(#map-grid)" />

            <g className="world-map-graticule" aria-hidden="true">
              {[100, 200, 300, 400, 500].map((y) => (
                <line key={`lat-${y}`} x1="0" y1={y} x2="1200" y2={y} />
              ))}
              {[200, 400, 600, 800, 1000].map((x) => (
                <line key={`lon-${x}`} x1={x} y1="0" x2={x} y2="560" />
              ))}
            </g>

            <g className="world-map-country-depth" transform="translate(0 7)" aria-hidden="true">
              {countryShapes.map((shape) => (
                <path key={`depth-${shape.id}`} d={shape.path} />
              ))}
            </g>

            <g className="world-map-countries">
              {countryShapes.map((shape) => {
                const region = shape.code
                  ? regionByCode.get(shape.code)
                  : undefined;
                const active = region?.id === selectedId;
                const name = region?.japaneseName ?? shape.name;

                return (
                  <path
                    key={shape.id}
                    d={shape.path}
                    className={`world-map-country ${
                      region ? "is-monitored" : ""
                    } ${active ? "is-selected" : ""}`}
                    data-level={region?.level}
                    role={region ? "button" : undefined}
                    tabIndex={region ? 0 : undefined}
                    aria-hidden={region ? undefined : true}
                    aria-label={region ? `${name}のリスク詳細を表示` : undefined}
                    onClick={region ? () => onSelect(region) : undefined}
                    onKeyDown={
                      region
                        ? (event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              onSelect(region);
                            }
                          }
                        : undefined
                    }
                    filter={active ? "url(#selected-country-glow)" : undefined}
                  >
                    {region && (
                      <title>{`${name}: ${region.level.toUpperCase()}`}</title>
                    )}
                  </path>
                );
              })}
            </g>
          </svg>

          <div className="world-map-scan" />
          <div className="world-map-vignette" />

          {regions.map((region, index) => {
            const offset = markerOffsets[region.id] ?? { x: 0, y: 0 };
            const active = selectedId === region.id;
            const color = levelColor[region.level];
            return (
              <button
                key={region.id}
                type="button"
                aria-label={`${region.japaneseName}を表示`}
                aria-pressed={active}
                onClick={() => onSelect(region)}
                className={`world-map-marker ${active ? "is-active" : ""}`}
                style={{
                  left: `${region.mapX}%`,
                  top: `${region.mapY}%`,
                  marginLeft: offset.x,
                  marginTop: offset.y,
                  color,
                  animationDelay: `${(index % 7) * 0.16}s`,
                }}
              >
                <span className="world-map-marker-ring" />
                <span className="world-map-marker-core">{region.code}</span>
                <span className="world-map-marker-label">
                  {region.japaneseName}
                  {region.gdpRank ? ` · GDP ${region.gdpRank}位` : ""}
                </span>
              </button>
            );
          })}
        </div>

        <div className="world-map-legend" aria-label="地図の危険度">
          {(["green", "yellow", "orange", "red"] as const).map((level) => (
            <span key={level}>
              <i style={{ backgroundColor: levelColor[level] }} />
              {level === "green"
                ? "安定"
                : level === "yellow"
                  ? "注意"
                  : level === "orange"
                    ? "警戒"
                    : "危険"}
            </span>
          ))}
        </div>

        <div className="world-map-caption">
          <span>NATURAL EARTH 1:110M / REAL BOUNDARIES</span>
          <span>{regions.length} COUNTRIES / CLICK TO INSPECT</span>
        </div>
      </div>
    </div>
  );
}
