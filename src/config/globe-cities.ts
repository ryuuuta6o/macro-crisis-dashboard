export type GlobeCity = {
  id: string;
  latitude: number;
  longitude: number;
  tier: 1 | 2;
};

export const GLOBE_CITIES: GlobeCity[] = [
  { id: "new-york", latitude: 40.71, longitude: -74.01, tier: 1 },
  { id: "san-francisco", latitude: 37.77, longitude: -122.42, tier: 1 },
  { id: "london", latitude: 51.51, longitude: -0.13, tier: 1 },
  { id: "frankfurt", latitude: 50.11, longitude: 8.68, tier: 1 },
  { id: "tokyo", latitude: 35.68, longitude: 139.65, tier: 1 },
  { id: "singapore", latitude: 1.35, longitude: 103.82, tier: 1 },
  { id: "hong-kong", latitude: 22.32, longitude: 114.17, tier: 1 },
  { id: "shanghai", latitude: 31.23, longitude: 121.47, tier: 1 },
  { id: "mumbai", latitude: 19.08, longitude: 72.88, tier: 2 },
  { id: "dubai", latitude: 25.2, longitude: 55.27, tier: 2 },
  { id: "johannesburg", latitude: -26.2, longitude: 28.05, tier: 2 },
  { id: "sao-paulo", latitude: -23.55, longitude: -46.63, tier: 2 },
  { id: "toronto", latitude: 43.65, longitude: -79.38, tier: 2 },
  { id: "mexico-city", latitude: 19.43, longitude: -99.13, tier: 2 },
  { id: "sydney", latitude: -33.87, longitude: 151.21, tier: 2 },
  { id: "seoul", latitude: 37.57, longitude: 126.98, tier: 2 },
];

export const GLOBE_CITY_CONNECTIONS: Array<[string, string]> = [
  ["new-york", "london"],
  ["new-york", "san-francisco"],
  ["new-york", "sao-paulo"],
  ["new-york", "toronto"],
  ["london", "frankfurt"],
  ["london", "dubai"],
  ["london", "johannesburg"],
  ["frankfurt", "mumbai"],
  ["dubai", "singapore"],
  ["mumbai", "singapore"],
  ["singapore", "hong-kong"],
  ["singapore", "sydney"],
  ["hong-kong", "shanghai"],
  ["hong-kong", "tokyo"],
  ["tokyo", "seoul"],
  ["tokyo", "san-francisco"],
  ["san-francisco", "sydney"],
  ["mexico-city", "new-york"],
];
